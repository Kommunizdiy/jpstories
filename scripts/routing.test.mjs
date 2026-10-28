import { test } from 'node:test';
import assert from 'node:assert/strict';
import { routeHash, resolveRoute, routeView, referenceHash } from '../routing.js';

const stories = [{ id: '01-first', lesson: 1 }, { id: '01-second', lesson: 1 }, { id: '13-next-book', lesson: 13 }];
test('a direct story link selects the exact story and book, ahead of remembered state', () => {
  assert.deepEqual(resolveRoute('#story=01-second', stories, '#story=13-next-book'), { lesson: 1, storyId: '01-second' });
  assert.deepEqual(resolveRoute('#story=13-next-book', stories), { lesson: 13, storyId: '13-next-book' });
});
test('an unqualified visit restores the last story; empty lessons keep their own link', () => {
  assert.deepEqual(resolveRoute('', stories, '#story=01-second'), { lesson: 1, storyId: '01-second' });
  assert.deepEqual(resolveRoute('#lesson=23', stories), { lesson: 23, storyId: undefined });
});
test('invalid and removed links fall back safely instead of opening a remembered unrelated story', () => {
  for (const hash of ['#story=deleted', '#lesson=24', '#lesson=1.5', '#lesson=no', '#%']) {
    assert.deepEqual(resolveRoute(hash, stories, '#story=13-next-book'), { lesson: 1, storyId: '01-first' });
  }
});
test('links round-trip encoded identifiers without changing the hosting path', () => {
  const entry = { id: 'история & 日本', lesson: 5 };
  const url = new URL('https://example.github.io/jpstories/?theme=light');
  url.hash = routeHash({ storyId: entry.id });
  assert.equal(url.pathname, '/jpstories/');
  assert.equal(url.search, '?theme=light');
  assert.deepEqual(resolveRoute(url.hash, [entry]), { lesson: 5, storyId: entry.id });
  assert.equal(routeHash({ lesson: 23 }), '#lesson=23');
});
test('reference sections have their own links; everything else stays a story link', () => {
  assert.deepEqual(routeView('#view=grammar&lesson=3'), { view: 'grammar', lesson: 3 });
  assert.deepEqual(routeView(referenceHash({ view: 'vocab', theme: 'Дом и быт', q: '家' })), { view: 'vocab', theme: 'Дом и быт', q: '家' });
  for (const hash of ['', '#story=01-first', '#lesson=4', '#view=unknown', '#%']) assert.deepEqual(routeView(hash), { view: 'stories' });
  assert.deepEqual(routeView('#view=kanji&lesson=99'), { view: 'kanji' });
  assert.equal(referenceHash({ view: 'counters' }), '#view=counters');
});
