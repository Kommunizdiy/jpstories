// Разделы внутри текста истории. Абзац, состоящий ровно из заголовка, начинает новый раздел.
export const SECTION_HEADINGS = {
  'Вопросы к тексту': 'questions',
  'Слова к тексту': 'words',
  'Задания': 'tasks',
  'Перевод': 'translation',
};
export const TOKEN = /\[([^\]|]+)\|([^\]|]*)\|([^\]]+)\]/g;

export function splitSections(body) {
  const sections = [{ kind: 'text', title: '', paragraphs: [] }];
  for (const paragraph of body.split(/\n\s*\n/)) {
    const kind = SECTION_HEADINGS[paragraph.trim()];
    if (kind) sections.push({ kind, title: paragraph.trim(), paragraphs: [] });
    else sections.at(-1).paragraphs.push(paragraph);
  }
  return sections.filter(section => section.kind !== 'text' || section.paragraphs.length);
}

// Задания истории по порядку (каждое — один абзац с разметкой слов).
export function tasksOf(body) {
  return splitSections(body).filter(s => s.kind === 'tasks').flatMap(s => s.paragraphs);
}

// Строки раздела «Слова к тексту»: [слово|чтение|перевод] по одному на строке.
export function glossaryOf(paragraphs) {
  const entries = [];
  for (const paragraph of paragraphs) {
    for (const [, surface, reading, meaning] of paragraph.matchAll(TOKEN)) entries.push({ surface, reading, meaning });
  }
  return entries;
}
