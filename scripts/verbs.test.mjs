import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { FORMS, RULES, conjugate, groupOf, ruleOf, verbPool, pickVerbs, groupWeight, romajiToKana, normalizeAnswer, isCorrect, choices, SESSION_SIZE } from '../verbs.js';
import { parseVocab } from './reference.mjs';
import { routeView, verbsHash, VERB_FORMS } from '../routing.js';

const v = (kana, type, kanji = '') => ({ kana, kanji, type, lesson: 3, meaning: '' });
const kana = (verb, form) => conjugate(verb, form).kana;

test('て- and た-forms follow the ending of う-verbs', () => {
  const cases = [['かう', 'かって'], ['まつ', 'まって'], ['かえる', 'かえって'], ['よむ', 'よんで'], ['あそぶ', 'あそんで'], ['しぬ', 'しんで'], ['かく', 'かいて'], ['およぐ', 'およいで'], ['はなす', 'はなして']];
  for (const [dictionary, te] of cases) {
    assert.equal(kana(v(dictionary, 'u'), 'te'), te);
    assert.equal(kana(v(dictionary, 'u'), 'ta'), te.slice(0, -1) + (te.endsWith('で') ? 'だ' : 'た'));
  }
  assert.equal(kana(v('たべる', 'ru'), 'te'), 'たべて');
  assert.equal(kana(v('みる', 'ru'), 'ta'), 'みた');
});

test('exceptions: 行く, する, 来る and their compounds', () => {
  assert.deepEqual(conjugate(v('いく', 'u', '行く'), 'te'), { kana: 'いって', kanji: '行って' });
  assert.equal(kana(v('もっていく', 'u', '持っていく'), 'ta'), 'もっていった');
  assert.deepEqual(conjugate(v('べんきょうする', 'irr', '勉強する'), 'te'), { kana: 'べんきょうして', kanji: '勉強して' });
  assert.deepEqual(conjugate(v('くる', 'irr', '来る'), 'nai'), { kana: 'こない', kanji: '来ない' });
  assert.deepEqual(conjugate(v('もってくる', 'irr', '持ってくる'), 'te'), { kana: 'もってきて', kanji: '持ってきて' });
  assert.equal(kana(v('いく', 'u'), 'nai'), 'いかない');
});

test('every form of a う-verb, a る-verb, する and 来る', () => {
  const expected = {
    masu: ['のみます', 'たべます', 'します', 'きます'], te: ['のんで', 'たべて', 'して', 'きて'], nai: ['のまない', 'たべない', 'しない', 'こない'],
    ta: ['のんだ', 'たべた', 'した', 'きた'], pot: ['のめる', 'たべられる', 'できる', 'こられる'], vol: ['のもう', 'たべよう', 'しよう', 'こよう'],
    ba: ['のめば', 'たべれば', 'すれば', 'くれば'], pass: ['のまれる', 'たべられる', 'される', 'こられる'], caus: ['のませる', 'たべさせる', 'させる', 'こさせる'],
  };
  assert.deepEqual(FORMS.map(f => f.id), VERB_FORMS);
  for (const { id } of FORMS) {
    assert.deepEqual([v('のむ', 'u'), v('たべる', 'ru'), v('する', 'irr'), v('くる', 'irr')].map(verb => kana(verb, id)), expected[id], id);
  }
  assert.equal(kana(v('かう', 'u'), 'nai'), 'かわない');
  assert.equal(kana(v('いう', 'u'), 'pass'), 'いわれる');
  assert.equal(kana(v('まつ', 'u'), 'masu'), 'まちます');
  assert.equal(kana(v('はなす', 'u'), 'vol'), 'はなそう');
});

test('ある → ない and honorific 〜います', () => {
  assert.equal(kana(v('ある', 'u'), 'nai'), 'ない');
  assert.deepEqual(conjugate(v('にんきがある', 'u', '人気がある'), 'nai'), { kana: 'にんきがない', kanji: '人気がない' });
  assert.equal(kana(v('いらっしゃる', 'u'), 'masu'), 'いらっしゃいます');
  assert.equal(kana(v('くださる', 'u', '下さる'), 'masu'), 'くださいます');
  assert.equal(kana(v('いらっしゃる', 'u'), 'te'), 'いらっしゃって');
});

test('groups match the rows of the rule table', () => {
  assert.equal(groupOf(v('よむ', 'u'), 'te'), 'mubunu');
  assert.equal(groupOf(v('かえる', 'u'), 'ta'), 'utsuru');
  assert.equal(groupOf(v('およぐ', 'u'), 'te'), 'gu');
  assert.equal(groupOf(v('いく', 'u'), 'te'), 'exc');
  assert.equal(groupOf(v('いく', 'u'), 'nai'), 'u');
  assert.equal(groupOf(v('たべる', 'ru'), 'te'), 'ru');
  assert.equal(groupOf(v('する', 'irr'), 'pot'), 'exc');
  assert.equal(groupOf(v('ある', 'u'), 'nai'), 'exc');
  assert.equal(ruleOf(v('よむ', 'u'), 'te')[2], '→ んで');
  // Примеры в таблице должны совпадать с тем, что выдаёт спряжение.
  assert.match(RULES.te.find(r => r[0] === 'mubunu')[3], /読んで/);
  for (const { id } of FORMS) for (const [group] of RULES[id]) assert.ok(['u', 'ru', 'exc', 'utsuru', 'mubunu', 'ku', 'gu', 'su'].includes(group));
});

test('the whole site vocabulary conjugates in every form and lands in a known group', async () => {
  const root = new URL('../reference/', import.meta.url);
  const themes = (await readFile(new URL('themes.txt', root), 'utf8')).replace(/\r/g, '').split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));
  const vocab = parseVocab(await readFile(new URL('vocab.tsv', root), 'utf8'), themes);
  const verbs = vocab.filter(w => ['u', 'ru', 'irr'].includes(w.type));
  assert.ok(verbs.length > 200);
  for (const { id } of FORMS) {
    const pool = verbPool(vocab, id);
    assert.ok(pool.length > 150, `${id}: ${pool.length}`);
    for (const verb of pool) {
      const form = conjugate(verb, id);
      assert.ok(form.kana && form.kana !== verb.kana, `${verb.kana} ${id}`);
      assert.ok(RULES[id].some(([group]) => group === groupOf(verb, id)), `${verb.kana} ${id}`);
    }
  }
  // Каждый глагол словаря попадает хотя бы в набор て-формы (кроме ござる) — значит, тип и окончание в vocab.tsv согласованы.
  const te = new Set(verbPool(vocab, 'te').map(w => w.kanji || w.kana));
  assert.deepEqual(verbs.filter(w => !te.has(w.kanji || w.kana)).map(w => w.kana), ['ござる']);
  assert.ok(!verbPool(vocab, 'pot').some(w => w.kana === 'ある' || w.kana === 'わかる'));
  assert.ok(verbPool(vocab, 'te', { upTo: 6 }).every(w => w.lesson <= 6));
  assert.ok(verbPool(vocab, 'te', { upTo: 6, only: true }).every(w => w.lesson === 6));
});

test('a session covers rare groups and favours the ones with mistakes', () => {
  const pool = [...'あいうえおかきくけこ'].map(c => v(c + 'る', 'ru')).concat(v('およぐ', 'u'), v('しぬ', 'u'));
  let seed = 1; const random = () => (seed = seed * 16807 % 2147483647) / 2147483647;
  const picked = pickVerbs(pool, 'te', {}, { size: 6, random });
  assert.equal(picked.length, 6);
  assert.equal(new Set(picked).size, 6);
  assert.ok(picked.some(w => w.kana === 'およぐ') && picked.some(w => w.kana === 'しぬ'));
  assert.equal(pickVerbs(pool.slice(0, 3), 'te').length, 3);
  assert.equal(pickVerbs(pool, 'te').length, SESSION_SIZE);
  assert.ok(groupWeight([0, 5]) > groupWeight(undefined) && groupWeight(undefined) > groupWeight([5, 0]));
});

test('answers are accepted in kana, with kanji or in romaji', () => {
  const yomu = v('よむ', 'u', '読む');
  for (const answer of ['よんで', '読んで', ' yonde ', 'YONDE', 'よんで。']) assert.ok(isCorrect(answer, yomu, 'te'), answer);
  for (const answer of ['よみて', 'よって', '', 'よむ']) assert.ok(!isCorrect(answer, yomu, 'te'), answer);
  assert.ok(isCorrect('さぼって', v('サボる', 'u'), 'te'));
  assert.ok(isCorrect('サボって', v('サボる', 'u'), 'te'));
  assert.equal(romajiToKana('katte'), 'かって');
  assert.equal(romajiToKana('benkyoushite'), 'べんきょうして');
  assert.equal(romajiToKana('konai'), 'こない');
  assert.equal(romajiToKana('shinde'), 'しんで');
  assert.equal(romajiToKana('matchimasu'), 'まっちます');
  assert.equal(romajiToKana('oyoida'), 'およいだ');
  assert.equal(romajiToKana('tsukatta'), 'つかった');
  assert.equal(romajiToKana('jugyou'), 'じゅぎょう');
  assert.equal(normalizeAnswer('kon\'ya'), 'こんや');
});

test('choices hold the right answer once plus three different wrong ones', () => {
  const verbs = [v('よむ', 'u', '読む'), v('たべる', 'ru', '食べる'), v('する', 'irr'), v('くる', 'irr', '来る'), v('べんきょうする', 'irr', '勉強する'), v('いく', 'u', '行く')];
  for (const verb of verbs) for (const { id } of FORMS) {
    const { options, correct } = choices(verb, id);
    assert.equal(options.length, 4, `${verb.kana} ${id}: ${options}`);
    assert.equal(new Set(options).size, 4);
    assert.equal(options.filter(o => o === correct).length, 1);
  }
  assert.equal(choices(verbs[0], 'te').correct, '読んで');
  assert.equal(choices(verbs[3], 'nai').correct, 'こない');
});

test('verbs route keeps a valid form and lesson only', () => {
  assert.deepEqual(routeView('#view=verbs'), { view: 'verbs' });
  assert.deepEqual(routeView(verbsHash({ form: 'te', lesson: 6 })), { view: 'verbs', form: 'te', lesson: 6 });
  assert.deepEqual(routeView('#view=verbs&form=nope&lesson=2'), { view: 'verbs' });
});
