import type { Json } from './types.ts';
import { boundedText, publicURL } from './research.ts';

export interface MediaImage { url: string; source: string; title: string; credit: string; license: string; width?: number; height?: number; }
export interface MediaVideo extends MediaImage { mime: string; poster?: string; duration?: number; }
type Fetcher = typeof globalThis.fetch;
type RecordValue = Record<string, unknown>;
const object = (value: unknown): RecordValue => value && typeof value === 'object' && !Array.isArray(value) ? value as RecordValue : {};
const text = (value: unknown, maximum = 240): string => typeof value === 'string' ? value.replace(/<[^>]*>/g, '').replace(/&(?:nbsp|#160);/g, ' ').replace(/&amp;/g, '&').trim().slice(0, maximum) : '';
const number = (value: unknown): number | undefined => typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : undefined;
const metadata = (info: RecordValue, key: string): string => text(object(object(info.extmetadata)[key]).value);
function pages(data: unknown): RecordValue[] {
  const value = object(object(data).query).pages;
  return Array.isArray(value) ? value.map(object) : Object.values(object(value)).map(object);
}
function mediaURL(value: unknown): string | null {
  const url = typeof value === 'string' ? publicURL(value.startsWith('//') ? 'https:' + value : value) : null;
  return url && new URL(url).hostname.endsWith('.wikimedia.org') ? url : null;
}
export function mediaRequest(textValue: string, hasAttachments = false): 'image' | 'video' | null {
  const value = textValue.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase();
  if (/\b(?:sans|pas d[eu']?)\s*(?:images?|photos?|videos?)/.test(value)) return null;
  if (/\b(?:genere|dessine|cree)\b/.test(value)) return null;
  if (hasAttachments && /\b(?:analyse|decris|explique|resume|traduis|compare|regarde)\b/.test(value)) return null;
  const noun = /\b(?:images?|photos?|illustrations?|visuels?|videos?|clips?)\b/.exec(value);
  if (!noun || !(/\b(?:montre|donne|envoie|affiche|cherche|trouve|veux|voudrais)\b/.test(value) || noun.index < 8)) return null;
  return /^(?:videos?|clips?)$/.test(noun[0]) ? 'video' : 'image';
}
export function commonsImages(data: unknown): MediaImage[] {
  return pages(data).flatMap(page => {
    const info = object(Array.isArray(page.imageinfo) ? page.imageinfo[0] : null);
    if (typeof info.mime === 'string' && !info.mime.startsWith('image/')) return [];
    const url = mediaURL(info.thumburl) ?? mediaURL(info.url);
    const source = typeof info.descriptionurl === 'string' ? publicURL(info.descriptionurl) : null;
    if (!url || !source) return [];
    return [{ url, source, title: text(page.title).replace(/^File:/, ''), credit: metadata(info, 'Artist') || 'Wikimedia Commons',
      license: metadata(info, 'LicenseShortName') || 'Consulter la licence sur la page source',
      ...(number(info.thumbwidth ?? info.width) ? { width: number(info.thumbwidth ?? info.width)! } : {}),
      ...(number(info.thumbheight ?? info.height) ? { height: number(info.thumbheight ?? info.height)! } : {}) }];
  }).slice(0, 6);
}
export function wikipediaImages(data: unknown): MediaImage[] {
  return pages(data).flatMap(page => {
    const thumb = object(page.thumbnail); const original = object(page.original);
    const url = mediaURL(thumb.source) ?? mediaURL(original.source);
    const source = typeof page.fullurl === 'string' ? publicURL(page.fullurl) : null;
    if (!url || !source) return [];
    return [{ url, source, title: text(page.title), credit: new URL(source).hostname,
      license: 'Droits et attribution sur la page source',
      ...(number(thumb.width) ? { width: number(thumb.width)! } : {}), ...(number(thumb.height) ? { height: number(thumb.height)! } : {}) }];
  }).slice(0, 4);
}
export function commonsVideos(data: unknown): MediaVideo[] {
  return pages(data).flatMap(page => {
    const info = object(Array.isArray(page.videoinfo) ? page.videoinfo[0] : null);
    const variants = (Array.isArray(info.derivatives) ? info.derivatives.map(object) : [])
      .filter(item => /video\/(?:webm|mp4)/i.test(String(item.type)) && mediaURL(item.src))
      .sort((a, b) => Math.abs((number(a.height) ?? 480) - 480) - Math.abs((number(b.height) ?? 480) - 480));
    const chosen = variants[0];
    const url = mediaURL(chosen?.src) ?? (/^video\/(?:webm|mp4)/i.test(String(info.mime)) ? mediaURL(info.url) : null);
    const source = typeof info.descriptionurl === 'string' ? publicURL(info.descriptionurl) : null;
    if (!url || !source) return [];
    const poster = mediaURL(info.thumburl);
    return [{ url, source, title: text(page.title).replace(/^File:/, ''), credit: metadata(info, 'Artist') || 'Wikimedia Commons',
      license: metadata(info, 'LicenseShortName') || 'Consulter la licence sur la page source',
      mime: text(chosen?.type ?? info.mime, 100).split(';')[0]!, ...(poster ? { poster } : {}),
      ...(number(info.duration) ? { duration: number(info.duration)! } : {}) }];
  }).slice(0, 4);
}
async function queryAPI(url: URL, fetcher: Fetcher, signal: AbortSignal): Promise<unknown> {
  signal.throwIfAborted();
  const response = await fetcher(url.toString(), { signal, headers: { Accept: 'application/json', 'User-Agent': 'CKai/0.5 (https://github.com/8cstream4-ai/CKai)', 'Api-User-Agent': 'CKai/0.5 (https://github.com/8cstream4-ai/CKai)' } });
  const data: unknown = JSON.parse(await boundedText(response));
  if (object(data).error) throw new Error('La recherche de médias est momentanément indisponible.');
  return data;
}
export async function searchMediaImages(query: string, fetcher: Fetcher, signal: AbortSignal): Promise<MediaImage[]> {
  const commons = new URL('https://commons.wikimedia.org/w/api.php');
  commons.search = new URLSearchParams({ action: 'query', format: 'json', generator: 'search', gsrsearch: query.slice(0, 200), gsrnamespace: '6',
    gsrlimit: '6', prop: 'imageinfo', iiprop: 'url|extmetadata|mime|size', iiurlwidth: '900' }).toString();
  const requests: { url: URL; parse(data: unknown): MediaImage[] }[] = [{ url: commons, parse: commonsImages }];
  for (const language of ['en', 'fr']) {
    const wiki = new URL('https://' + language + '.wikipedia.org/w/api.php');
    wiki.search = new URLSearchParams({ action: 'query', format: 'json', generator: 'search', gsrsearch: query.slice(0, 200), gsrnamespace: '0',
      gsrlimit: '3', prop: 'pageimages|info', piprop: 'thumbnail', pithumbsize: '900', pilicense: 'any', inprop: 'url', redirects: '1' }).toString();
    requests.push({ url: wiki, parse: wikipediaImages });
  }
  let successfulRequests = 0;
  const results = await Promise.all(requests.map(async request => {
    try { const data = await queryAPI(request.url, fetcher, signal); successfulRequests++; return request.parse(data); }
    catch { signal.throwIfAborted(); return []; }
  }));
  signal.throwIfAborted();
  if (!successfulRequests) throw new Error('La recherche de médias est momentanément indisponible.');
  const normalize = (value: string) => value.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  const terms = normalize(query).split(' ').filter(term => term.length > 1 && !['image','images','photo','photos','de','des','du','le','la','les'].includes(term));
  const rank = (image: MediaImage) => {
    const title = normalize(image.title);
    if (title === normalize(query)) return 100;
    const words = new Set(title.split(' '));
    return terms.length ? 80 * terms.filter(term => words.has(term)).length / terms.length : 0;
  };
  const wiki = results.slice(1).flat().filter(image => rank(image) >= 30).sort((a, b) => rank(b) - rank(a));
  // A matching encyclopedia illustration comes first; Commons adds alternative photographs.
  const candidates = [...wiki.slice(0, 1), ...(results[0] ?? []), ...wiki.slice(1)];
  return candidates.filter((image, index, all) => all.findIndex(other => other.url === image.url) === index).slice(0, 6);
}
export async function searchMediaVideos(query: string, fetcher: Fetcher, signal: AbortSignal): Promise<MediaVideo[]> {
  const url = new URL('https://commons.wikimedia.org/w/api.php');
  url.search = new URLSearchParams({ action: 'query', format: 'json', generator: 'search', gsrsearch: query.slice(0, 180) + ' filetype:video',
    gsrnamespace: '6', gsrlimit: '6', prop: 'videoinfo', viprop: 'url|derivatives|extmetadata|mime|size', viurlwidth: '640' }).toString();
  return commonsVideos(await queryAPI(url, fetcher, signal));
}
export const mediaResult = (items: MediaImage[]): Json => ({ count: items.length, items: items as unknown as Json,
  displayedInChat: items.length > 0, note: items.length ? 'Ces médias sont affichés dans le chat. Réponds brièvement sans tableau ni liste de liens ; ne prétends pas que tous sont libres de droits.' : 'Aucun média affichable trouvé. Dis-le clairement sans inventer de média.' });
