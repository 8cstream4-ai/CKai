import type { Effort, Level, Message, Model, ProviderConfig } from './types.ts';

const gpt20: Model = { id: 'openai/gpt-oss-20b', reasoning: true, tools: true };
const gpt120: Model = { id: 'openai/gpt-oss-120b', reasoning: true, tools: true };

/** Starting points checked against official docs on 2026-10-27; refresh via listModels. */
export const providers: Record<'groq' | 'google' | 'openrouter', ProviderConfig> = {
  groq: {
    id: 'groq', baseURL: 'https://api.groq.com/openai/v1', freeOnly: true,
    models: { faible: gpt20, moyen: gpt120, fort: gpt120 },
  },
  google: {
    id: 'google', baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai', freeOnly: true,
    models: {
      faible: { id: 'gemini-3.5-flash-lite', tools: true, reasoning: false },
      moyen: { id: 'gemini-3.8-flash', tools: true, reasoning: false },
      fort: { id: 'gemini-3.8-flash', tools: true, reasoning: false },
    },
  },
  openrouter: {
    id: 'openrouter', baseURL: 'https://openrouter.ai/api/v1', freeOnly: true,
    models: {
      faible: { id: 'openrouter/free', tools: false, reasoning: false },
      moyen: { id: 'openrouter/free', tools: false, reasoning: false },
      fort: { id: 'openrouter/free', tools: false, reasoning: false },
    },
  },
};

export function selectModel(config: ProviderConfig, level: Level, messages: readonly Message[]): Model {
  // Transparent local heuristic: no extra paid classification call.
  const last = messages.findLast(m => m.role === 'user')?.content ?? '';
  const selected = level === 'auto'
    ? (last.length > 800 || /analyse|raisonn|démontr|architect|debug|algorithm|compare|proof/i.test(last)
      ? 'fort' : last.length < 120 ? 'faible' : 'moyen')
    : level;
  const model = config.models[selected];
  if (!model?.id.trim()) throw new Error('configuration');
  if (config.id === 'openrouter' && config.freeOnly
    && model.id !== 'openrouter/free' && !model.id.endsWith(':free')) throw new Error('paid-model');
  return model;
}

export function reasoningOptions(config: ProviderConfig, model: Model, effort: Effort): Record<string, string> {
  if (!model.reasoning || config.id !== 'groq' || !model.id.startsWith('openai/gpt-oss-')) return {};
  // GPT-OSS has no 'none': reject instead of silently claiming reasoning is disabled.
  if (effort === 'aucune') throw new Error('unsupported-effort');
  return { reasoning_effort: { courte: 'low', moyenne: 'medium', profonde: 'high' }[effort] };
}

export function endpoint(config: ProviderConfig, path: string): string {
  const url = new URL(config.baseURL);
  const expected = { groq: 'api.groq.com', google: 'generativelanguage.googleapis.com', openrouter: 'openrouter.ai' };
  if (url.username || url.password || url.search || url.hash) throw new Error('configuration');
  if (config.id !== 'local' && (url.protocol !== 'https:' || url.hostname !== expected[config.id])) {
    throw new Error('configuration');
  }
  if (config.id === 'local' && !['http:', 'https:'].includes(url.protocol)) throw new Error('configuration');
  return `${url.toString().replace(/\/$/, '')}/${path}`;
}
