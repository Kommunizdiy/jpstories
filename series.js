// Большие истории: сколько глав прочитано и с какой главы продолжить.
// chapterIds — главы по порядку, completed — Set прочитанных, lastId — последняя открытая глава.
export function readingPlan(chapterIds, completed, lastId) {
  const read = chapterIds.filter(id => completed.has(id)).length;
  const last = chapterIds.indexOf(lastId);
  const next = last >= 0 && !completed.has(chapterIds[last])
    ? chapterIds[last]
    : chapterIds.slice(last + 1).find(id => !completed.has(id)) ?? chapterIds.find(id => !completed.has(id)) ?? null;
  const mode = read === 0 && last < 0 ? 'start' : next === null ? 'again' : 'continue';
  return { read, total: chapterIds.length, mode, target: next ?? chapterIds[0] };
}

export function plural(n, [one, few, many]) {
  const tens = n % 100, ones = n % 10;
  if (ones === 1 && tens !== 11) return one;
  if (ones >= 2 && ones <= 4 && (tens < 12 || tens > 14)) return few;
  return many;
}
