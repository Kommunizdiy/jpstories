import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { root } from './build.mjs';
import { parseStory } from './stories.mjs';
import { splitSections, tasksOf, glossaryOf, TOKEN } from '../sections.js';
import { routeView, tasksHash } from '../routing.js';

test('section headings split a story body; text before them stays the main text', () => {
  const body = '[本|ほん|книга]。\n\nВопросы к тексту\n\nQ1\n\nСлова к тексту\n\n[本|ほん|книга]\n[水|みず|вода]\n\nЗадания\n\nT1\n\nT2\n\nПеревод\n\nКнига.';
  assert.deepEqual(splitSections(body).map(s => [s.kind, s.paragraphs.length]), [['text', 1], ['questions', 1], ['words', 1], ['tasks', 2], ['translation', 1]]);
  assert.deepEqual(tasksOf(body), ['T1', 'T2']);
  assert.deepEqual(glossaryOf(splitSections(body)[2].paragraphs).map(e => e.surface), ['本', '水']);
  assert.deepEqual(splitSections('Только текст.').map(s => s.kind), ['text']);
  assert.deepEqual(tasksOf('Только текст.'), []);
});

test('the tasks page has its own link', () => {
  assert.equal(tasksHash(), '#view=tasks');
  assert.deepEqual(routeView('#view=tasks'), { view: 'tasks' });
});

// Тексты с заданиями: японский в тексте, заданиях и словах размечен; перевод — по-русски без разметки.
test('stories with tasks are fully annotated', async () => {
  const files = (await readdir(path.join(root, 'stories'))).filter(f => f.endsWith('.txt'));
  for (const file of files) {
    const story = parseStory(await readFile(path.join(root, 'stories', file), 'utf8'), file.slice(0, -4));
    if (!tasksOf(story.body).length) continue;
    for (const section of splitSections(story.body)) {
      const text = section.paragraphs.join('\n\n');
      if (section.kind === 'translation') {
        assert.doesNotMatch(text, /[\[\]|]/, `${file}: разметка в переводе`);
        continue;
      }
      const rest = text.replace(TOKEN, '');
      assert.doesNotMatch(rest, /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u, `${file} (${section.kind}): неразмеченный японский текст`);
      assert.doesNotMatch(rest, /[\[\]|]/, `${file} (${section.kind}): сломанная разметка`);
      for (const [, surface, reading, meaning] of text.matchAll(TOKEN)) {
        assert.match(meaning, /[а-яё]/iu, `${file}: ${surface} без перевода`);
        if (/\p{Script=Han}/u.test(surface)) assert.match(reading, /[ぁ-ゖ]/u, `${file}: ${surface} без чтения`);
      }
    }
  }
});
