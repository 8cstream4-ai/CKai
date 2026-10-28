export type ProviderId = 'groq' | 'google' | 'openrouter' | 'local';
export type Level = 'faible' | 'moyen' | 'fort' | 'auto';
export type Effort = 'aucune' | 'courte' | 'moyenne' | 'profonde';
export type Locale = 'fr' | 'en';
export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

export interface ToolCall {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
}

export interface Message {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}

export interface Model {
  id: string;
  reasoning: boolean;
  tools: boolean;
}

export interface ProviderConfig {
  id: ProviderId;
  baseURL: string;
  models: Record<Exclude<Level, 'auto'>, Model>;
  /** This is a routing guard, not proof that the account itself has no billing. */
  freeOnly: boolean;
}

export interface SecretStore {
  get(provider: ProviderId): Promise<string | null>;
  set(provider: ProviderId, value: string): Promise<void>;
  remove(provider: ProviderId): Promise<void>;
}

export type ChatEvent =
  | { type: 'status'; stage: 'connecting' | 'responding'; model: string }
  | { type: 'text'; delta: string }
  | { type: 'retry'; attempt: number; waitMs: number }
  | { type: 'tool-start'; id: string; name: string }
  | { type: 'tool-end'; id: string; name: string; result: Json; durationMs: number }
  | { type: 'usage'; inputTokens: number; outputTokens: number }
  | { type: 'done'; reason: 'stop' | 'length' | 'cancelled' | 'step-limit'; text: string }
  | { type: 'error'; code: string; message: string; partialText: string; suggestLowerLevel: boolean };

export interface Tool {
  description: string;
  parameters: Record<string, Json>;
  execute(input: unknown, signal: AbortSignal): Promise<Json>;
}

export interface ChatRequest {
  provider: ProviderConfig;
  messages: readonly Message[];
  level?: Level;
  effort?: Effort;
  locale?: Locale;
  instructions?: string;
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
  tools?: Record<string, Tool>;
  /** Require this real tool on the first step, then allow normal tool choice. */
  requiredTool?: string;
}

/** Swap the transport for an AI SDK adapter or an explicit user-selected proxy. */
export interface ChatTransport {
  stream(request: ChatRequest): AsyncGenerator<ChatEvent>;
  listModels(provider: ProviderConfig, signal?: AbortSignal): Promise<string[]>;
}
