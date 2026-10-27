import { File, Directory, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { createVideoPlayer } from 'expo-video';
import { randomUUID } from 'expo-crypto';
import { fetch as expoFetch } from 'expo/fetch';
import { boundedText } from '../../../src/ai/research.ts';
export interface Attachment {
  id: string; kind: 'image' | 'video' | 'document' | 'file'; name: string; uri: string; mime: string; size: number;
  textUri?: string; preview?: string; frames?: string[]; duration?: number; note?: string;
}
export interface GalleryImage { url: string; source: string; title: string; credit: string; license: string; }
export interface RichMessage { attachments?: Attachment[]; sources?: import('../../../src/ai/research.ts').Source[]; images?: GalleryImage[]; research?: string; analysis?: string; weather?: Record<string, unknown>; durationMs?: number; }
export function dataDirectory() { const dir = new Directory(Paths.document, 'ckai-files'); dir.create({ intermediates: true, idempotent: true }); return dir; }
export function keepFile(uri: string, name: string) { const file = new File(dataDirectory(), `${randomUUID()}-${name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-100)}`); new File(uri).copy(file); return file; }
async function picture(source: Parameters<typeof ImageManipulator.manipulate>[0]) {
  const context = ImageManipulator.manipulate(source); context.resize({ width: 1280 });
  const image = await context.renderAsync();
  try { const result = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.78 }); return keepFile(result.uri, 'image.jpg').uri; }
  finally { image.release(); context.release(); }
}
export async function importAttachment(asset: { uri: string; name: string; mime?: string; size?: number; duration?: number }, reader: (type: string, data: string) => Promise<{ text: string; truncated: boolean }>): Promise<Attachment> {
  const original = new File(asset.uri); const size = Math.max(asset.size ?? 0, original.size);
  const ext = asset.name.split('.').at(-1)?.toLowerCase() ?? ''; const mime = asset.mime ?? '';
  const kind = mime.startsWith('image/') || ['jpg','jpeg','png','webp','heic','avif'].includes(ext) ? 'image' : mime.startsWith('video/') || ['mp4','mov','webm','m4v'].includes(ext) ? 'video' : 'document';
  if (size > (kind === 'video' ? 80 : kind === 'image' ? 25 : 12) * 1024 * 1024) throw new Error(`${asset.name} dépasse la limite de ${kind === 'video' ? 80 : kind === 'image' ? 25 : 12} Mo.`);
  if (kind === 'image') { const uri = await picture(asset.uri); return { id: randomUUID(), kind, name: asset.name, uri, mime: 'image/jpeg', size: new File(uri).size, preview: uri }; }
  if (kind === 'video') {
    const file = keepFile(asset.uri, asset.name); const player = createVideoPlayer(null); const frames: string[] = [];
    try {
      await player.replaceAsync(file.uri);
      if (player.status !== 'readyToPlay') await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => { subscription.remove(); reject(new Error('La vidéo ne peut pas être décodée.')); }, 20000);
        const subscription = player.addListener('statusChange', event => { if (event.status === 'readyToPlay') { clearTimeout(timer); subscription.remove(); resolve(); } else if (event.status === 'error') { clearTimeout(timer); subscription.remove(); reject(new Error('Format vidéo non pris en charge.')); } });
      });
      const duration = player.duration || (asset.duration ?? 0) / 1000;
      const times = duration > 1 ? [Math.min(0.2, duration / 10), duration * 0.5, Math.max(0, duration - 0.3)] : [0];
      const thumbnails = await player.generateThumbnailsAsync(times, { maxWidth: 1280, maxHeight: 1280 });
      for (const thumb of thumbnails) frames.push(await picture(thumb));
      if (!frames.length) throw new Error('Aucune image n’a pu être extraite de cette vidéo.');
      return { id: randomUUID(), kind, name: asset.name, uri: file.uri, mime: mime || 'video/mp4', size, preview: frames[0]!, frames, duration,
        note: `${frames.length} images échantillonnées sur ${Math.round(duration)} s. Analyse visuelle partielle, sans piste audio.` };
    } catch (error) { file.delete(); throw error; } finally { player.release(); }
  }
  let text = ''; let truncated = false;
  if (['pdf','docx','xlsx','xls','ods'].includes(ext)) { const result = await reader(ext, await original.base64()); text = result.text; truncated = result.truncated; }
  else if (/^(txt|md|csv|json|jsonl|html|htm|xml|yaml|yml|ts|tsx|js|jsx|py|java|c|cpp|h|css|sql|sh|log|srt|vtt|rtf)$/.test(ext) || mime.startsWith('text/')) {
    text = await original.text(); if (text.includes('\u0000')) throw new Error('Ce fichier semble binaire. Choisis un document texte.'); truncated = text.length > 200000; text = text.slice(0, 200000);
  } else throw new Error('Format pris en charge : PDF texte, DOCX, XLSX/XLS/ODS, CSV, texte et code, images et vidéos.');
  if (!text.trim()) throw new Error('Le document ne contient pas de texte lisible.');
  const file = keepFile(asset.uri, asset.name); const extracted = new File(dataDirectory(), `${randomUUID()}.txt`); extracted.write(text);
  return { id: randomUUID(), kind, name: asset.name, uri: file.uri, mime: mime || 'application/octet-stream', size, textUri: extracted.uri,
    ...(truncated ? { note: 'Extraction limitée aux 200 000 premiers caractères ou aux 300 premières pages.' } : {}) };
}
export async function analyzeVisual(attachment: Attachment, question: string, key: string, model: string, signal: AbortSignal): Promise<string> {
  const uris = attachment.kind === 'video' ? attachment.frames ?? [] : [attachment.uri];
  const images = await Promise.all(uris.slice(0, 3).map(async uri => ({ type: 'image_url', image_url: { url: `data:image/jpeg;base64,${await new File(uri).base64()}` } })));
  const response = await expoFetch('https://api.groq.com/openai/v1/chat/completions', { method: 'POST', signal, redirect: 'error', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` }, body: JSON.stringify({ model, stream: false, max_completion_tokens: 3000, messages: [{ role: 'user', content: [{ type: 'text', text: `Réponds en français à cette demande en décrivant précisément les éléments visibles. Extrais le texte lisible. Ne déduis pas d’éléments invisibles. ${attachment.note ?? ''}\nQuestion : ${question.slice(0, 4000)}` }, ...images] }] }) });
  const data = JSON.parse(await boundedText(response)) as { choices?: { message?: { content?: string } }[] };
  const text = data.choices?.[0]?.message?.content; if (!text) throw new Error('Le modèle visuel n’a pas renvoyé d’analyse. Vérifie le modèle Vision dans les réglages.');
  return `[${attachment.name}]\n${attachment.note ?? 'Image analysée.'}\n${text.slice(0, 6000)}`;
}
