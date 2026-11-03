import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const nodes = JSON.parse(await readFile(new URL('../reference/kanji-parts.json', import.meta.url), 'utf8'));

test('every part points to a known node and to strokes of its kanji, without overlaps', () => {
  for (const [c, node] of Object.entries(nodes)) {
    const used = node.p.flatMap(([part, strokes]) => {
      if (part) assert.ok(nodes[part], `${c}: нет части ${part}`);
      return strokes;
    });
    assert.ok(used.every(i => Number.isInteger(i) && i >= 0 && i < node.s.length), `${c}: номер черты вне кандзи`);
    assert.equal(new Set(used).size, used.length, `${c}: черта в двух частях`);
    assert.equal(node.sc, node.s.length, c);
  }
});
test('parts split all the way down, including parts without their own KanjiVG file', () => {
  const names = c => nodes[c].p.map(([part]) => part);
  assert.deepEqual(names('歌'), ['哥', '欠']);
  assert.deepEqual(names('哥'), ['可', '可']);
  assert.deepEqual(names('多'), ['夕', '夕']);
  assert.deepEqual(names('部').includes('咅'), true);
  assert.deepEqual(names('咅'), ['立', '口']);
  assert.deepEqual(names('翟'), ['羽', '隹']);
});
test('every Genki kanji and every part under it is described', () => {
  const seen = new Set(), stack = Object.keys(nodes).filter(c => nodes[c].l);
  assert.equal(stack.length, 317);
  while (stack.length) {
    const c = stack.pop();
    if (seen.has(c)) continue;
    seen.add(c);
    assert.ok(nodes[c].m || nodes[c].f, `${c}: нет описания`);
    for (const [part] of nodes[c].p) if (part) stack.push(part);
  }
});
