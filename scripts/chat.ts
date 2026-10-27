import { createChatTransport, providers, createBasicTools, publicError } from '../src/ai/index.ts';
import type { SecretStore } from '../src/ai/types.ts';

// Node CLI only: never import this script into Expo.
const secrets: SecretStore = {
  async get(provider) { return process.env[`${provider === 'google' ? 'GOOGLE' : provider.toUpperCase()}_API_KEY`] ?? null; },
  async set() { throw new Error('Use .env.local for the CLI'); },
  async remove() { throw new Error('Use .env.local for the CLI'); },
};
const transport = createChatTransport({ secrets, timeoutMs: 20_000 });
const controller = new AbortController();
process.on('SIGINT', () => controller.abort());

if (process.argv.includes('--models')) {
  try {
    console.log((await transport.listModels(providers.groq, controller.signal)).join('\n'));
  } catch (error) {
    console.error(publicError(error, 'fr').message);
    process.exitCode = 1;
  }
} else {
  const prompt = process.argv.slice(2).join(' ') || 'Explique en deux phrases pourquoi une IA rapide est utile.';
  for await (const event of transport.stream({
    provider: providers.groq, messages: [{ role: 'user', content: prompt }],
    level: 'fort', effort: 'moyenne', signal: controller.signal, tools: createBasicTools(),
  })) {
    if (event.type === 'text') process.stdout.write(event.delta);
    if (event.type === 'error') { console.error(`\n${event.message}`); process.exitCode = 1; }
    if (event.type === 'done') console.log(`\n[${event.reason}]`);
  }
}
