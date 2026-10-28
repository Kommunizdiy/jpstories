import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { parseGrammar, parseVocab, parseKanji, buildReference } from './reference.mjs';
import { build, output, root } from './build.mjs';
import { dictionaryMatches } from '../reference.js';

test('grammar files: header, rules, explanations and examples with translations', () => {
  const lesson = parseGrammar('﻿lesson: 3\r\ntitle: 約束\r\nsubtitle: Договор\r\n---\r\n## 〜ませんか\r\nПриглашение.\r\n> 映画を見ませんか。 | Посмотрим фильм?\r\n', '03.txt');
  assert.deepEqual(lesson, { lesson: 3, title: '約束', subtitle: 'Договор', rules: [{ pattern: '〜ませんか', text: ['Приглашение.'], examples: [['映画を見ませんか。', 'Посмотрим фильм?']] }] });
  assert.throws(() => parseGrammar('lesson: 3\ntitle: x\n---\nтекст без правила', 'bad.txt'), /bad\.txt/);
  assert.throws(() => parseGrammar('lesson: 3\ntitle: x\n---\n## a\n> пример без перевода', 'bad.txt'), /перевод/);
  assert.throws(() => parseGrammar('lesson: 30\ntitle: x\n---\n## a', 'bad.txt'), /lesson/);
});

test('vocabulary rows are validated: type, lesson, theme and column count', () => {
  const head = 'урок\tтип\tкандзи\tчтение\tперевод\tтема\n';
  assert.deepEqual(parseVocab(head + '3\tu\t行く\tいく\tидти\tДействия\n', ['Действия']),
    [{ lesson: 3, type: 'u', kanji: '行く', kana: 'いく', meaning: 'идти', theme: 'Действия' }]);
  assert.throws(() => parseVocab(head + '3\tverb\t行く\tいく\tидти\tДействия\n', ['Действия']), /тип/);
  assert.throws(() => parseVocab(head + '3\tu\t行く\tいく\tидти\tДругое\n', ['Действия']), /themes\.txt/);
  assert.throws(() => parseVocab(head + '3\tu\t行く\tидти\n', ['Действия']), /столбцов/);
  assert.throws(() => parseKanji('урок\tкандзи\tонъёми\tкунъёми\tзначение\n3\t一二\tイチ\tひと\tодин\n'), /один знак/);
});

test('the bundled reference: 12 grammar lessons, 609 words in known themes, 145 kanji, counter tables', async () => {
  const ref = await buildReference(root);
  assert.deepEqual(ref.grammar.map(g => g.lesson), Array.from({ length: 12 }, (_, i) => i + 1));
  assert.equal(ref.vocab.length, 609);
  assert.equal(ref.kanji.length, 145);
  assert.equal(new Set(ref.kanji.map(k => k.kanji)).size, 145);
  assert.ok(ref.vocab.every(w => ref.themes.includes(w.theme)));
  assert.ok(ref.themes.every(t => ref.vocab.some(w => w.theme === t)), 'каждая тема не пустая');
  assert.ok(ref.counters.blocks.some(b => b.tables.some(t => t.rows.some(r => r.counter === '本'))));
});

test('build writes reference.json and ships the reference module', async () => {
  await build();
  const json = JSON.parse(await readFile(path.join(output, 'reference.json'), 'utf8'));
  assert.equal(json.vocab.length, 609);
  await readFile(path.join(output, 'reference.js'), 'utf8');
  const html = await readFile(path.join(output, 'index.html'), 'utf8');
  assert.match(html, /id="reference-view"/);
  assert.match(html, /href="#view=vocab"/);
});

test('story words find dictionary entries by kanji or by kana, but a one-kana particle does not match a kanji word', async () => {
  const ref = await buildReference(root);
  assert.ok(dictionaryMatches(ref, '行く').some(w => w.kana === 'いく'));
  assert.ok(dictionaryMatches(ref, 'これ').length > 0);
  assert.ok(dictionaryMatches(ref, 'かばん').length > 0);
  assert.equal(dictionaryMatches(ref, 'は').length, 0);
  assert.equal(dictionaryMatches(ref, 'きました').length, 0);
});
