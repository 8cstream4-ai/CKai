import test from 'node:test';
import assert from 'node:assert/strict';
import { createChatTransport, providers, selectModel, createBasicTools, createSecretStore } from '../src/ai/index.ts';
import { readSSE } from '../src/ai/sse.ts';
import type { ChatEvent, ChatRequest, SecretStore } from '../src/ai/types.ts';

const secrets: SecretStore = {
  async get() { return 'test-only-token'; }, async set() {}, async remove() {},
};
const base: ChatRequest = {
  provider: providers.groq, level: 'fort', messages: [{ role: 'user', content: 'Bonjour' }],
};
const frame = (value: unknown) => `data: ${JSON.stringify(value)}\n\n`;
const content = (text: string) => frame({ choices: [{ delta: { content: text } }] });
const end = (reason = 'stop') => frame({ choices: [{ delta: {}, finish_reason: reason }] }) + 'data: [DONE]\n\n';
const response = (body: string) => new Response(body, { headers: { 'Content-Type': 'text/event-stream' } });
const collect = async (stream: AsyncGenerator<ChatEvent>) => Array.fromAsync(stream);

test('streaming : texte et fin sans modifier les messages initiaux', async () => {
  let sent: Record<string, unknown> = {};
  const transport = createChatTransport({ secrets, fetch: async (_url, init) => {
    sent = JSON.parse(String(init?.body));
    return response(content('Bon') + content('jour 🌅') + end());
  } });
  const events = await collect(transport.stream(base));
  assert.deepEqual(events.filter(e => e.type === 'text').map(e => e.delta), ['Bon', 'jour 🌅']);
  assert.deepEqual(events.at(-1), { type: 'done', reason: 'stop', text: 'Bonjour 🌅' });
  assert.equal(sent.model, 'openai/gpt-oss-120b');
  assert.equal(sent.reasoning_effort, 'medium');
  assert.equal(base.messages.length, 1);
});

test('SSE : octets UTF-8 fragmentés, CRLF et données multilignes', async () => {
  const bytes = new TextEncoder().encode(': ping\r\n\r\ndata: bonjour 🌅\r\ndata: suite\r\n\r\n');
  const stream = new ReadableStream<Uint8Array>({ start(controller) {
    for (const byte of bytes) controller.enqueue(Uint8Array.of(byte));
    controller.close();
  } });
  assert.deepEqual(await Array.fromAsync(readSSE(stream, new AbortController().signal)), ['bonjour 🌅\nsuite']);
});

test('clé invalide : aucune nouvelle tentative, aucune fuite du corps serveur', async () => {
  let count = 0;
  const transport = createChatTransport({ secrets, fetch: async () => {
    count++; return new Response('private upstream token', { status: 401 });
  } });
  const events = await collect(transport.stream(base));
  assert.equal(count, 1);
  assert.equal(events.at(-1)?.type, 'error');
  assert.ok(!JSON.stringify(events).includes('private upstream token'));
});

test('clé manquante : aucune requête', async () => {
  let count = 0;
  const transport = createChatTransport({ secrets: { ...secrets, async get() { return null; } }, fetch: async () => {
    count++; return response(end());
  } });
  const events = await collect(transport.stream(base));
  assert.equal(count, 0);
  assert.equal(events.at(-1)?.type, 'error');
});

test('429 : deux retries bornés puis proposition du niveau inférieur', async () => {
  let count = 0;
  const transport = createChatTransport({ secrets, retryBaseMs: 0, fetch: async () => {
    count++; return new Response('', { status: 429 });
  } });
  const events = await collect(transport.stream(base));
  assert.equal(count, 3);
  assert.equal(events.filter(e => e.type === 'retry').length, 2);
  assert.equal(events.at(-1)?.type, 'error');
  assert.equal(events.at(-1)?.suggestLowerLevel, true);
});

test('Retry-After long : rend immédiatement la main', async () => {
  let count = 0;
  const transport = createChatTransport({ secrets, fetch: async () => {
    count++; return new Response('', { status: 429, headers: { 'Retry-After': '600' } });
  } });
  const events = await collect(transport.stream(base));
  assert.equal(count, 1);
  assert.equal(events.at(-1)?.code, 'rate-limit');
});

test('stop pendant le flux : texte reçu conservé', async () => {
  const controller = new AbortController();
  const transport = createChatTransport({ secrets, fetch: async () => response(content('Début') + content('fin') + end()) });
  const events: ChatEvent[] = [];
  for await (const event of transport.stream({ ...base, signal: controller.signal })) {
    events.push(event);
    if (event.type === 'text') controller.abort();
  }
  assert.deepEqual(events.at(-1), { type: 'done', reason: 'cancelled', text: 'Début' });
});

test('stop avant le flux : aucune requête', async () => {
  const controller = new AbortController(); controller.abort();
  let count = 0;
  const transport = createChatTransport({ secrets, fetch: async () => { count++; return response(end()); } });
  const events = await collect(transport.stream({ ...base, signal: controller.signal }));
  assert.equal(count, 0);
  assert.equal(events.at(-1)?.reason, 'cancelled');
});

test('connexion interrompue après du texte : pas de retry qui dupliquerait la réponse', async () => {
  let count = 0;
  const transport = createChatTransport({ secrets, fetch: async () => { count++; return response(content('Partiel')); } });
  const events = await collect(transport.stream(base));
  assert.equal(count, 1);
  assert.equal(events.at(-1)?.partialText, 'Partiel');
  assert.equal(events.at(-1)?.code, 'protocol');
});

test('boucle agent : arguments fragmentés, résultat réel, reprise du modèle', async () => {
  let count = 0;
  let nextMessages: unknown[] = [];
  const transport = createChatTransport({ secrets, fetch: async (_url, init) => {
    count++;
    if (count === 1) return response(
      frame({ choices: [{ delta: { tool_calls: [{ index: 0, id: 'call1', function: { name: 'get_datetime', arguments: '{' } }] } }] })
      + frame({ choices: [{ delta: { tool_calls: [{ index: 0, function: { arguments: '}' } }] } }] }) + end('tool_calls'));
    nextMessages = JSON.parse(String(init?.body)).messages;
    return response(content('Il est midi.') + end());
  } });
  const events = await collect(transport.stream({ ...base, tools: createBasicTools(() => new Date('2026-10-27T12:00:00Z')) }));
  assert.equal(count, 2);
  assert.equal(events.filter(e => e.type === 'tool-start').length, 1);
  const done = events.find(e => e.type === 'tool-end');
  assert.deepEqual(done?.result, { iso: '2026-10-27T12:00:00.000Z', timezone: 'UTC' });
  assert.equal(nextMessages.length, 4);
  assert.equal(events.at(-1)?.text, 'Il est midi.');
});

test('outil inconnu : résultat d’erreur sans exécution', async () => {
  let count = 0;
  const transport = createChatTransport({ secrets, fetch: async () => ++count === 1
    ? response(frame({ choices: [{ delta: { tool_calls: [{ index: 0, id: 'x', function: { name: '__proto__', arguments: '{}' } }] } }] }) + end('tool_calls'))
    : response(content('Outil indisponible.') + end()) });
  const events = await collect(transport.stream({ ...base, tools: createBasicTools() }));
  assert.deepEqual(events.find(e => e.type === 'tool-end')?.result, { error: 'unknown-tool' });
});

test('outil bloqué : timeout puis reprise', async () => {
  let count = 0;
  const transport = createChatTransport({ secrets, toolTimeoutMs: 10, fetch: async () => ++count === 1
    ? response(frame({ choices: [{ delta: { tool_calls: [{ index: 0, id: 'x', function: { name: 'slow', arguments: '{}' } }] } }] }) + end('tool_calls'))
    : response(content('Délai dépassé.') + end()) });
  const events = await collect(transport.stream({ ...base, tools: {
    slow: { description: 'slow', parameters: {}, execute: () => new Promise(() => {}) },
  } }));
  assert.deepEqual(events.find(e => e.type === 'tool-end')?.result, { error: 'tool-timeout' });
});

test('agent borné : huit appels au modèle, sept exécutions maximum', async () => {
  let requests = 0; let executions = 0;
  const transport = createChatTransport({ secrets, fetch: async () => {
    requests++;
    return response(frame({ choices: [{ delta: { tool_calls: [{ index: 0, id: `x${requests}`, function: { name: 'loop', arguments: '{}' } }] } }] }) + end('tool_calls'));
  } });
  const events = await collect(transport.stream({ ...base, tools: {
    loop: { description: 'loop', parameters: {}, async execute() { executions++; return 'ok'; } },
  } }));
  assert.equal(requests, 8); assert.equal(executions, 7);
  assert.equal(events.at(-1)?.reason, 'step-limit');
});

test('OpenRouter gratuit : blocage d’un modèle payant avant lecture de la clé', async () => {
  let count = 0;
  const config = structuredClone(providers.openrouter);
  config.models.fort.id = 'paid/model';
  const transport = createChatTransport({ secrets, fetch: async () => { count++; return response(end()); } });
  const events = await collect(transport.stream({ ...base, provider: config }));
  assert.equal(count, 0); assert.equal(events.at(-1)?.code, 'paid-model');
});

test('liste OpenRouter : exclut les modèles sans prix nul confirmé', async () => {
  const transport = createChatTransport({ secrets, fetch: async () => Response.json({ data: [
    { id: 'one:free', pricing: { prompt: '0', completion: '0' } },
    { id: 'two:free', pricing: { prompt: '0.5', completion: '0' } },
    { id: 'unknown:free' }, { id: 'paid', pricing: { prompt: '0', completion: '0' } },
  ] }) });
  assert.deepEqual(await transport.listModels(providers.openrouter), ['one:free']);
});

test('configuration : empêche une clé Groq de partir vers un autre domaine', async () => {
  let count = 0;
  const transport = createChatTransport({ secrets, fetch: async () => { count++; return response(end()); } });
  const events = await collect(transport.stream({ ...base, provider: { ...providers.groq, baseURL: 'https://other.example/v1' } }));
  assert.equal(count, 0); assert.equal(events.at(-1)?.code, 'configuration');
});

test('réflexion désactivée non supportée : aucune promesse trompeuse', async () => {
  const transport = createChatTransport({ secrets });
  const events = await collect(transport.stream({ ...base, effort: 'aucune' }));
  assert.equal(events.at(-1)?.code, 'unsupported-effort');
});

test('auto : routage local explicable', () => {
  assert.equal(selectModel(providers.groq, 'auto', base.messages).id, 'openai/gpt-oss-20b');
  assert.equal(selectModel(providers.groq, 'auto', [{ role: 'user', content: 'Analyse cette architecture' }]).id, 'openai/gpt-oss-120b');
});

test('SecureStore : séparation par profil et suppression locale explicite', async () => {
  const values = new Map<string, string>();
  const adapter = {
    async getItemAsync(key: string) { return values.get(key) ?? null; },
    async setItemAsync(key: string, value: string) { values.set(key, value); },
    async deleteItemAsync(key: string) { values.delete(key); },
  };
  const a = createSecretStore(adapter, 'profile-a'); const b = createSecretStore(adapter, 'profile-b');
  await a.set('groq', ' test ');
  assert.equal(await a.get('groq'), 'test'); assert.equal(await b.get('groq'), null);
  await a.remove('groq'); assert.equal(await a.get('groq'), null);
});
