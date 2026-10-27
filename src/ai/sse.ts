import { AIError } from './errors.ts';

/** UTF-8, CRLF, multiline data, fragmented frames and bounded untrusted input. */
export async function* readSSE(body: ReadableStream<Uint8Array>, signal: AbortSignal): AsyncGenerator<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  const cancel = () => { void reader.cancel().catch(() => {}); };
  signal.addEventListener('abort', cancel, { once: true });
  try {
    signal.throwIfAborted();
    while (true) {
      const { done, value } = await reader.read();
      signal.throwIfAborted();
      buffer += decoder.decode(value, { stream: !done });
      if (buffer.length > 2_000_000) throw new AIError('protocol');
      let match: RegExpExecArray | null;
      while ((match = /\r?\n\r?\n/.exec(buffer))) {
        signal.throwIfAborted();
        const frame = buffer.slice(0, match.index);
        buffer = buffer.slice(match.index + match[0].length);
        const data = frame.split(/\r?\n/).filter(line => line.startsWith('data:'))
          .map(line => line.slice(5).replace(/^ /, '')).join('\n');
        if (data) yield data;
      }
      if (done) {
        if (buffer.trim() && !buffer.trimStart().startsWith(':')) throw new AIError('protocol');
        break;
      }
    }
  } finally {
    signal.removeEventListener('abort', cancel);
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
