import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

export const WORD_TYPES = ['n', 'u', 'ru', 'irr', 'i', 'na', 'x'];
const clean = raw => raw.replace(/^﻿/, '').replace(/\r\n?/g, '\n');

// reference/grammar/NN.txt: header (lesson, title, subtitle), ---, then "## pattern",
// explanation lines and "> японский пример | перевод".
export function parseGrammar(raw, id) {
  const text = clean(raw).trim();
  const separator = text.indexOf('\n---\n');
  if (separator < 0) throw new Error(`grammar/${id}: отсутствует строка-разделитель ---`);
  const meta = {};
  for (const line of text.slice(0, separator).split('\n')) {
    const colon = line.indexOf(':');
    if (colon > 0) meta[line.slice(0, colon).trim()] = line.slice(colon + 1).trim();
  }
  const lesson = Number(meta.lesson);
  if (!meta.title || !Number.isInteger(lesson) || lesson < 1 || lesson > 23) {
    throw new Error(`grammar/${id}: нужны title и lesson от 1 до 23`);
  }
  const rules = [];
  let rule = null;
  for (const line of text.slice(separator + 5).split('\n').map(l => l.trim())) {
    if (!line) continue;
    if (line.startsWith('## ')) { rule = { pattern: line.slice(3).trim(), text: [], examples: [] }; rules.push(rule); continue; }
    if (!rule) throw new Error(`grammar/${id}: текст до первого правила «## …»`);
    if (line.startsWith('>')) {
      const bar = line.indexOf('|');
      if (bar < 0) throw new Error(`grammar/${id}: в примере нужен перевод через | — ${line}`);
      rule.examples.push([line.slice(1, bar).trim(), line.slice(bar + 1).trim()]);
    } else rule.text.push(line);
  }
  if (!rules.length) throw new Error(`grammar/${id}: нет ни одного правила`);
  return { lesson, title: meta.title, subtitle: meta.subtitle || '', rules };
}

function parseTsv(raw, name, columns) {
  const lines = clean(raw).split('\n').filter(l => l.trim() && !l.startsWith('#'));
  return lines.slice(1).map((line, i) => {
    const cells = line.split('\t');
    if (cells.length !== columns) throw new Error(`${name}, строка ${i + 2}: нужно ${columns} столбцов через Tab, найдено ${cells.length}`);
    return cells.map(c => c.trim());
  });
}

export function parseVocab(raw, themes) {
  return parseTsv(raw, 'vocab.tsv', 6).map(([lesson, type, kanji, kana, meaning, theme], i) => {
    const row = `vocab.tsv, строка ${i + 2}`;
    const n = Number(lesson);
    if (!Number.isInteger(n) || n < 1 || n > 23) throw new Error(`${row}: урок должен быть числом от 1 до 23`);
    if (!WORD_TYPES.includes(type)) throw new Error(`${row}: тип «${type}» — допустимы ${WORD_TYPES.join(', ')}`);
    if (!kana || !meaning) throw new Error(`${row}: нужны чтение и перевод`);
    if (!themes.includes(theme)) throw new Error(`${row}: темы «${theme}» нет в themes.txt`);
    return { lesson: n, type, kanji, kana, meaning, theme };
  });
}

export function parseKanji(raw) {
  return parseTsv(raw, 'kanji.tsv', 5).map(([lesson, kanji, on, kun, meaning], i) => {
    const n = Number(lesson);
    if (!Number.isInteger(n) || n < 1 || n > 23 || [...kanji].length !== 1 || !meaning) {
      throw new Error(`kanji.tsv, строка ${i + 2}: нужны урок, один знак и значение`);
    }
    return { lesson: n, kanji, on, kun, meaning };
  });
}

export async function buildReference(root) {
  const dir = path.join(root, 'reference');
  const read = file => readFile(path.join(dir, file), 'utf8');
  const themes = clean(await read('themes.txt')).split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));
  const files = (await readdir(path.join(dir, 'grammar'))).filter(f => f.endsWith('.txt')).sort();
  const grammar = await Promise.all(files.map(async f => parseGrammar(await read(path.join('grammar', f)), f)));
  grammar.sort((a, b) => a.lesson - b.lesson);
  const counters = JSON.parse(await read('counters.json'));
  for (const block of counters.blocks || []) for (const table of block.tables || []) for (const row of table.rows) {
    if (!Array.isArray(row.forms) || row.forms.length !== 11) throw new Error(`counters.json: у «${row.counter}» нужно 11 чтений (1–10 и 何)`);
  }
  return {
    themes,
    vocab: parseVocab(await read('vocab.tsv'), themes),
    grammar,
    kanji: parseKanji(await read('kanji.tsv')),
    counters,
  };
}
