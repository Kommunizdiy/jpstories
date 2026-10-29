import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shuffle, createSession, answer, setDirection, hideReading, RETRY_GAP } from '../flashcards.js';

// Предсказуемый «случайный» генератор для тестов.
const seq = (...values) => { let i = 0; return () => values[i++ % values.length]; };
const words = ['a', 'b', 'c', 'd', 'e', 'f', 'g'].map((kana, i) => ({ kana, kanji: '', meaning: kana.toUpperCase(), lesson: i + 1, type: 'n', theme: 'T' }));

test('shuffle keeps every card exactly once', () => {
  const out = shuffle(words, seq(0.9, 0.1, 0.5, 0.3));
  assert.equal(out.length, words.length);
  assert.deepEqual(new Set(out), new Set(words));
  assert.notDeepEqual(out, words);
});

test('mixed direction gives both sides; fixed direction gives one', () => {
  const mixed = createSession(words, { random: seq(0.2, 0.7) });
  assert.deepEqual(new Set(mixed.queue.map(c => c.dir)), new Set(['jp', 'ru']));
  const ru = createSession(words, { direction: 'ru' });
  assert.ok(ru.queue.every(c => c.dir === 'ru'));
  setDirection(ru, 'jp');
  assert.ok(ru.queue.every(c => c.dir === 'jp'));
});

test('a forgotten card comes back a few cards later and is listed as hard', () => {
  const s = createSession(words, { direction: 'jp' });
  const first = s.queue[0];
  answer(s, false);
  assert.equal(s.queue.indexOf(first), RETRY_GAP);
  assert.deepEqual(s.missed, [first.word]);
  while (s.queue.length) answer(s, true);
  assert.equal(s.learned, words.length);
  assert.deepEqual(s.missed, [first.word]);
});

test('the last forgotten card is shown again right away', () => {
  const s = createSession(words.slice(0, 1), { direction: 'jp' });
  answer(s, false);
  assert.equal(s.queue.length, 1);
  answer(s, false); answer(s, true);
  assert.equal(s.queue.length, 0);
  assert.equal(s.missed.length, 1);
});

test('reading is hidden only when every kanji is already known', () => {
  const known = new Set('学生先');
  assert.equal(hideReading({ kanji: '学生', kana: 'がくせい' }, known), true);
  assert.equal(hideReading({ kanji: '図書館', kana: 'としょかん' }, known), false);
  assert.equal(hideReading({ kanji: '', kana: 'これ' }, known), false);
});
