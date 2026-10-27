/** Local excerpt selection; documents remain intact in local storage. */
export function documentExcerpts(text: string, question: string, maximum = 12000): string {
  if (text.length <= maximum) return text;
  const terms = [...new Set(question.toLocaleLowerCase('fr').match(/[\p{L}\p{N}]{3,}/gu) ?? [])];
  const chunks: { index: number; value: string; score: number }[] = [];
  for (let index = 0; index < text.length; index += 1000) {
    const value = text.slice(index, index + 1300); const lower = value.toLocaleLowerCase('fr');
    const score = terms.reduce((sum, term) => sum + (lower.includes(term) ? 1 : 0), 0);
    chunks.push({ index, value, score });
  }
  const selected = chunks.sort((a, b) => b.score - a.score || a.index - b.index).slice(0, Math.floor(maximum / 1400));
  return '[Extraits sélectionnés du document ; le reste n’est pas inclus dans cet échange.]\n' + selected.sort((a, b) => a.index - b.index).map(c => `[Position ${c.index}]\n${c.value}`).join('\n\n');
}
