export function parseStory(raw, id) {
  const text = raw.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').trim();
  const separator = text.indexOf('\n---\n');
  if (separator < 0) throw new Error(`${id}: отсутствует строка-разделитель ---`);
  const meta = {};
  for (const line of text.slice(0, separator).split('\n')) {
    const colon = line.indexOf(':');
    if (colon > 0) meta[line.slice(0, colon).trim()] = line.slice(colon + 1).trim();
  }
  const lesson = Number(meta.lesson);
  const body = text.slice(separator + 5).trim();
  if (!meta.title || !Number.isInteger(lesson) || lesson < 1 || lesson > 23 || !body) {
    throw new Error(`${id}: нужны title, lesson от 1 до 23 и непустой текст`);
  }
  const story = { id, lesson, title: meta.title, subtitle: meta.subtitle || '', body };
  if (meta.note) story.note = meta.note;
  if (meta.series) {
    const chapter = Number(meta.chapter);
    if (!Number.isInteger(chapter) || chapter < 1) throw new Error(`${id}: для серии нужен положительный номер chapter`);
    story.series = meta.series;
    story.chapter = chapter;
  }
  return story;
}
