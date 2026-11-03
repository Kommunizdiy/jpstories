import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { buildFamilies, familyKey, positionOf, portionsOf } from '../kanji-parts.js';

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
  for (const c of ['左', '右', '友', '有']) assert.equal(names(c)[0], '𠂇', c);
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
test('families merge variants, need a meaning and at least four Genki kanji', () => {
  const families = buildFamilies(nodes);
  const people = families.find(f => f.key === '人');
  for (const c of ['休', '作', '何', '内']) assert.ok(people.list.includes(c), c);
  for (const c of ['今', '食', '会', '金']) assert.ok(!people.list.includes(c), c);
  const roof = families.find(f => f.key === '𠆢');
  for (const c of ['今', '食', '会', '金', '全']) assert.ok(roof.list.includes(c), c);
  assert.ok(!roof.list.includes('休'));
  assert.equal(families.find(f => f.key === '亻'), undefined);
  assert.deepEqual(families.find(f => f.key === '𠂇').list.slice().sort(), ['右', '友', '左', '有'].sort());
  assert.equal(familyKey(nodes, '亻'), '人');
  assert.equal(families.find(f => f.key === '丿'), undefined);
  assert.equal(families.find(f => f.key === '一'), undefined);
  for (const family of families) {
    assert.ok(family.list.length >= 4, family.key);
    assert.ok(family.list.every(c => nodes[c].l), family.key);
    assert.ok(nodes[family.key].m, family.key);
  }
});
test('portions keep the order, cover the family and avoid tiny leftovers', () => {
  const list = [...'一二三四五六七八九十百千万円時'];
  assert.deepEqual(portionsOf(list).map(p => p.length), [7, 8]);
  assert.deepEqual(portionsOf(list).flat(), list);
  assert.deepEqual(portionsOf(list.slice(0, 5)).map(p => p.length), [5]);
});
test('part position is read from its box inside the kanji', () => {
  const whole = { x: 10, y: 10, width: 90, height: 90 };
  assert.equal(positionOf({ x: 10, y: 10, width: 90, height: 30 }, whole), 'top');
  assert.equal(positionOf({ x: 10, y: 60, width: 90, height: 40 }, whole), 'bottom');
  assert.equal(positionOf({ x: 10, y: 10, width: 25, height: 90 }, whole), 'left');
  assert.equal(positionOf({ x: 70, y: 10, width: 30, height: 90 }, whole), 'right');
  assert.equal(positionOf({ x: 40, y: 40, width: 30, height: 30 }, whole), 'inside');
});
test('meanings are in Russian and every kanji of the book or the joyo list has one', () => {
  for (const [c, node] of Object.entries(nodes)) {
    assert.equal(node.e, undefined, c);
    for (const text of [node.m, node.f, node.t]) if (text) assert.doesNotMatch(text, /[A-Za-z]/, c);
    if (node.j && c !== '々') assert.ok(node.m || node.f, `${c}: нет значения`);
  }
});
test('checked splits follow the structure databases, including meanings from history', () => {
  const names = c => nodes[c].p.map(([part]) => part);
  assert.deepEqual(names('行'), ['彳', '亍']);
  assert.deepEqual(names('旅'), ['方', '𠂉', '𧘇']);
  assert.deepEqual(names('帰'), ['丨', '丿', '帚']);
  assert.deepEqual(names('無'), ['𠂉', '卌', '一', '灬']);
  assert.deepEqual(names('楽'), ['白', '丷', '八', '木']);
  assert.ok(!nodes['帰'].p.some(([part]) => part === '刂'));
  assert.ok(!names('母').includes('毋'));
  const knife = buildFamilies(nodes).find(f => f.key === '刀');
  assert.ok(knife && !knife.list.includes('帰'));
});
