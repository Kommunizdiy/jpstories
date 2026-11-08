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

test('the bundled reference: 23 grammar lessons, 994 words in known themes, 317 kanji, counter tables', async () => {
  const ref = await buildReference(root);
  assert.deepEqual(ref.grammar.map(g => g.lesson), Array.from({ length: 23 }, (_, i) => i + 1));
  assert.equal(ref.vocab.length, 994);
  assert.equal(ref.kanji.length, 317);
  assert.equal(new Set(ref.kanji.map(k => k.kanji)).size, 317);
  assert.ok(ref.vocab.every(w => ref.themes.includes(w.theme)));
  assert.ok(ref.themes.every(t => ref.vocab.some(w => w.theme === t)), 'каждая тема не пустая');
  assert.ok(ref.counters.blocks.some(b => b.tables.some(t => t.rows.some(r => r.counter === '本'))));
});

test('build writes reference.json and ships the reference module', async () => {
  await build();
  const json = JSON.parse(await readFile(path.join(output, 'reference.json'), 'utf8'));
  assert.equal(json.vocab.length, 994);
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
test('a word written in kana finds its kanji only when the meaning agrees', async () => {
  const { kanjiForWord } = await import('../reference.js');
  const vocab = [
    { type: 'n', kanji: '学生', kana: 'がくせい', meaning: 'студент' }, { type: 'n', kanji: '下', kana: 'した', meaning: 'под' },
    { type: 'n', kanji: '私', kana: 'わたし', meaning: 'я' }, { type: 'ru', kanji: '食べる', kana: 'たべる', meaning: 'есть' },
    { type: 'u', kanji: '書く', kana: 'かく', meaning: 'писать' }, { type: 'u', kanji: '行く', kana: 'いく', meaning: 'идти, ехать' },
    { type: 'irr', kanji: '来る', kana: 'くる', meaning: 'приходить' }, { type: 'ru', kanji: '着る', kana: 'きる', meaning: 'надевать' },
  ];
  assert.deepEqual(kanjiForWord(vocab, 'がくせい', 'студент'), ['学生']);
  assert.deepEqual(kanjiForWord(vocab, 'わたし', 'я'), ['私']);
  assert.deepEqual(kanjiForWord(vocab, 'たべました', 'есть (вежливо, прошедшее)'), ['食べる']);
  assert.deepEqual(kanjiForWord(vocab, 'かいて', 'писать (форма て)'), ['書く']);
  assert.deepEqual(kanjiForWord(vocab, 'いって', 'ехать'), ['行く']);
  assert.deepEqual(kanjiForWord(vocab, 'きました', 'приходить (вежливо)'), ['来る']);
  assert.deepEqual(kanjiForWord(vocab, 'した', 'делать (прошедшее)'), []);
  assert.deepEqual(kanjiForWord(vocab, 'かきました', 'рисовать'), []);
  assert.deepEqual(kanjiForWord(vocab, '学生', 'студент'), []);
});
