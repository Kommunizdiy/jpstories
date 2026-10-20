import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { parseStory } from './stories.mjs';
import { build, output } from './build.mjs';

test('UTF-8 BOM, Windows newlines, colons and Japanese text survive parsing', () => {
  const story = parseStory('\uFEFFtitle: 本\r\nsubtitle: Книга: начало\r\nlesson: 13\r\n---\r\n[本|ほん|книга]。\r\n\r\n次。', 'book');
  assert.deepEqual(story, { id: 'book', title: '本', subtitle: 'Книга: начало', lesson: 13, body: '[本|ほん|книга]。\n\n次。' });
});
test('invalid lesson numbers and missing content fail explicitly', () => {
  for (const lesson of ['0', '24', '1.5', '1abc', '']) {
    assert.throws(() => parseStory(`title: 本\nlesson: ${lesson}\n---\n本文`, 'bad'), /bad/);
  }
  assert.throws(() => parseStory('title: 本\nlesson: 1', 'bad'), /разделитель/);
  assert.throws(() => parseStory('title: 本\nlesson: 1\n---\n', 'bad'));
});
test('build includes original stories and portable static entry point', async () => {
  const stories = await build();
  assert.ok(stories.length >= 5);
  assert.ok(stories.some(s => s.lesson === 13));
  assert.equal(new Set(stories.map(s => s.id)).size, stories.length);
  assert.deepEqual(JSON.parse(await readFile(path.join(output, 'stories.json'), 'utf8')), stories);
  const html = await readFile(path.join(output, 'index.html'), 'utf8');
  assert.ok(!html.includes('<?php'));
  assert.match(html, /type="module" src="app.js"/);
  assert.ok(!html.includes('src="/'));
});
