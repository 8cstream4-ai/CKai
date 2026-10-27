import { createChatTransport, providers, publicError } from '../src/ai/index.ts';
const key = process.env.GROQ_API_KEY?.trim();
if (!key) { console.error('Clé Groq non configurée.'); process.exit(1); }
const secrets = {
  async get() { return key; }, async set() { throw new Error('read-only'); }, async remove() { throw new Error('read-only'); },
};
const transport = createChatTransport({ secrets, timeoutMs: 20_000 });
try {
  const models = await transport.listModels(providers.groq);
  if (!models.includes('openai/gpt-oss-120b')) throw new Error('model');
  let text = ''; let success = false;
  for await (const event of transport.stream({
    provider: providers.groq, level: 'fort', effort: 'courte', maxTokens: 1024,
    messages: [{ role: 'user', content: 'Réponds seulement : CKai fonctionne.' }],
  })) {
    if (event.type === 'text') text += event.delta;
    if (event.type === 'error') { console.error(event.message); process.exitCode = 1; }
    if (event.type === 'done' && event.reason === 'stop') success = true;
  }
  if (!success || !text.trim()) { console.error('Test de réponse non validé.'); process.exitCode = 1; }
  else console.log('Clé, disponibilité GPT-OSS 120B et réponse streaming réelle : OK.');
} catch (error) {
  console.error(publicError(error, 'fr').message); process.exitCode = 1;
}
