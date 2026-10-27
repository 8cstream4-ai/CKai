import type { Message } from './types.ts';

/** Bounded, explicit sliding context. Full history remains stored on the device. */
export function conversationContext(messages: readonly Message[], charBudget = 10_000): Message[] {
  if (!Number.isInteger(charBudget) || charBudget < 1) throw new Error('Invalid context budget');
  const selected: Message[] = [];
  let length = 0;
  for (let index = messages.length - 1; index >= 0; index--) {
    const message = messages[index]!;
    if (!['user', 'assistant'].includes(message.role) || !message.content?.trim()) continue;
    if (length + message.content.length > charBudget) {
      if (!selected.length) throw new Error('Message too long');
      break;
    }
    selected.unshift({ role: message.role, content: message.content });
    length += message.content.length;
  }
  while (selected[0]?.role === 'assistant') selected.shift();
  return selected;
}
