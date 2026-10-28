import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { parseSeries, collectSeries } from './series.mjs';
import { build, output } from './build.mjs';
import { readingPlan, plural } from '../series.js';
import { routeView, seriesHash } from '../routing.js';

const chapter = (id, n, lesson = n) => ({ id, lesson, title: id, subtitle: '', body: '…', series: 'Тайна', chapter: n });

test('series description: header, paragraphs and explicit errors', () => {
  const info = parseSeries('﻿series: Тайна\r\ntitle: なぞ\r\ngenre: Детектив\r\nmark: 謎\r\n---\r\nПервый абзац\r\nв две строки.\r\n\r\nВторой.', 'mystery');
  assert.deepEqual(info, { id: 'mystery', name: 'Тайна', title: 'なぞ', genre: 'Детектив', mark: '謎', description: ['Первый абзац в две строки.', 'Второй.'] });
  assert.deepEqual(parseSeries('series: Тайна', 'mystery'), { id: 'mystery', name: 'Тайна' });
  assert.throws(() => parseSeries('series: Тайна', 'Тайна'), /латиница/);
  assert.throws(() => parseSeries('title: なぞ\n---\nТекст', 'mystery'), /series:/);
  assert.throws(() => parseSeries('series: Тайна\nmark: 謎謎', 'mystery'), /один знак/);
});

test('chapters are grouped and ordered, mistakes are reported', () => {
  const stories = [chapter('02-mystery-02', 2), chapter('01-mystery-01', 1), { id: 'solo', lesson: 1, title: 'x', subtitle: '', body: 'x' }];
  assert.deepEqual(collectSeries(stories), [{ id: 'mystery', name: 'Тайна', chapters: ['01-mystery-01', '02-mystery-02'] }]);
  const described = [{ id: 'secret', name: 'Тайна', genre: 'Детектив' }];
  assert.deepEqual(collectSeries(stories, described)[0], { id: 'secret', name: 'Тайна', genre: 'Детектив', chapters: ['01-mystery-01', '02-mystery-02'] });
  assert.throws(() => collectSeries([chapter('a', 1), chapter('b', 1)]), /глава 1 встречается дважды/);
  assert.throws(() => collectSeries(stories, [{ id: 'other', name: 'Другая' }]), /нет ни одной главы/);
});

test('bundled detective is one series of 12 chapters', async () => {
  await build();
  const series = JSON.parse(await readFile(path.join(output, 'series.json'), 'utf8'));
  const camera = series.find(s => s.id === 'camera');
  assert.equal(camera.name, 'Чей фотоаппарат?');
  assert.deepEqual(camera.chapters, Array.from({ length: 12 }, (_, i) => `${String(i + 1).padStart(2, '0')}-camera-${String(i + 1).padStart(2, '0')}`));
  assert.ok(camera.description.length >= 1);
  const html = await readFile(path.join(output, 'index.html'), 'utf8');
  for (const id of ['series-shelf', 'series-page', 'series-bar']) assert.match(html, new RegExp(`id="${id}"`));
  await readFile(path.join(output, 'series.js'), 'utf8');
});

test('reading plan: start, continue from the last opened chapter, read again', () => {
  const ids = ['c1', 'c2', 'c3', 'c4'];
  assert.deepEqual(readingPlan(ids, new Set()), { read: 0, total: 4, mode: 'start', target: 'c1' });
  assert.equal(readingPlan(ids, new Set(), 'c3').target, 'c3');
  assert.equal(readingPlan(ids, new Set(['c1', 'c2']), 'c2').target, 'c3');
  assert.equal(readingPlan(ids, new Set(['c1', 'c2', 'c4']), 'c4').target, 'c3');
  assert.deepEqual(readingPlan(ids, new Set(ids), 'c4'), { read: 4, total: 4, mode: 'again', target: 'c1' });
  assert.equal(readingPlan(ids, new Set(['c1']), 'gone').mode, 'continue');
});

test('series routes and Russian plurals', () => {
  assert.deepEqual(routeView('#series=camera'), { view: 'series', series: 'camera' });
  assert.equal(routeView('#view=vocab&series=camera').view, 'vocab');
  assert.equal(seriesHash('camera'), '#series=camera');
  assert.deepEqual([1, 2, 5, 11, 12, 21, 22, 25].map(n => plural(n, ['глава', 'главы', 'глав'])),
    ['глава', 'главы', 'глав', 'глав', 'глав', 'глава', 'главы', 'глав']);
});
