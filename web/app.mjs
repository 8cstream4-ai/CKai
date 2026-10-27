import { createChatTransport, providers } from '../src/ai/index.ts';

const $ = id => document.getElementById(id);
let key = globalThis.__CKAI_KEY__ ?? '';
delete globalThis.__CKAI_KEY__;
const isFile = location.protocol === 'file:';
const stored = name => { try { return localStorage.getItem(name); } catch { return null; } };
const store = (name, value) => { try { localStorage.setItem(name, value); return true; } catch { return false; } };
let conversations;
try {
  const parsed = JSON.parse(stored('ckai.chats.v1') ?? '[]');
  conversations = Array.isArray(parsed) ? parsed.filter(c => typeof c?.id === 'string' && typeof c?.title === 'string'
    && Array.isArray(c?.messages) && c.messages.every(m => ['user', 'assistant'].includes(m?.role)
      && typeof m.content === 'string')).slice(0, 60) : [];
} catch { conversations = []; }
let current = null;
let active = null;
let followBottom = true;
let toastTimeout;
const icon = name => {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  use.setAttribute('href', `#i-${name}`); svg.append(use); return svg;
};
function toast(message) {
  $('toast').textContent = message; $('toast').hidden = false;
  clearTimeout(toastTimeout); toastTimeout = setTimeout(() => { $('toast').hidden = true; }, 3200);
}
function persist() {
  if (!store('ckai.chats.v1', JSON.stringify(conversations.slice(0, 60)))) toast('Le navigateur ne permet pas de sauvegarder cet historique.');
}
function fresh() {
  if (active) return toast('Arrêtez la réponse avant de changer de conversation.');
  current = null; $('messages').replaceChildren(); $('messages').classList.add('hidden');
  $('welcome').classList.remove('hidden'); $('chat-title').textContent = 'Nouvelle conversation';
  $('prompt').value = ''; resize(); updateSend(); renderHistory(); closeMenu();
}
function closeMenu() { $('sidebar').classList.remove('open'); $('backdrop').classList.remove('open'); }
function renderHistory() {
  $('history').replaceChildren();
  if (!conversations.length) {
    const p = document.createElement('p'); p.className = 'history-empty';
    p.textContent = 'Les belles conversations commencent par une première question.'; $('history').append(p);
  }
  for (const chat of conversations) {
    const button = document.createElement('button'); button.className = `history-item${current?.id === chat.id ? ' active' : ''}`;
    button.textContent = chat.title; button.title = chat.title;
    button.onclick = () => {
      if (active) return toast('Arrêtez la réponse avant de changer de conversation.');
      current = chat; showConversation(); closeMenu(); renderHistory();
    };
    $('history').append(button);
  }
}
// Safe Markdown subset: all content is rendered through text nodes, never innerHTML.
function inline(text, parent) {
  const regex = /(`[^`\n]+`|\*\*[^*\n]+\*\*|\[[^\]\n]+\]\(https?:\/\/[^\s)]+\))/g;
  let last = 0;
  for (const match of text.matchAll(regex)) {
    parent.append(document.createTextNode(text.slice(last, match.index)));
    const token = match[0]; let element;
    if (token.startsWith('`')) { element = document.createElement('code'); element.textContent = token.slice(1, -1); }
    else if (token.startsWith('**')) { element = document.createElement('strong'); element.textContent = token.slice(2, -2); }
    else {
      const link = /^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/.exec(token);
      element = document.createElement('a'); element.textContent = link[1]; element.href = link[2];
      element.target = '_blank'; element.rel = 'noopener noreferrer';
    }
    parent.append(element); last = match.index + token.length;
  }
  parent.append(document.createTextNode(text.slice(last)));
}
function markdown(text, container) {
  const fragment = document.createDocumentFragment();
  function normalText(normal) {
    for (const paragraph of normal.split(/\n\s*\n/)) {
      if (!paragraph.trim()) continue;
      const heading = /^(#{1,3})\s+(.+)$/.exec(paragraph.trim());
      const lines = paragraph.trim().split('\n');
      if (heading) { const h = document.createElement(`h${heading[1].length + 1}`); inline(heading[2], h); fragment.append(h); }
      else if (lines.every(line => /^\s*[-*]\s/.test(line))) {
        const list = document.createElement('ul');
        for (const line of lines) { const li = document.createElement('li'); inline(line.replace(/^\s*[-*]\s+/, ''), li); list.append(li); }
        fragment.append(list);
      } else { const p = document.createElement('p'); inline(paragraph.trim(), p); fragment.append(p); }
    }
  }
  const codePattern = /^```([^\n`]*)\n([\s\S]*?)(?:\n```(?=\n|$)|$)/gm;
  let cursor = 0;
  for (const match of text.matchAll(codePattern)) {
      normalText(text.slice(cursor, match.index));
      const language = match[1].trim(); const raw = match[2];
      const card = document.createElement('div'); card.className = 'code-card';
      const head = document.createElement('div'); head.className = 'code-head';
      const label = document.createElement('span'); label.textContent = language || 'code';
      const copy = document.createElement('button'); copy.textContent = 'Copier'; copy.onclick = () => copyText(raw);
      head.append(label, copy); const pre = document.createElement('pre'); const code = document.createElement('code'); code.textContent = raw;
      pre.append(code); card.append(head, pre); fragment.append(card);
      cursor = match.index + match[0].length;
  }
  normalText(text.slice(cursor));
  container.replaceChildren(fragment);
}
async function copyText(value) {
  try {
    if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(value);
    else {
      const area = document.createElement('textarea'); area.value = value; area.style.position = 'fixed'; area.style.opacity = '0';
      document.body.append(area); area.select(); const ok = document.execCommand('copy'); area.remove(); if (!ok) throw new Error();
    }
    toast('Copié.');
  } catch { toast('La copie est indisponible dans ce navigateur.'); }
}
function assistantNode(message, messageIndex) {
  const turn = document.createElement('article'); turn.className = 'turn';
  const header = document.createElement('div'); header.className = 'assistant-header';
  const img = document.createElement('img'); img.src = document.querySelector('.hero-icon').src; img.alt = '';
  header.append(img, document.createTextNode('CKai')); const answer = document.createElement('div'); answer.className = 'answer';
  markdown(message.content, answer); turn.append(header, answer);
  const status = document.createElement('div'); status.className = 'status'; status.hidden = true; turn.append(status);
  const actions = document.createElement('div'); actions.className = 'message-actions';
  for (const [name, label, action] of [
    ['copy', 'Copier la réponse', () => copyText(message.content)],
    ['refresh', 'Régénérer la réponse', () => regenerate(messageIndex)],
    ['download', 'Exporter la conversation', exportConversation],
  ]) {
    const button = document.createElement('button'); button.className = 'icon-button'; button.title = label;
    button.setAttribute('aria-label', label); button.append(icon(name)); button.onclick = action; actions.append(button);
  }
  if (message.content) turn.append(actions);
  $('messages').append(turn); return { turn, answer, status, actions };
}
function showConversation() {
  $('messages').replaceChildren(); $('welcome').classList.add('hidden'); $('messages').classList.remove('hidden');
  $('chat-title').textContent = current.title;
  current.messages.forEach((message, index) => {
    if (message.role === 'user') {
      const row = document.createElement('div'); row.className = 'user-row'; const bubble = document.createElement('div');
      bubble.className = 'user-bubble'; bubble.textContent = message.content; row.append(bubble); $('messages').append(row);
    } else assistantNode(message, index);
  });
  followBottom = true; scrollDown();
}
function scrollDown() { if (followBottom) $('scroll').scrollTop = $('scroll').scrollHeight; }
function resize() { $('prompt').style.height = 'auto'; $('prompt').style.height = `${Math.min(160, $('prompt').scrollHeight)}px`; }
function updateSend() {
  $('send').disabled = !active && !$('prompt').value.trim();
  $('send').classList.toggle('stop', !!active); $('send').setAttribute('aria-label', active ? 'Arrêter la réponse' : 'Envoyer');
  $('send').replaceChildren(icon(active ? 'stop' : 'arrow')); $('composer').classList.toggle('generating', !!active);
  $('level').disabled = !!active; $('effort').disabled = !!active;
}
const transport = createChatTransport({
  secrets: { async get() { return key || (!isFile ? 'server-managed' : null); }, async set(_provider, value) { key = value; }, async remove() { key = ''; } },
  fetch: async (url, options) => {
    if (isFile || key) return fetch(url, options);
    return fetch(`/api/groq/${String(url).endsWith('/models') ? 'models' : 'chat/completions'}`, {
      ...options, headers: { 'Content-Type': 'application/json' },
    });
  },
});
async function send() {
  if (active) { active.abort(); return; }
  const input = $('prompt').value.trim(); if (!input) return;
  if (isFile && !key) { $('settings-dialog').showModal(); return; }
  if (!current) {
    current = { id: globalThis.crypto?.randomUUID?.() ?? String(Date.now()), title: input.slice(0, 48), messages: [] };
    conversations.unshift(current);
  }
  current.messages.push({ role: 'user', content: input });
  $('prompt').value = ''; store('ckai.draft', ''); resize(); showConversation(); renderHistory(); persist();
  await generate();
}
async function generate() {
  const chat = current;
  const message = { role: 'assistant', content: '' };
  const history = chat.messages.map(m => ({ role: m.role, content: m.content }));
  chat.messages.push(message);
  const node = assistantNode(message, chat.messages.length - 1);
  active = new AbortController(); const signal = active.signal; updateSend();
  let redrawTimer; let saveTimer;
  const draw = () => { clearTimeout(redrawTimer); redrawTimer = null; markdown(message.content, node.answer); scrollDown(); };
  const status = text => {
    node.status.hidden = false; node.status.replaceChildren();
    const dot = document.createElement('span'); dot.className = 'status-dot'; node.status.append(dot, document.createTextNode(text)); scrollDown();
  };
  status('Connexion à Groq…');
  const started = Date.now();
  try {
    for await (const event of transport.stream({ provider: providers.groq, messages: history,
      level: $('level').value, effort: $('effort').value, signal, maxTokens: 2048 })) {
      if (event.type === 'status') status(event.stage === 'connecting' ? 'Connexion à Groq…' : 'Réponse en cours…');
      if (event.type === 'retry') status(`Groq est occupé. Nouvelle tentative ${event.attempt}/2…`);
      if (event.type === 'text') {
        message.content += event.delta;
        if (!redrawTimer) redrawTimer = setTimeout(draw, 40);
        if (!saveTimer) saveTimer = setTimeout(() => { persist(); saveTimer = null; }, 750);
      }
      if (event.type === 'error') {
        draw(); const alert = document.createElement('div'); alert.className = 'alert'; alert.setAttribute('role', 'alert'); alert.textContent = event.message;
        const retry = document.createElement('button'); retry.textContent = 'Réessayer'; retry.onclick = () => regenerate(chat.messages.length - 1);
        alert.append(retry); node.turn.append(alert);
      }
      if (event.type === 'done' && event.reason === 'length') toast('Limite de réponse atteinte. Vous pouvez demander de continuer.');
      if (event.type === 'done' && event.reason === 'cancelled') toast('Réponse arrêtée. Le texte reçu est conservé.');
    }
  } catch { toast('Une erreur est survenue. Vous pouvez réessayer.'); }
  finally {
    clearTimeout(redrawTimer); clearTimeout(saveTimer); draw();
    node.status.hidden = true; if (message.content) node.turn.append(node.actions);
    node.turn.title = `Durée de la requête : ${Math.round((Date.now() - started) / 1000)} s`;
    active = null; updateSend(); persist();
  }
}
async function regenerate(index) {
  if (active) return toast('Arrêtez d’abord la réponse en cours.');
  if (!current || current.messages[index]?.role !== 'assistant') return;
  current.messages = current.messages.slice(0, index); showConversation(); await generate();
}
function exportConversation() {
  if (!current) return;
  const text = `# ${current.title}\n\n` + current.messages.map(m => `## ${m.role === 'user' ? 'Vous' : 'CKai'}\n\n${m.content}`).join('\n\n');
  const url = URL.createObjectURL(new Blob([text], { type: 'text/markdown;charset=utf-8' }));
  const a = document.createElement('a'); a.href = url; a.download = 'conversation-ckai.md'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
$('composer').onsubmit = event => { event.preventDefault(); void send(); };
$('prompt').oninput = () => { resize(); updateSend(); store('ckai.draft', $('prompt').value); };
$('prompt').onkeydown = event => {
  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing && matchMedia('(pointer:fine)').matches) { event.preventDefault(); void send(); }
};
document.querySelectorAll('[data-prompt]').forEach(button => { button.onclick = () => {
  $('prompt').value = button.dataset.prompt; resize(); updateSend(); $('prompt').focus();
}; });
$('new-chat').onclick = fresh; $('new-top').onclick = fresh;
$('menu').onclick = () => { $('sidebar').classList.toggle('open'); $('backdrop').classList.toggle('open'); };
$('backdrop').onclick = closeMenu;
$('theme').onclick = () => { const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'; document.documentElement.dataset.theme = next; store('ckai.theme', next); };
$('settings').onclick = () => { closeMenu(); $('settings-dialog').showModal(); };
$('key-form').onsubmit = event => {
  event.preventDefault(); if ($('api-key').value.trim()) { key = $('api-key').value.trim(); $('api-key').value = ''; toast('Clé appliquée pour cette session.'); }
  $('settings-dialog').close();
};
$('clear-history').onclick = () => {
  if (active) return toast('Arrêtez la réponse avant de supprimer l’historique.');
  if (!confirm('Supprimer toutes les conversations de ce navigateur ?')) return;
  conversations = []; persist(); fresh(); $('settings-dialog').close(); toast('Historique effacé.');
};
$('scroll').onscroll = () => { followBottom = $('scroll').scrollHeight - $('scroll').scrollTop - $('scroll').clientHeight < 100; $('jump-bottom').hidden = followBottom || !current; };
$('jump-bottom').onclick = () => { followBottom = true; scrollDown(); };
$('connection-note').textContent = isFile ? 'Connexion directe à Groq' : 'Clé intégrée côté serveur';
if (!isFile) $('key-note').textContent = 'La clé Groq est intégrée côté serveur. Vous n’avez rien à saisir. Une clé de remplacement peut être utilisée uniquement pour cette session.';
const theme = stored('ckai.theme'); if (['light', 'dark'].includes(theme)) document.documentElement.dataset.theme = theme;
const hour = new Date().getHours(); const greeting = hour < 5 || hour >= 18 ? 'Bonsoir.' : 'Bonjour.';
$('greeting').firstChild.textContent = greeting;
$('prompt').value = stored('ckai.draft') ?? ''; renderHistory(); resize(); updateSend();
