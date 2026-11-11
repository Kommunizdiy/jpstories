// Тренажёр форм глаголов: словарная форма → нужная форма, ответ набирается или выбирается.
// Глаголы берутся из словаря (reference/vocab.tsv, типы u / ru / irr). Ошибки считаются по группам
// правила (например, «む・ぶ・ぬ → んで»), чтобы было видно, какую строку таблицы стоит повторить.
import { loadReference } from './reference.js';
import { verbsHash, VERB_FORMS } from './routing.js';

export const FORMS = [
  { id: 'masu', chip: 'ます', name: 'ます-форма', lesson: 3 },
  { id: 'te', chip: 'て', name: 'て-форма', lesson: 6 },
  { id: 'nai', chip: 'ない', name: 'ない-форма', lesson: 8 },
  { id: 'ta', chip: 'た', name: 'た-форма', lesson: 9 },
  { id: 'pot', chip: 'Потенциальная', name: 'Потенциальная форма', lesson: 13 },
  { id: 'vol', chip: 'Волитивная', name: 'Волитивная форма', lesson: 15 },
  { id: 'ba', chip: 'ば', name: 'ば-форма', lesson: 18 },
  { id: 'pass', chip: 'Пассив', name: 'Пассив', lesson: 21 },
  { id: 'caus', chip: 'Каузатив', name: 'Каузатив', lesson: 22 },
];
const formById = id => FORMS.find(f => f.id === id);
export const SESSION_SIZE = 10;
export const RETRY_GAP = 3;

// ——— Спряжение ———
const ROWS = { う: 'わいえお', く: 'かきけこ', ぐ: 'がぎげご', す: 'さしせそ', つ: 'たちてと', ぬ: 'なにねの', ぶ: 'ばびべぼ', む: 'まみめも', る: 'らりれろ' };
const TE = { う: 'って', つ: 'って', る: 'って', む: 'んで', ぶ: 'んで', ぬ: 'んで', く: 'いて', ぐ: 'いで', す: 'して' };
const RU_TAIL = { masu: 'ます', te: 'て', ta: 'た', nai: 'ない', pot: 'られる', vol: 'よう', ba: 'れば', pass: 'られる', caus: 'させる' };
// Для う-глаголов: [номер ряда (あ=0, い=1, え=2, お=3), окончание].
const U_TAIL = { masu: [1, 'ます'], nai: [0, 'ない'], pot: [2, 'る'], vol: [3, 'う'], ba: [2, 'ば'], pass: [0, 'れる'], caus: [0, 'せる'] };
const SURU = { masu: 'します', te: 'して', ta: 'した', nai: 'しない', pot: 'できる', vol: 'しよう', ba: 'すれば', pass: 'される', caus: 'させる' };
const KURU = { masu: 'きます', te: 'きて', ta: 'きた', nai: 'こない', pot: 'こられる', vol: 'こよう', ba: 'くれば', pass: 'こられる', caus: 'こさせる' };
const toTa = te => te.slice(0, -1) + (te.endsWith('で') ? 'だ' : 'た');

const isIku = v => v.type === 'u' && v.kana.endsWith('いく');
const isAru = v => v.type === 'u' && (v.kana === 'ある' || v.kana.endsWith('がある'));
const isHonorific = v => v.type === 'u' && /(いらっしゃ|おっしゃ|なさ|くださ|ござ)る$/.test(v.kana);

function inflect(text, verb, form) {
  if (verb.type === 'irr') {
    if (text.endsWith('する')) return text.slice(0, -2) + SURU[form];
    if (text.endsWith('来る')) return text.slice(0, -1) + KURU[form].slice(1);
    if (text.endsWith('くる')) return text.slice(0, -2) + KURU[form];
    throw new Error(`Неизвестный неправильный глагол: ${text}`);
  }
  const stem = text.slice(0, -1), last = text.at(-1);
  if (verb.type === 'ru') {
    if (last !== 'る') throw new Error(`る-глагол должен кончаться на る: ${text}`);
    return stem + RU_TAIL[form];
  }
  const row = ROWS[last];
  if (!row) throw new Error(`Не похоже на словарную форму: ${text}`);
  if (form === 'te' || form === 'ta') {
    const te = stem + (isIku(verb) ? 'って' : TE[last]);
    return form === 'te' ? te : toTa(te);
  }
  if (form === 'masu' && isHonorific(verb)) return stem + 'います';
  if (form === 'nai' && isAru(verb)) return text.slice(0, -2) + 'ない';
  const [index, tail] = U_TAIL[form];
  return stem + row[index] + tail;
}

// { kana, kanji } — kanji пустой, если слово пишется только каной.
export function conjugate(verb, form) {
  if (!formById(form)) throw new Error(`Неизвестная форма: ${form}`);
  return { kana: inflect(verb.kana, verb, form), kanji: verb.kanji ? inflect(verb.kanji, verb, form) : '' };
}

// ——— Группы правила ———
export function groupOf(verb, form) {
  if (verb.type === 'irr') return 'exc';
  if (form === 'te' || form === 'ta') {
    if (verb.type === 'ru') return 'ru';
    if (isIku(verb)) return 'exc';
    const last = verb.kana.at(-1);
    return 'うつる'.includes(last) ? 'utsuru' : 'むぶぬ'.includes(last) ? 'mubunu' : { く: 'ku', ぐ: 'gu', す: 'su' }[last];
  }
  if ((form === 'masu' && isHonorific(verb)) || (form === 'nai' && isAru(verb))) return 'exc';
  return verb.type;
}

const TE_RULES = [
  ['ru', 'る-глаголы', 'る → て', '食べる → 食べて'],
  ['utsuru', 'う・つ・る', '→ って', '買う → 買って · 待つ → 待って · 帰る → 帰って'],
  ['mubunu', 'む・ぶ・ぬ', '→ んで', '読む → 読んで · 遊ぶ → 遊んで · 死ぬ → 死んで'],
  ['ku', 'く', '→ いて', '書く → 書いて'],
  ['gu', 'ぐ', '→ いで', '泳ぐ → 泳いで'],
  ['su', 'す', '→ して', '話す → 話して'],
  ['exc', 'Исключения', 'наизусть', '行く → 行って · する → して · 来る → 来て（きて）'],
];
const TA_RULES = [
  ['ru', 'る-глаголы', 'る → た', '食べる → 食べた'],
  ['utsuru', 'う・つ・る', '→ った', '買う → 買った · 待つ → 待った · 帰る → 帰った'],
  ['mubunu', 'む・ぶ・ぬ', '→ んだ', '読む → 読んだ · 遊ぶ → 遊んだ · 死ぬ → 死んだ'],
  ['ku', 'く', '→ いた', '書く → 書いた'],
  ['gu', 'ぐ', '→ いだ', '泳ぐ → 泳いだ'],
  ['su', 'す', '→ した', '話す → 話した'],
  ['exc', 'Исключения', 'наизусть', '行く → 行った · する → した · 来る → 来た（きた）'],
];
const three = (u, uExample, ru, ruExample, exc) => [
  ['u', 'う-глаголы', u, uExample],
  ['ru', 'る-глаголы', ru, ruExample],
  ['exc', 'Исключения', 'наизусть', exc],
];
// Строки правила для каждой формы: [группа, название, правило, примеры].
export const RULES = {
  masu: three('ряд う → ряд い + ます', '飲む → 飲みます · 買う → 買います', 'る → ます', '食べる → 食べます', 'する → します · 来る → 来ます（きます） · いらっしゃる → いらっしゃいます (так же なさる, くださる, おっしゃる)'),
  te: TE_RULES,
  nai: three('ряд う → ряд あ + ない (う → わ)', '飲む → 飲まない · 買う → 買わない', 'る → ない', '食べる → 食べない', 'する → しない · 来る → 来ない（こない） · ある → ない'),
  ta: TA_RULES,
  pot: three('ряд う → ряд え + る', '飲む → 飲める · 買う → 買える', 'る → られる', '食べる → 食べられる', 'する → できる · 来る → 来られる（こられる）'),
  vol: three('ряд う → ряд お + う', '飲む → 飲もう · 買う → 買おう', 'る → よう', '食べる → 食べよう', 'する → しよう · 来る → 来よう（こよう）'),
  ba: three('ряд う → ряд え + ば', '飲む → 飲めば · 買う → 買えば', 'る → れば', '食べる → 食べれば', 'する → すれば · 来る → 来れば（くれば）'),
  pass: three('ряд う → ряд あ + れる (う → わ)', '飲む → 飲まれる · 言う → 言われる', 'る → られる', '食べる → 食べられる', 'する → される · 来る → 来られる（こられる）'),
  caus: three('ряд う → ряд あ + せる (う → わ)', '飲む → 飲ませる · 買う → 買わせる', 'る → させる', '食べる → 食べさせる', 'する → させる · 来る → 来させる（こさせる）'),
};
export const ruleOf = (verb, form) => RULES[form].find(([id]) => id === groupOf(verb, form));

// ——— Набор глаголов ———
// Глаголы состояния и вежливые глаголы не образуют «могу», «давай», пассив и каузатив — в этих формах их пропускаем.
const NO_ADVANCED = new Set(['ある', 'わかる', 'みえる', 'たりる', 'にあう', 'ちがう', 'かかる', 'にる', 'おそくなる', 'いらっしゃる', 'おっしゃる', 'めしあがる', 'なさる', 'くださる',
  'ごらんになる', 'おやすみになる', 'まいる', 'もうす', 'いたす', 'いただく', 'うかがう', 'おる', 'さしあげる', 'ぞんじる', 'はいけんする', 'おめにかかる', 'おせわになる']);
const ADVANCED = new Set(['pot', 'vol', 'pass', 'caus']);
function fits(verb, form) {
  if (verb.kana === 'ござる') return form === 'masu'; // живёт только как ございます
  if (!ADVANCED.has(form)) return true;
  if (verb.type === 'u' && verb.kana === 'いる') return false; // 要る
  return !NO_ADVANCED.has(verb.kana) && !verb.kana.includes('が');
}
const display = verb => verb.kanji || verb.kana;

export function verbPool(vocab, form, { upTo = 23, only = false } = {}) {
  const seen = new Set(), pool = [];
  for (const word of vocab) {
    if (!['u', 'ru', 'irr'].includes(word.type)) continue;
    if (only ? word.lesson !== upTo : word.lesson > upTo) continue;
    if (seen.has(display(word)) || !fits(word, form)) continue;
    try { conjugate(word, form); } catch { continue; } // строка словаря не похожа на глагол — пропускаем
    seen.add(display(word)); pool.push(word);
  }
  return pool;
}

// stats: { группа: [верно, неверно] } для одной формы. Группы, где ошибок больше (или ещё нет ответов), выпадают чаще.
export function groupWeight(score) {
  const [right = 0, wrong = 0] = score || [];
  return 1 + 2 * (right + wrong ? wrong / (right + wrong) : 0.5);
}
export function pickVerbs(pool, form, stats = {}, { size = SESSION_SIZE, random = Math.random } = {}) {
  const groups = new Map();
  for (const verb of pool) {
    const id = groupOf(verb, form);
    if (!groups.has(id)) groups.set(id, []);
    groups.get(id).push(verb);
  }
  const picked = [];
  while (picked.length < size && groups.size) {
    const ids = [...groups.keys()];
    const weights = ids.map(id => groupWeight(stats[id]));
    let point = random() * weights.reduce((a, b) => a + b, 0), index = 0;
    while (index < ids.length - 1 && point >= weights[index]) point -= weights[index++];
    const list = groups.get(ids[index]);
    picked.push(...list.splice(Math.floor(random() * list.length), 1));
    if (!list.length) groups.delete(ids[index]);
  }
  return picked;
}

// ——— Проверка ответа ———
const ROMAJI = (() => {
  const table = { a: 'あ', i: 'い', u: 'う', e: 'え', o: 'お', shi: 'し', chi: 'ち', tsu: 'つ', fu: 'ふ', ji: 'じ', wo: 'を', '-': 'ー' };
  const rows = { k: 'かきくけこ', s: 'さしすせそ', t: 'たちつてと', n: 'なにぬねの', h: 'はひふへほ', m: 'まみむめも', r: 'らりるれろ', g: 'がぎぐげご', z: 'ざじずぜぞ', d: 'だぢづでど', b: 'ばびぶべぼ', p: 'ぱぴぷぺぽ' };
  for (const [c, kana] of Object.entries(rows)) [...'aiueo'].forEach((v, i) => { table[c + v] = kana[i]; });
  Object.assign(table, { ya: 'や', yu: 'ゆ', yo: 'よ', wa: 'わ' });
  const small = { a: 'ゃ', u: 'ゅ', o: 'ょ' };
  for (const [c, kana] of Object.entries({ k: 'き', s: 'し', t: 'ち', n: 'に', h: 'ひ', m: 'み', r: 'り', g: 'ぎ', z: 'じ', d: 'ぢ', b: 'び', p: 'ぴ' })) for (const v of 'auo') table[`${c}y${v}`] = kana + small[v];
  for (const [c, kana] of Object.entries({ sh: 'し', ch: 'ち', j: 'じ' })) for (const v of 'auo') table[c + v] = kana + small[v];
  return table;
})();
export function romajiToKana(input) {
  const s = input.toLowerCase();
  let out = '';
  for (let i = 0; i < s.length;) {
    const c = s[i], next = s[i + 1];
    if (c === 'n' && (next === undefined || next === "'" || !'aiueoy'.includes(next))) { out += 'ん'; i += next === "'" ? 2 : 1; continue; }
    if ((c === next && /[a-z]/.test(c) && !'aiueo'.includes(c)) || (c === 't' && s.startsWith('ch', i + 1))) { out += 'っ'; i++; continue; }
    const piece = [3, 2, 1].map(n => s.slice(i, i + n)).find(p => ROMAJI[p]);
    if (piece) { out += ROMAJI[piece]; i += piece.length; } else { out += c; i++; }
  }
  return out;
}
const toHiragana = text => text.replace(/[ァ-ヶ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60));
export function normalizeAnswer(input) {
  let text = String(input).normalize('NFKC').replace(/[\s。、.]/g, '');
  if (/^[a-z'-]+$/i.test(text)) text = romajiToKana(text);
  return toHiragana(text);
}
export function isCorrect(input, verb, form) {
  const answer = normalizeAnswer(input), { kana, kanji } = conjugate(verb, form);
  return Boolean(answer) && (answer === toHiragana(kana) || (Boolean(kanji) && answer === toHiragana(kanji)));
}

// Варианты для режима «Выбрать»: верный ответ и три ошибки «по чужому правилу».
export function choices(verb, form, random = Math.random) {
  // 来る в вариантах пишем каной: 来ない и 来ます отличаются только чтением.
  const text = verb.type === 'irr' && verb.kana.endsWith('くる') ? verb.kana : display(verb);
  const correct = inflect(text, verb, form);
  const candidates = [];
  if (verb.type === 'irr') {
    const base = text.slice(0, -2);
    for (const stem of text.endsWith('する') ? ['し', 'さ', 'せ', 'す'] : ['き', 'こ', 'く']) candidates.push(base + stem + RU_TAIL[form]);
    candidates.push(inflect(text, { ...verb, type: 'u' }, form));
    if (U_TAIL[form]) for (const stem of text.endsWith('する') ? ['し', 'さ', 'せ'] : ['き', 'こ']) candidates.push(base + stem + U_TAIL[form][1]);
  } else {
    const stem = text.slice(0, -1), row = ROWS[text.at(-1)];
    if (form === 'te' || form === 'ta') {
      for (const ending of ['って', 'んで', 'いて', 'いで', 'して', 'て']) candidates.push(stem + (form === 'te' ? ending : toTa(ending)));
    } else {
      candidates.push(stem + RU_TAIL[form]);
      for (const kana of row) candidates.push(stem + kana + U_TAIL[form][1]);
      for (const kana of row) candidates.push(stem + kana + RU_TAIL[form]);
    }
  }
  const wrong = [...new Set(candidates)].filter(c => c !== correct);
  for (let i = wrong.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [wrong[i], wrong[j]] = [wrong[j], wrong[i]]; }
  const options = [correct, ...wrong.slice(0, 3)];
  for (let i = options.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [options[i], options[j]] = [options[j], options[i]]; }
  return { options, correct };
}

// ——— Страница и тренировка ———
const esc = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const store = {
  get(key, fallback) { try { const v = localStorage.getItem('jpstories-verbs:' + key); return v === null ? fallback : JSON.parse(v); } catch { return fallback; } },
  set(key, value) { try { localStorage.setItem('jpstories-verbs:' + key, JSON.stringify(value)); } catch {} },
};
function readStats() {
  const saved = store.get('stats', {});
  return saved && typeof saved === 'object' && !Array.isArray(saved) ? saved : {};
}
function record(form, group, right) {
  const stats = readStats();
  const score = (stats[form] ||= {})[group] ||= [0, 0];
  score[right ? 0 : 1]++;
  store.set('stats', stats);
}
const isWeak = score => Boolean(score) && score[0] + score[1] >= 3 && score[0] / (score[0] + score[1]) < 0.7;
const plural = (n, [one, few, many]) => (n % 10 === 1 && n % 100 !== 11 ? one : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? few : many);
const verbsWord = n => `${n} ${plural(n, ['глагол', 'глагола', 'глаголов'])}`;
const shown = ({ kana, kanji }) => kanji && kanji !== kana ? `${esc(kanji)}<span class="vb-yomi">（${esc(kana)}）</span>` : esc(kana);

let closeActive = null;
let vocab = null;

export async function showVerbs(container, route = {}) {
  container.hidden = false;
  document.title = 'Глаголы — 小さな物語';
  const head = '<div class="ref-head"><div class="eyebrow">ТРЕНАЖЁР · ФОРМЫ ГЛАГОЛОВ</div><h1>Глаголы</h1><p class="intro">Видите словарную форму — называете нужную. Таблицу проще запомнить, когда достаёшь её из головы, а не перечитываешь: десять глаголов за подход, а ошибки собираются по строкам правила.</p></div>';
  if (!vocab) {
    container.innerHTML = `${head}<p class="ref-status">Загружаем словарь…</p>`;
    try { vocab = (await loadReference()).vocab; } catch (error) {
      container.innerHTML = `${head}<div class="empty">Не удалось загрузить словарь. Обновите страницу или пересоберите сайт.<br><button type="button" class="ref-retry">Повторить</button></div>`;
      container.querySelector('.ref-retry').onclick = () => showVerbs(container, route);
      console.error('Загрузка словаря:', error);
      return;
    }
  }
  const state = {
    form: VERB_FORMS.includes(route.form) ? route.form : VERB_FORMS.includes(store.get('form')) ? store.get('form') : 'te',
    upTo: 0,
    only: store.get('only', false) === true,
    mode: store.get('mode') === 'pick' ? 'pick' : 'type',
  };
  const savedLesson = Number(store.get('upTo'));
  state.upTo = route.lesson || (Number.isInteger(savedLesson) && savedLesson >= 3 && savedLesson <= 23 ? savedLesson : Math.max(6, formById(state.form).lesson));
  if (route.lesson) state.only = false;

  const render = () => {
    const form = formById(state.form), stats = readStats()[state.form] || {};
    const pool = verbPool(vocab, state.form, state);
    const chip = (value, text, current, note = '') => `<button type="button" class="chip" data-v="${esc(value)}" aria-pressed="${String(value) === String(current)}">${esc(text)}${note ? `<span class="c">${esc(note)}</span>` : ''}</button>`;
    const rows = RULES[state.form].map(([id, label, rule, example]) => {
      const score = stats[id], total = score ? score[0] + score[1] : 0;
      const result = total ? `${score[0]} из ${total}${isWeak(score) ? ' · стоит повторить' : ''}` : '—';
      return `<tr class="${isWeak(score) ? 'weak' : ''}"><th scope="row" lang="ja">${esc(label)}</th><td lang="ja">${esc(rule)}</td><td lang="ja">${esc(example)}</td><td class="vb-score">${result}</td></tr>`;
    }).join('');
    container.innerHTML = `${head}<div class="ref-controls">
      <div class="ref-row" id="vb-forms" role="group" aria-label="Форма"><span class="ref-label">Форма</span>${FORMS.map(f => chip(f.id, f.chip, state.form, `ур. ${f.lesson}`)).join('')}</div>
      <div class="ref-row" id="vb-set"><span class="ref-label">Глаголы</span><label class="vb-select">до урока <select id="vb-upto" aria-label="Глаголы до урока">${Array.from({ length: 21 }, (_, i) => `<option value="${i + 3}"${i + 3 === state.upTo ? ' selected' : ''}>${i + 3}</option>`).join('')}</select></label>${chip('only', 'только этот урок', state.only ? 'only' : '')}</div>
      <div class="ref-row" id="vb-mode" role="group" aria-label="Ответ"><span class="ref-label">Ответ</span>${chip('type', 'Набрать', state.mode)}${chip('pick', 'Выбрать из четырёх', state.mode)}</div>
    </div>
    <div class="vb-go-row"><button type="button" class="fc-start vb-go"${pool.length ? '' : ' disabled'}>Начать · ${verbsWord(Math.min(SESSION_SIZE, pool.length))}</button><span class="count">В наборе: ${verbsWord(pool.length)}</span></div>
    ${form.lesson > state.upTo ? `<p class="ref-status">${esc(form.name)} появляется в уроке ${form.lesson} — тренируете её заранее на глаголах уроков 3–${state.upTo}.</p>` : ''}
    <details class="vb-rules" ${store.get('rules', true) ? 'open' : ''}><summary>Правило и ваши результаты · ${esc(form.name)}</summary>
      <div class="vb-table-wrap"><table class="vb-table"><thead><tr><th scope="col">Группа</th><th scope="col">Что меняется</th><th scope="col">Примеры</th><th scope="col">Ваш счёт</th></tr></thead><tbody>${rows}</tbody></table></div>
      <p class="ref-status">Набрать ответ можно хираганой, с кандзи или латиницей (yonde → よんで). «Ваш счёт» — ответы с первой попытки. Спрячьте таблицу перед тренировкой, если хотите проверить себя честно.${Object.keys(stats).length ? ' <button type="button" class="vb-reset">Сбросить результаты этой формы</button>' : ''}</p>
    </details>`;
    container.querySelectorAll('.ref-row').forEach(row => {
      const on = row.querySelector('.chip[aria-pressed="true"]');
      if (on && row.scrollWidth > row.clientWidth) row.scrollLeft = on.offsetLeft - row.offsetLeft - (row.clientWidth - on.offsetWidth) / 2;
    });
  };
  const update = () => {
    store.set('form', state.form); store.set('upTo', state.upTo); store.set('only', state.only); store.set('mode', state.mode);
    const url = new URL(location.href); url.hash = verbsHash({ form: state.form });
    history.replaceState(null, '', url);
    render();
  };
  container.onclick = event => {
    const chip = event.target.closest('.chip');
    if (chip) {
      const row = chip.closest('.ref-row').id;
      if (row === 'vb-forms') state.form = chip.dataset.v;
      else if (row === 'vb-set') state.only = !state.only;
      else state.mode = chip.dataset.v;
      update(); return;
    }
    if (event.target.closest('.vb-reset')) { const stats = readStats(); delete stats[state.form]; store.set('stats', stats); render(); return; }
    const go = event.target.closest('.vb-go');
    if (go) openDrill({ pool: verbPool(vocab, state.form, state), form: state.form, mode: state.mode, onClose: () => { render(); container.querySelector('.vb-go')?.focus(); } });
  };
  container.onchange = event => { if (event.target.id === 'vb-upto') { state.upTo = Number(event.target.value); update(); } };
  if (!container.dataset.vbReady) {
    container.dataset.vbReady = '1';
    container.addEventListener('toggle', event => { if (event.target.classList?.contains('vb-rules')) store.set('rules', event.target.open); }, true);
  }
  render();
}

export function closeDrill() { closeActive?.(); }

function openDrill({ pool, form, mode, onClose }) {
  if (!pool.length) return;
  closeDrill();
  const info = formById(form);
  let queue = [], total = 0, done = 0, missed = [], tally = {}, answered = false, options = null, graded = new Set();

  const root = document.createElement('div');
  root.className = 'fc-overlay vb-overlay';
  root.innerHTML = `<div class="fc-box" role="dialog" aria-modal="true" aria-labelledby="vb-title">
    <div class="fc-top"><div><div class="eyebrow">ГЛАГОЛЫ</div><h2 id="vb-title">${esc(info.name)}</h2></div>
    <button type="button" class="fc-close" aria-label="Закрыть тренажёр">×</button></div>
    <div class="fc-stage">
      <div class="vb-play">
        <div class="fc-progress"><span class="fc-bar"><i></i></span><span class="vb-count"></span></div>
        <div class="fc-card open vb-card">
          <div class="fc-ask">${esc(info.name)}</div>
          <div class="fc-jp vb-verb" lang="ja"></div><div class="fc-kana vb-kana" lang="ja"></div><div class="vb-mean"></div>
          <form class="vb-form" novalidate>
            <input class="vb-input" type="text" lang="ja" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="done" aria-label="${esc(info.name)} этого глагола" placeholder="каной, с кандзи или латиницей">
            <div class="vb-opts" role="group" aria-label="Варианты ответа"></div>
            <div class="vb-result" role="status" aria-live="polite" hidden></div>
            <button type="submit" class="vb-main"></button>
          </form>
        </div>
      </div>
      <div class="fc-done vb-done" hidden></div>
    </div></div>`;
  const q = selector => root.querySelector(selector);
  const input = q('.vb-input'), result = q('.vb-result'), main = q('.vb-main'), opts = q('.vb-opts');
  input.hidden = mode !== 'type'; opts.hidden = mode !== 'pick';

  const start = verbs => {
    queue = [...verbs]; total = queue.length; done = 0; missed = []; tally = {}; graded = new Set();
    q('.vb-play').hidden = false; q('.vb-done').hidden = true;
    showCard();
  };
  const showCard = () => {
    const verb = queue[0];
    if (!verb) { showDone(); return; }
    answered = false;
    q('.fc-bar i').style.width = `${Math.round(done / total * 100)}%`;
    q('.vb-count').textContent = `${done} из ${total}${missed.length ? ` · ошибок: ${missed.length}` : ''}`;
    q('.vb-verb').textContent = display(verb);
    q('.vb-kana').textContent = verb.kanji ? verb.kana : '';
    q('.vb-mean').textContent = verb.meaning;
    result.hidden = true; result.className = 'vb-result';
    if (mode === 'type') {
      input.value = ''; input.readOnly = false; main.hidden = false; main.textContent = 'Проверить';
      input.focus();
    } else {
      options = choices(verb, form);
      opts.replaceChildren(...options.options.map((text, i) => {
        const button = document.createElement('button');
        button.type = 'button'; button.className = 'vb-opt'; button.lang = 'ja'; button.dataset.i = i; button.textContent = text;
        return button;
      }));
      main.hidden = true;
      opts.firstChild.focus();
    }
  };
  const grade = given => {
    if (answered) return;
    const verb = queue.shift(), group = groupOf(verb, form), answer = conjugate(verb, form), rule = ruleOf(verb, form);
    const right = mode === 'type' ? isCorrect(given, verb, form) : given === options.correct;
    answered = true;
    // В статистику идёт только первая попытка с каждым глаголом.
    if (!graded.has(verb)) { graded.add(verb); (tally[group] ||= [0, 0])[right ? 0 : 1]++; record(form, group, right); }
    if (right) done++;
    else {
      if (!missed.includes(verb)) missed.push(verb);
      queue.splice(Math.min(RETRY_GAP, queue.length), 0, verb);
    }
    const yours = mode === 'type' && !right && String(given).trim() ? `<div class="vb-yours">Ваш ответ: <span lang="ja">${esc(normalizeAnswer(given))}</span></div>` : '';
    result.className = `vb-result ${right ? 'ok' : 'no'}`;
    result.innerHTML = `<b>${right ? 'Верно' : String(given).trim() ? 'Не так' : 'Ответ'}</b>${yours}<div class="vb-answer" lang="ja">${shown(answer)}</div><div class="vb-rule">${rule[0] === 'exc' ? 'Исключение — запомнить отдельно' : `<span lang="ja">${esc(rule[1])}</span>: <span lang="ja">${esc(rule[2])}</span>`}</div>`;
    result.hidden = false;
    q('.fc-bar i').style.width = `${Math.round(done / total * 100)}%`;
    q('.vb-count').textContent = `${done} из ${total}${missed.length ? ` · ошибок: ${missed.length}` : ''}`;
    main.hidden = false; main.textContent = queue.length ? 'Дальше →' : 'Итог →';
    if (mode === 'type') input.readOnly = true;
    else {
      opts.querySelectorAll('.vb-opt').forEach(button => {
        button.disabled = true;
        if (button.textContent === options.correct) button.classList.add('ok');
        else if (button.textContent === given) button.classList.add('no');
      });
      main.focus();
    }
  };
  const showDone = () => {
    const first = total - missed.length;
    const groups = RULES[form].filter(([id]) => tally[id]).map(([id, label, rule]) => {
      const [right, wrong] = tally[id];
      return `<li class="${wrong ? 'weak' : ''}"><span lang="ja">${esc(label)}${id === 'exc' ? '' : ` ${esc(rule)}`}</span><b>${right} из ${right + wrong}</b></li>`;
    }).join('');
    const list = missed.map(verb => `<li><span lang="ja">${esc(display(verb))} → ${shown(conjugate(verb, form))}</span> — ${esc(verb.meaning)}</li>`).join('');
    const box = q('.vb-done');
    box.innerHTML = `<div class="fc-jp" lang="ja">おつかれさま！</div>
      <p>С первого раза: ${first} из ${total}.${missed.length ? '' : ' Ни одной ошибки.'}</p>
      ${groups ? `<h3>По строкам правила</h3><ul class="vb-groups">${groups}</ul>` : ''}
      ${missed.length ? `<h3>Где ошиблись</h3><ul class="fc-missed">${list}</ul>` : ''}
      <div class="fc-actions">${missed.length ? `<button type="button" class="vb-again-missed">Повторить ошибки (${missed.length})</button>` : ''}
      <button type="button" class="fc-again vb-more">Ещё ${Math.min(SESSION_SIZE, pool.length)}</button><button type="button" class="fc-finish">Закрыть</button></div>`;
    q('.vb-play').hidden = true; box.hidden = false;
    box.querySelector('.vb-again-missed, .vb-more').focus();
  };

  q('.vb-form').addEventListener('submit', event => {
    event.preventDefault();
    if (answered) showCard(); else if (mode === 'type') grade(input.value);
  });
  root.addEventListener('click', event => {
    if (event.target === root || event.target.closest('.fc-close, .fc-finish')) { close(); return; }
    const option = event.target.closest('.vb-opt');
    if (option) { grade(option.textContent); return; }
    if (event.target.closest('.vb-again-missed')) start(missed);
    else if (event.target.closest('.vb-more')) start(pickVerbs(pool, form, readStats()[form]));
  });
  const onKey = event => {
    if (event.isComposing) return; // Enter внутри японской раскладки выбирает вариант ввода, а не отправляет ответ
    if (event.key === 'Escape') { event.preventDefault(); close(); return; }
    if (event.key === 'Tab') {
      const items = [...root.querySelectorAll('button:not([disabled]):not([hidden]), input:not([hidden])')].filter(node => node.offsetParent !== null);
      const index = items.indexOf(document.activeElement);
      if (event.shiftKey && index <= 0) { event.preventDefault(); items.at(-1)?.focus(); }
      else if (!event.shiftKey && index === items.length - 1) { event.preventDefault(); items[0]?.focus(); }
      return;
    }
    if (mode === 'pick' && !answered && /^[1-4]$/.test(event.key)) { opts.children[event.key - 1]?.click(); }
  };
  function close() {
    root.remove();
    document.removeEventListener('keydown', onKey, true);
    removeEventListener('hashchange', close);
    document.documentElement.classList.remove('fc-lock');
    closeActive = null;
    onClose?.();
  }
  closeActive = close;
  document.addEventListener('keydown', onKey, true);
  addEventListener('hashchange', close);
  document.documentElement.classList.add('fc-lock');
  document.body.append(root);
  start(pickVerbs(pool, form, readStats()[form]));
}
