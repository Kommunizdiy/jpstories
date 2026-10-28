import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { root } from './build.mjs';
import { parseStory } from './stories.mjs';

const tokens = /\[([^\]|]+)\|([^\]|]*)\|([^\]]+)\]/g;

// Главы больших историй: каждое японское слово кликабельно, с русским переводом, у кандзи есть чтение.
test('every chapter of a series is fully annotated', async () => {
  const files = (await readdir(path.join(root, 'stories'))).filter(f => f.endsWith('.txt'));
  let checked = 0;
  for (const file of files) {
    const story = parseStory(await readFile(path.join(root, 'stories', file), 'utf8'), file.slice(0, -4));
    if (!story.series) continue;
    checked++;
    const rest = story.body.replace(tokens, '').replace('Вопросы к тексту', '');
    assert.doesNotMatch(rest, /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u, `${file}: неразмеченный японский текст`);
    assert.doesNotMatch(rest, /[\[\]|{}]/, `${file}: сломанная разметка`);
    for (const [, surface, reading, meaning] of story.body.matchAll(tokens)) {
      assert.match(meaning, /[а-яё]/iu, `${file}: ${surface} без перевода`);
      if (/\p{Script=Han}/u.test(surface)) assert.match(reading, /[ぁ-ゖ]/u, `${file}: ${surface} без чтения`);
    }
  }
  assert.ok(checked >= 19);
});
