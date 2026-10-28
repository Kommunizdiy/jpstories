import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { root } from './build.mjs';
import { parseStory } from './stories.mjs';

const tokens = /\[([^\]|]+)\|([^\]|]*)\|([^\]]+)\]/g;
test('all 18 imported texts and 54 questions survive annotation without untranslated Japanese', async () => {
  const sources = JSON.parse(await readFile(path.join(root, 'scripts/import-data/source.json'), 'utf8'));
  const files = await readdir(path.join(root, 'stories'));
  const imported = [];
  for (const file of files) {
    const story = parseStory(await readFile(path.join(root, 'stories', file), 'utf8'), file.slice(0, -4));
    // Импортированные тексты — те, что есть в source.json; новые серии проверяет stories-markup.test.mjs.
    if (story.note && sources.some(s => s.title === story.title && (s.chapter || null) === (story.chapter || null))) imported.push(story);
  }
  assert.equal(sources.length, 18);
  assert.equal(imported.length, 18);
  let questions = 0;
  for (const source of sources) {
    const story = imported.find(s => s.title === source.title && (s.chapter || null) === source.chapter);
    assert.ok(story, source.title);
    const visible = story.body.replace(tokens, '$1');
    assert.equal(visible, [...source.body, 'Вопросы к тексту', ...source.questions].join('\n\n'));
    const unannotated = story.body.replace(tokens, '').replace('Вопросы к тексту', '');
    assert.doesNotMatch(unannotated, /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u, story.title);
    assert.doesNotMatch(story.body.replace(tokens, ''), /[\[\]|]/, story.title);
    for (const match of story.body.matchAll(tokens)) {
      assert.match(match[3], /[а-яё]/iu, `${story.title}: ${match[1]}`);
      if (/\p{Script=Han}/u.test(match[1])) assert.match(match[2], /[ぁ-ゖ]/u, match[1]);
    }
    questions += source.questions.length;
  }
  assert.equal(questions, 54);
  const chapters = imported.filter(s => s.series).map(s => s.chapter).sort((a,b) => a-b);
  assert.deepEqual(chapters, Array.from({length: 12}, (_, i) => i+1));
  assert.equal(imported.find(s => s.title === '奈良のしか').lesson, 5);
  assert.equal(imported.find(s => s.title === '二十びょうの「すみません」').lesson, 12);
  const chapter7 = imported.find(s => s.chapter === 7).body;
  const chapter8 = imported.find(s => s.chapter === 8).body;
  const theatre = imported.find(s => s.title === '見えない人').body;
  assert.match(chapter7, /\[きました\|\|приходить/);
  assert.match(theatre, /\[きている\|\|носит; одет/);
  assert.match(chapter8, /\[は\|わ\|[^\]]+\]\[いない\|\|/);
  assert.match(theatre, /\[何\|なん\|[^\]]+\]\[と\|/);
  const medicine = imported.find(s => s.title === 'くびにねぎ').body;
  assert.match(medicine, /\[きかない\|\|не действует/);
  assert.match(imported.find(s => s.chapter === 6).body, /\[きいて\|\|слушать; спрашивать/);
});
