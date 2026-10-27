import type { Tool } from './types.ts';

/** Actual observable tool operations only; no fabricated thought process. */
export function createBasicTools(now: () => Date = () => new Date()): Record<string, Tool> {
  return {
    get_datetime: {
      description: 'Get the current UTC date and time.',
      parameters: { type: 'object', properties: {}, additionalProperties: false },
      async execute(input) {
        if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).length) throw new Error('input');
        return { iso: now().toISOString(), timezone: 'UTC' };
      },
    },
  };
}
