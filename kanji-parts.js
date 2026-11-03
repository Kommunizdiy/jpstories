// Раздел «Части»: прогулка по частям кандзи и тренажёр для похожих кандзи (#view=parts).
// Данные — reference/kanji-parts.json, черты из KanjiVG. Загружаются при первом открытии раздела.
import { partsHash } from './routing.js';
import { loadReference } from './reference.js';

const range = (a, b) => { const out = []; for (let i = a; i <= b; i++) out.push(i); return out; };
// Тренажёр: части, смещение при разборе, ловушки «часть@кандзи». g: 0 — общая крыша, 1 — общая еда слева.
const K = {
  今: { m: 'сейчас', y: 'いま・コン', g: 0, parts: [['人', 'крыша', [0, 1], [0, -18]], ['ラ', 'как катакана ра', [2, 3], [0, 16]]], tell: 'Под крышей только ラ. Самый пустой низ в семействе.', mem: 'Сейчас под крышей почти ничего нет.', words: [['今', 'いま', 'сейчас'], ['今日', 'きょう', 'сегодня']], trap: ['二@会', 'マ@令', '口@合', '厶@会'] },
  令: { m: 'приказ', y: 'レイ', g: 0, parts: [['人', 'крыша', [0, 1], [0, -20]], ['丶', 'короткая черта', [2], [0, -4]], ['マ', 'как катакана ма', [3, 4], [0, 18]]], tell: 'Под крышей короткая черта и マ.', mem: 'Приказ сверху: マ стоит по стойке смирно.', words: [['命令', 'めいれい', 'приказ'], ['令和', 'れいわ', 'эра Рэйва']], trap: ['ラ@今', '厶@会', '一@合', '口@合'] },
  会: { m: 'встреча', y: 'あう・カイ', g: 0, parts: [['人', 'крыша', [0, 1], [0, -20]], ['二', 'две черты', [2, 3], [0, -3]], ['厶', 'как катакана му', [4, 5], [0, 18]]], tell: 'Под крышей 二 и ム. Две горизонтали подряд есть только здесь.', mem: 'Двое (二) встретились под одной крышей.', words: [['会う', 'あう', 'встретиться'], ['会社', 'かいしゃ', 'компания']], trap: ['ラ@今', 'マ@令', '一@合', '口@合'] },
  合: { m: 'подходить, совпадать', y: 'あう・ゴウ', g: 0, parts: [['人', 'крыша', [0, 1], [0, -20]], ['一', 'черта', [2], [0, -3]], ['口', 'рот, коробка', [3, 4, 5], [0, 18]]], tell: 'Под крышей 一 и закрытая коробка 口.', mem: 'Крышка подошла к коробке.', words: [['合う', 'あう', 'подходить'], ['試合', 'しあい', 'матч']], trap: ['丶@令', '二@会', '厶@会', '王@全'] },
  全: { m: 'весь, целиком', y: 'ゼン・すべて', g: 0, parts: [['人', 'крыша', [0, 1], [0, -18]], ['王', 'король', [2, 3, 4, 5], [0, 16]]], tell: 'Под крышей целый 王 и больше ничего.', mem: 'Король под крышей владеет всем.', words: [['全部', 'ぜんぶ', 'всё'], ['全然', 'ぜんぜん', 'совсем не']], trap: ['口@合', '良@食', '丷@金', '二@会'] },
  金: { m: 'деньги, золото', y: 'かね・キン', g: 0, parts: [['人', 'крыша', [0, 1], [0, -20]], ['王', 'король', [2, 3, 4, 7], [-14, 14]], ['丷', 'две точки', [5, 6], [36, 2]]], tell: 'Это 全 с двумя точками по бокам столба.', mem: 'Две точки это самородки золота в земле.', words: [['お金', 'おかね', 'деньги'], ['金曜日', 'きんようび', 'пятница']], trap: ['口@合', '一@合', '良@食', '厶@会'] },
  食: { m: 'есть, еда', y: 'たべる・ショク', g: 0, parts: [['人', 'крыша', [0, 1], [0, -22]], ['良', 'хороший', [2, 3, 4, 5, 6, 7, 8], [0, 14]]], tell: 'Под крышей 良: короткая черта сверху, коробка 日 и хвост снизу.', mem: 'Хорошее (良) под крышей: еда.', words: [['食べる', 'たべる', 'есть'], ['食堂', 'しょくどう', 'столовая']], trap: ['艮*', '口@合', '王@全', '卩@命'] },
  命: { m: 'жизнь, приказ', y: 'いのち・メイ', g: 0, parts: [['人', 'крыша', [0, 1], [0, -20]], ['一', 'черта', [2], [0, -8]], ['口', 'рот, коробка', [3, 4, 5], [-12, 12]], ['卩', 'печать', [6, 7], [14, 12]]], tell: 'Низ поделён пополам: слева 口, справа 卩.', mem: 'Рот (口) произносит приговор, печать (卩) его скрепляет.', words: [['命', 'いのち', 'жизнь'], ['運命', 'うんめい', 'судьба']], trap: ['丶@令', 'マ@令', '王@全'] },
  念: { m: 'мысль, чувство', y: 'ネン', g: 0, parts: [['人', 'крыша', [0, 1], [0, -22]], ['ラ', 'как катакана ра', [2, 3], [0, -6]], ['心', 'сердце', [4, 5, 6, 7], [0, 16]]], tell: 'Сверху целый 今, снизу сердце 心.', mem: 'То, что сейчас (今) на сердце (心).', words: [['残念', 'ざんねん', 'жаль'], ['記念', 'きねん', 'памятное событие']], see: '今', trap: ['マ@令', '二@会', '口@合', '厶@会'] },
  飲: { m: 'пить', y: 'のむ・イン', g: 1, parts: [['飠', '食 слева', range(0, 7), [-12, 0]], ['欠', 'открытый рот', range(8, 11), [14, 0]]], tell: 'Слева еда, справа 欠: человек открыл рот.', mem: 'Открыть рот рядом с едой и глотнуть.', words: [['飲む', 'のむ', 'пить'], ['飲み物', 'のみもの', 'напиток']], see: '食', trap: ['反@飯', '官@館', '良@食'] },
  飯: { m: 'рис, еда', y: 'ごはん・ハン', g: 1, parts: [['飠', '食 слева', range(0, 7), [-12, 0]], ['反', 'против', range(8, 11), [14, 0]]], tell: 'Слева еда, справа 反: скат 厂 и 又 под ним.', mem: 'Рис надо перевернуть (反) на сковороде.', words: [['ご飯', 'ごはん', 'рис, еда'], ['朝ご飯', 'あさごはん', 'завтрак']], see: '食', trap: ['欠@飲', '官@館', '良@食'] },
  館: { m: 'большое здание', y: 'カン', g: 1, parts: [['飠', '食 слева', range(0, 7), [-12, 0]], ['官', 'чиновник', range(8, 15), [14, 0]]], tell: 'Слева еда, справа 官 с крышей 宀.', mem: 'Дом, где кормят чиновников (官).', words: [['図書館', 'としょかん', 'библиотека'], ['映画館', 'えいがかん', 'кинотеатр']], see: '食', trap: ['欠@飲', '反@飯', '良@食'] },
};
const GROUPS = [{ name: 'Крыша 人', list: [...'今令会合全金食命念'] }, { name: 'Еда слева 飠', list: [...'飲飯館'] }];
const ALL = GROUPS.flatMap(g => g.list);
const TABS = [['walk', 'Гулять'], ['study', 'Разобрать'], ['build', 'Собрать'], ['tell', 'Отличить']];
const NS = 'http://www.w3.org/2000/svg';
const GUIDES = '<g class="kp-guides"><line x1="54.5" y1="0" x2="54.5" y2="109"/><line x1="0" y1="54.5" x2="109" y2="54.5"/></g>';
const motion = () => !matchMedia('(prefers-reduced-motion:reduce)').matches;
const shuffle = list => { const a = [...list]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const jp = text => `<span lang="ja">${text}</span>`;
const phone = () => matchMedia('(max-width:700px)').matches;
// На телефоне после действия подводим к результату; на компьютере страница и так видна целиком.
const bringIntoView = (el, block = 'nearest') => { if (el && phone()) el.scrollIntoView({ block, behavior: motion() ? 'smooth' : 'auto' }); };

let W = null, loading = null, DIRECT = {}, FAMILIES = [], VOCAB = [], root = null, view = null, bar = null;
function loadParts() {
  loading ||= Promise.all([
    fetch(new URL('./kanji-parts.json', import.meta.url)).then(res => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.json(); }),
    loadReference().then(data => data.vocab).catch(() => []),
  ]).then(([data, vocab]) => {
    W = data; VOCAB = vocab;
    for (const c in W) for (const [part] of W[c].p) if (part && W[part]) (DIRECT[part] ||= new Set()).add(c);
    FAMILIES = buildFamilies(W);
  }).catch(error => { loading = null; throw error; });
  return loading;
}

/* ---------- Семьи: чистые функции, проверяются в scripts/kanji-parts.test.mjs ---------- */
// 亻 и 人 — одна семья: вариант части считаем её полной формой.
export function familyKey(nodes, c) {
  const full = nodes[c]?.v;
  return full && nodes[full] ? full : c;
}
// Семья — кандзи Genki, где часть стоит напрямую. Минимум 4 кандзи, и у части есть смысл и больше одной черты.
export function buildFamilies(nodes) {
  const members = new Map();
  for (const c of Object.keys(nodes).filter(x => nodes[x].l)) {
    for (const [part] of nodes[c].p) {
      if (!part || !nodes[part]) continue;
      const key = familyKey(nodes, part);
      if (key === c) continue;
      if (!members.has(key)) members.set(key, new Set());
      members.get(key).add(c);
    }
  }
  const byLesson = (a, b) => nodes[a].l - nodes[b].l || nodes[a].sc - nodes[b].sc;
  return [...members].filter(([key, set]) => set.size >= 4 && nodes[key].m && !nodes[key].f && nodes[key].sc >= 2)
    .map(([key, set]) => ({ key, list: [...set].sort(byLesson) }))
    .sort((a, b) => b.list.length - a.list.length || a.key.localeCompare(b.key));
}
export function positionOf(box, whole) {
  const w = box.width / (whole.width || 1), h = box.height / (whole.height || 1);
  const cx = (box.x + box.width / 2 - whole.x) / (whole.width || 1), cy = (box.y + box.height / 2 - whole.y) / (whole.height || 1);
  if (w > .7 && h < .55) return cy < .45 ? 'top' : cy > .55 ? 'bottom' : 'inside';
  if (h > .6 && w < .6) return cx < .45 ? 'left' : cx > .55 ? 'right' : 'inside';
  const dx = cx - .5, dy = cy - .5;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < .12) return 'inside';
  return Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'top' : 'bottom');
}
// Порции по 7; слишком маленький хвост присоединяем к предыдущей.
export function portionsOf(list, size = 7) {
  const out = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  if (out.length > 1 && out.at(-1).length < 3) out.at(-2).push(...out.pop());
  return out;
}
const FORM_NAMES = { top: 'сверху', left: 'слева', right: 'справа', bottom: 'снизу', inside: 'внутри' };

/* ---------- Набор: 12 похожих кандзи или семья выбранной части ---------- */
let measure = null; const boxes = new Map();
function boxOf(c, strokes) {
  const id = c + ':' + strokes.join();
  if (boxes.has(id)) return boxes.get(id);
  if (!measure) {
    measure = document.createElementNS(NS, 'svg');
    measure.setAttribute('viewBox', '0 0 109 109');
    measure.style.cssText = 'position:absolute;width:109px;height:109px;left:-999px;top:0;visibility:hidden';
    document.body.append(measure);
  }
  measure.innerHTML = strokes.map(i => `<path d="${W[c].s[i]}"/>`).join('');
  const { x, y, width, height } = measure.getBBox();
  const box = { x, y, width, height };
  boxes.set(id, box);
  return box;
}
function autoOffset(c, strokes) {
  const b = boxOf(c, strokes), all = boxOf(c, W[c].s.map((_, i) => i));
  const dx = b.x + b.width / 2 - (all.x + all.width / 2), dy = b.y + b.height / 2 - (all.y + all.height / 2), len = Math.hypot(dx, dy);
  return len < 3 ? [0, 0] : [dx / len * 20, dy / len * 20];
}
function wordsFor(c) {
  return VOCAB.filter(w => w.kanji.includes(c)).sort((a, b) => a.kanji.length - b.kanji.length || a.lesson - b.lesson).slice(0, 2).map(w => [w.kanji, w.kana, w.meaning]);
}
const partGloss = label => { const g = gloss(label); return g.form ? g.t.replace('просто форма: ', '') : g.t; };
function positionInFamily(c, part) {
  const shared = W[c].p.filter(p => p[0] && familyKey(W, p[0]) === part);
  return positionOf(boxOf(c, shared.flatMap(p => p[1])), boxOf(c, W[c].s.map((_, i) => i)));
}
const entries = new Map();
function entryFor(c, part) {
  const id = (part || '') + '|' + c;
  if (entries.has(id)) return entries.get(id);
  const hand = K[c];
  let entry;
  if (!part) {
    entry = { c, m: hand.m, y: hand.y, tell: hand.tell, mem: hand.mem, words: hand.words, see: hand.see, trap: hand.trap, sharedFirst: hand.g === 0,
      parts: hand.parts.map((p, i) => ({ label: p[0], name: p[1], n: p[2], off: p[3], shared: i === 0, cls: 'kp-p' + i })) };
  } else {
    const named = W[c].p.map(p => ({ label: p[0], n: p[1], shared: !!p[0] && familyKey(W, p[0]) === part }));
    const ordered = [...named.filter(p => p.shared), ...named.filter(p => !p.shared)];
    let colour = 0;
    const parts = ordered.map(p => ({ ...p, name: p.label ? partGloss(p.label) : 'просто черты', off: autoOffset(c, p.n),
      cls: p.shared ? 'kp-p0' : p.label ? 'kp-w' + (colour++ % 4 + 1) : 'kp-pi' }));
    const shared = parts.find(p => p.shared), others = parts.filter(p => !p.shared);
    const rest = others.map(p => p.label ? `${jp(p.label)} (${p.name})` : 'отдельные черты').join(', ');
    entry = { c, m: W[c].m, y: [...(W[c].on || []).slice(0, 2), ...(W[c].kun || []).slice(0, 2)].join('・'),
      tell: hand ? hand.tell : `${jp(shared.label)} ${FORM_NAMES[positionInFamily(c, part)]}${rest ? `, ещё здесь: ${rest}` : ''}.`,
      mem: hand?.mem, words: hand ? hand.words : wordsFor(c), parts };
  }
  entry.buildable = entry.parts.some(p => !p.shared) && entry.parts.every(p => p.shared || p.label);
  entries.set(id, entry);
  return entry;
}
const randomLists = new Map();
let deck = null;
function resolveDeck(route) {
  const family = FAMILIES.find(f => f.key === route.part);
  if (!family) {
    deck = { id: 'similar', part: null, list: ALL, forms: [], portions: [], form: null, p: null };
    return deck;
  }
  const groups = {};
  for (const c of family.list) (groups[positionInFamily(c, family.key)] ||= []).push(c);
  const forms = Object.keys(FORM_NAMES).filter(id => groups[id]?.length >= 3).map(id => ({ id, count: groups[id].length }));
  const useForms = forms.length >= 2;
  const form = useForms && forms.some(f => f.id === route.form) ? route.form : null;
  const list = form ? groups[form] : family.list;
  const portions = portionsOf(list);
  const random = route.p === 'r' && list.length > 7;
  const index = /^\d+$/.test(route.p || '') && +route.p >= 1 && +route.p <= portions.length ? +route.p : 1;
  const id = `${family.key}|${form || ''}|${random ? 'r' : index}`;
  if (random && !randomLists.has(id)) randomLists.set(id, shuffle(list).slice(0, 7));
  deck = { id, part: family.key, family, form, forms: useForms ? forms : [], portions, p: random ? 'r' : index,
    list: random ? randomLists.get(id) : portions[index - 1], total: list.length };
  return deck;
}
const deckEntry = c => entryFor(c, deck.part);
const deckHash = (extra = {}) => partsHash({ part: deck.part, form: deck.form, p: deck.part && deck.p !== 1 ? deck.p : null, ...extra });
const lessonsLabel = list => { const ls = list.map(c => W[c].l), a = Math.min(...ls), b = Math.max(...ls); return a === b ? `урок ${a}` : `уроки ${a}–${b}`; };
function renderDeckBar(tab) {
  const familyLabel = f => `${f.key} ${W[f.key].m} (${f.list.length})`;
  const options = `<option value="">12 похожих кандзи</option>` + FAMILIES.map(f => `<option value="${f.key}" ${f.key === deck.part ? 'selected' : ''}>${familyLabel(f)}</option>`).join('');
  const chip = (href, text, on) => `<a class="kp-chip" href="${href}" ${on ? 'aria-current="true"' : ''}>${text}</a>`;
  let chips = '';
  if (deck.forms.length) chips += `<div class="kp-chips" aria-label="Положение части">${chip(partsHash({ tab, part: deck.part }), `Все ${deck.family.list.length}`, !deck.form)}${deck.forms.map(f => chip(partsHash({ tab, part: deck.part, form: f.id }), `${FORM_NAMES[f.id]} ${f.count}`, deck.form === f.id)).join('')}</div>`;
  if (deck.part && deck.portions.length > 1) chips += `<div class="kp-chips" aria-label="Порция">${deck.portions.map((list, i) => chip(partsHash({ tab, part: deck.part, form: deck.form, p: i ? i + 1 : null }), lessonsLabel(list), deck.p === i + 1)).join('')}${chip(partsHash({ tab, part: deck.part, form: deck.form, p: 'r' }), deck.p === 'r' ? 'Вперемешку, другие 7' : 'Вперемешку', deck.p === 'r').replace('class="kp-chip"', 'class="kp-chip" id="kp-random"')}</div>`;
  const current = [deck.form && FORM_NAMES[deck.form], deck.p === 'r' ? 'вперемешку' : deck.portions.length > 1 ? lessonsLabel(deck.list) : ''].filter(Boolean).join(', ') || 'все';
  bar.innerHTML = `<div class="kp-deck"><label for="kp-deck-sel">Набор</label><select id="kp-deck-sel">${options}</select></div>${chips ? `<details class="kp-more" ${phone() ? '' : 'open'}><summary>Показаны: ${current}</summary>${chips}</details>` : ''}`;
  const select = bar.querySelector('#kp-deck-sel');
  select.onchange = () => { refocusDeck = true; location.hash = partsHash({ tab, part: select.value || null }); };
  const random = bar.querySelector('#kp-random');
  if (random && deck.p === 'r') random.onclick = event => { event.preventDefault(); randomLists.delete(deck.id); showParts(root, { tab, part: deck.part, form: deck.form, p: 'r' }); };
  if (refocusDeck) { refocusDeck = false; select.focus({ preventScroll: true }); }
}
let refocusDeck = false;

export async function showParts(container, route) {
  root = container;
  const tab = TABS.some(t => t[0] === route.tab) ? route.tab : 'walk';
  container.innerHTML = `<div class="kp-top"><h1 class="kp-title">Части кандзи</h1>
    <p class="kp-lead" ${tab === 'walk' || route.part ? 'hidden' : ''}>Крыша 人 стоит на девяти кандзи отсюда, поэтому по ней их не отличить. Смотреть надо на то, что под ней. Серым показана общая часть, цветом та, что отличает. 合, 令, 命 и 念 не из Genki.</p>
    <p class="kp-lead" ${tab !== 'walk' && route.part ? '' : 'hidden'}>Серым показана выбранная часть, цветом то, что отличает кандзи друг от друга.</p></div>
    <nav class="kp-tabs" aria-label="Режимы" id="kp-tabs"></nav>
    <div id="kp-bar"></div>
    <div id="kp-view"><p>Загружаем кандзи…</p></div>
    <p class="kp-credit">Черты и порядок их написания: <a href="https://kanjivg.tagaini.net/" target="_blank" rel="noopener">KanjiVG</a>, Ulrich Apel и соавторы, лицензия CC BY-SA 3.0. Чтения и основа значений: KANJIDIC (EDRDG, CC BY-SA). Деление на части местами упрощено, подсказки для памяти придуманы как ассоциации. Русские значения написал и перевёл с английского Claude, со словарём они не сверялись.</p>`;
  view = container.querySelector('#kp-view'); bar = container.querySelector('#kp-bar');
  const tabs = container.querySelector('#kp-tabs');
  const drawTabs = () => { tabs.innerHTML = TABS.map(([id, name]) => `<a href="${id === 'walk' || !deck?.part ? partsHash({ tab: id }) : deckHash({ tab: id })}" ${id === tab ? 'aria-current="page"' : ''}>${name}</a>`).join(''); };
  drawTabs();
  try { await loadParts(); } catch { if (root === container) view.innerHTML = '<p class="kp-msg kp-bad">Данные не загрузились. Обновите страницу.</p>'; return; }
  if (view !== container.querySelector('#kp-view')) return;
  if (tab === 'walk') { renderWalk(route.k); return; }
  resolveDeck(route);
  drawTabs(); renderDeckBar(tab);
  if (tab === 'study') renderStudy(route.k);
  if (tab === 'build') startBuild();
  if (tab === 'tell') startTell();
}

/* ---------- Общие рисунки ---------- */
function entrySVG(entry, { guides = false, plain = false } = {}) {
  const groups = entry.parts.map((p, i) => `<g class="kp-part ${plain ? 'kp-pi' : p.cls}" data-p="${i}">${p.n.map(n => `<path data-n="${n}" d="${W[entry.c].s[n]}"/>`).join('')}</g>`).join('');
  return `<svg class="kp-k" viewBox="0 0 109 109" role="img" aria-label="${entry.c}">${guides ? GUIDES : ''}<g class="kp-bg">${groups}</g></svg>`;
}
function partSVG(strokes, cls = 'kp-pi') {
  return `<svg class="kp-k kp-crop" viewBox="0 0 109 109" aria-hidden="true"><g class="${cls}">${strokes.map(d => `<path vector-effect="non-scaling-stroke" style="stroke-width:3px" d="${d}"/>`).join('')}</g></svg>`;
}
function cropAll(el) {
  el.querySelectorAll('svg.kp-crop').forEach(svg => {
    let b; try { b = svg.querySelector('g').getBBox(); } catch { return; }
    if (!b.width && !b.height) return;
    const side = Math.max(b.width, b.height, 34) + 14;
    svg.setAttribute('viewBox', `${b.x + b.width / 2 - side / 2} ${b.y + b.height / 2 - side / 2} ${side} ${side}`);
  });
}

/* ---------- Разобрать ---------- */
const studyCurrent = new Map();
let apart = false, studyEntry = null;
function renderStudy(k) {
  const fallback = deck.part ? deck.list[0] : '食';
  const previous = studyCurrent.get(deck.id);
  const cur = deck.list.includes(k) ? k : previous || fallback;
  if (cur !== previous) apart = false;
  studyCurrent.set(deck.id, cur);
  const d = studyEntry = deckEntry(cur);
  const row = list => `<div class="kp-row">${list.map(c => `<a class="kp-pick" href="${deckHash({ tab: 'study', k: c })}" ${c === cur ? 'aria-current="true"' : ''} aria-label="${c}, ${deckEntry(c).m}">${entrySVG(deckEntry(c))}</a>`).join('')}</div>`;
  const strip = deck.part
    ? `<div>${row(deck.list)}</div>`
    : GROUPS.map(g => `<div><p class="kp-label">${g.name}</p>${row(g.list)}</div>`).join('');
  view.innerHTML = `<div class="kp-stack">
    <div class="kp-strip">${strip}</div>
    <div class="kp-two">
      <div><div class="kp-sq" id="kp-big">${entrySVG(d, { guides: true })}</div>
        <div class="kp-ctrl"><button class="kp-btn kp-main" id="kp-split">${apart ? 'Собрать обратно' : 'Разобрать на части'}</button><button class="kp-btn" id="kp-order">Черты по порядку</button><a class="kp-btn" href="${partsHash({ k: cur })}">Гулять от ${jp(cur)}</a></div></div>
      <div><div class="kp-head"><b lang="ja">${cur}</b><span>${d.m}</span></div><div class="kp-yomi" lang="ja">${d.y}</div>
        <ul class="kp-partlist">${d.parts.map((p, i) => `<li><div class="kp-mini">${partSVG(p.n.map(n => W[cur].s[n]), p.cls)}</div><div>${p.label ? `<strong lang="ja">${p.label}</strong>` : ''}<small>${p.name}</small>${i === 0 && d.see ? ` <a href="${partsHash({ tab: 'study', k: d.see })}">открыть ${jp(d.see)}</a>` : ''}</div></li>`).join('')}</ul>
        <p class="kp-tell">${d.tell}${d.mem ? `<i>Для памяти: ${d.mem}</i>` : ''}</p>
        ${d.words.length ? `<ul class="kp-words">${d.words.map(w => `<li><b lang="ja">${w[0]}</b><span lang="ja">${w[1]}</span>${w[2]}</li>`).join('')}</ul>` : ''}
      </div></div></div>`;
  cropAll(view); applyApart();
  if (k) bringIntoView(view.querySelector('#kp-big'));
  view.querySelector('#kp-split').onclick = e => { apart = !apart; e.target.textContent = apart ? 'Собрать обратно' : 'Разобрать на части'; applyApart(); };
  view.querySelector('#kp-order').onclick = playOrder;
}
function applyApart() {
  const big = view.querySelector('#kp-big'); if (!big) return;
  big.querySelector('.kp-bg').style.transform = apart ? 'scale(.74)' : '';
  big.querySelectorAll('.kp-part').forEach(g => { const p = studyEntry.parts[+g.dataset.p]; g.style.transform = apart ? `translate(${p.off[0]}px,${p.off[1]}px)` : ''; });
}
function playOrder() {
  if (apart) { apart = false; applyApart(); view.querySelector('#kp-split').textContent = 'Разобрать на части'; }
  drawStrokes(view.querySelector('#kp-big'));
}
// Рисует черты кандзи по порядку написания. Повторное нажатие начинает сначала.
function drawStrokes(square) {
  if (!motion()) return;
  const paths = [...square.querySelectorAll('path[data-n]')].sort((a, b) => a.dataset.n - b.dataset.n);
  paths.forEach((p, i) => {
    p.getAnimations().forEach(old => old.cancel());
    p.setAttribute('pathLength', '1'); p.style.strokeDasharray = '1';
    const an = p.animate([{ strokeDashoffset: 1, opacity: 0 }, { strokeDashoffset: 1, opacity: 1, offset: .01 }, { strokeDashoffset: 0, opacity: 1 }], { duration: 420, delay: i * 460, fill: 'backwards', easing: 'ease-in-out' });
    an.onfinish = () => { p.style.strokeDasharray = ''; p.removeAttribute('pathLength'); };
  });
}

/* ---------- Собрать ---------- */
let queue = [], doneSet = new Set(), misses = 0, st = null, buildDeck = null, buildList = [];
function handTrap(key) {
  if (key === '艮*') return { label: '艮', strokes: range(3, 8).map(i => W['食'].s[i]), why: `Это ${jp('艮')}, то есть ${jp('良')} без короткой верхней черты. В ${jp('食')} она есть.` };
  const [label, from] = key.split('@');
  return { label, from, strokes: K[from].parts.find(p => p[0] === label)[2].map(i => W[from].s[i]) };
}
// Ловушки: части соседей по порции, потом по всей семье, потом других кандзи Genki.
function autoTraps(entry) {
  const need = new Set(entry.parts.map(p => p.label));
  const out = [], seen = new Set();
  const add = c => {
    for (const [label, strokes] of W[c].p) {
      if (out.length >= 4) return;
      if (!label || need.has(label) || seen.has(label) || (deck.part && familyKey(W, label) === deck.part)) continue;
      seen.add(label);
      out.push({ label, from: c, strokes: strokes.map(i => W[c].s[i]) });
    }
  };
  shuffle(deck.list).filter(c => c !== entry.c).forEach(add);
  if (out.length < 3) shuffle(deck.family.list).filter(c => c !== entry.c).forEach(add);
  if (out.length < 3) shuffle(Object.keys(W).filter(c => W[c].l && c !== entry.c)).slice(0, 30).forEach(add);
  return out;
}
const trapMeaning = c => W[c].m || K[c]?.m || '';
function hanaPath() {
  let d = ''; const n = 260;
  for (let i = 0; i <= n; i++) {
    const t = i / n * Math.PI * 5.2, r = (i < n * .5 ? 26 : 17) + (i < n * .5 ? 5 * Math.sin(t * 6) : -i / n * 14);
    d += (i ? 'L' : 'M') + (50 + r * Math.cos(t - 1.2)).toFixed(1) + ' ' + (50 + r * Math.sin(t - 1.2)).toFixed(1);
  }
  return d;
}
function startBuild() {
  if (buildDeck !== deck.id) {
    buildDeck = deck.id; misses = 0; doneSet = new Set();
    buildList = deck.list.filter(c => deckEntry(c).buildable);
    queue = shuffle(buildList);
  }
  if (!buildList.length) {
    view.innerHTML = '<p class="kp-tell">В этой порции нечего собирать: у этих кандзи нет других частей с названием. Выберите другую порцию или вкладку «Разобрать».</p>';
    return;
  }
  newBuild();
}
function newBuild() {
  if (!queue.length) { renderBuildEnd(); return; }
  const c = queue[0], d = deckEntry(c);
  const shared = d.parts.filter(p => p.shared && (deck.part || d.sharedFirst));
  const need = d.parts.map((p, i) => ({ i, label: p.label, cls: p.cls, shared: shared.includes(p), strokes: p.n.map(n => W[c].s[n]) })).filter(p => !p.shared);
  const traps = (deck.part ? autoTraps(d) : d.trap.map(handTrap));
  st = { c, placed: new Set(), errors: 0, total: need.length, tiles: shuffle([...need.map(n => ({ ...n, ok: true })), ...traps.map(t => ({ ...t, ok: false }))]) };
  view.innerHTML = `<div class="kp-two kp-building">
    <div class="kp-stick"><div class="kp-sq" id="kp-canvas"><svg class="kp-k" viewBox="0 0 109 109" role="img" aria-label="Поле сборки">${GUIDES}<g id="kp-ghost" class="kp-ghost" style="display:none">${W[c].s.map(p => `<path d="${p}"/>`).join('')}</g><g id="kp-placed">${shared.map(p => `<g class="kp-p0">${p.n.map(n => `<path d="${W[c].s[n]}"/>`).join('')}</g>`).join('')}</g></svg></div>
      <div class="kp-ctrl"><button class="kp-btn" id="kp-hint">Показать контур</button></div></div>
    <div><p class="kp-score">Собрано ${doneSet.size} из ${buildList.length}${misses ? ` · ошибок ${misses}` : ''}</p>
      <h2 class="kp-ask">${d.m}</h2><div class="kp-yomi" lang="ja">${d.y}</div>
      <p class="kp-do">${shared.length ? `${jp(shared[0].label)} уже стоит. Выберите, что ещё здесь есть.` : 'Выберите все части этого кандзи.'}</p>
      <div class="kp-tiles">${st.tiles.map((t, i) => `<button class="kp-tile" data-i="${i}" aria-label="Часть ${t.label}">${partSVG(t.strokes)}</button>`).join('')}</div>
      <div class="kp-msg" id="kp-bmsg" role="status">Нажмите на часть, и она встанет на своё место.</div>
    </div></div>`;
  cropAll(view);
  view.querySelector('#kp-hint').onclick = () => { const g = view.querySelector('#kp-ghost'), on = g.style.display === 'none'; g.style.display = on ? '' : 'none'; if (on) st.errors++; };
  view.querySelectorAll('.kp-tile').forEach(b => { b.onclick = () => pickTile(b); });
}
function pickTile(b) {
  const t = st.tiles[+b.dataset.i], msg = view.querySelector('#kp-bmsg');
  if (t.ok) {
    b.disabled = true; st.placed.add(t.i);
    const g = document.createElementNS(NS, 'g'); g.setAttribute('class', t.cls);
    g.innerHTML = t.strokes.map(x => `<path d="${x}"/>`).join('');
    view.querySelector('#kp-placed').append(g);
    msg.className = 'kp-msg'; msg.innerHTML = `<b lang="ja">${t.label}</b> на месте.`;
    if (st.placed.size === st.total) finishBuild();
  } else {
    st.errors++; misses++; b.classList.remove('kp-no'); void b.offsetWidth; b.classList.add('kp-no'); b.disabled = true;
    msg.className = 'kp-msg kp-bad';
    msg.innerHTML = t.why || `<b lang="ja">${t.label}</b> из кандзи <b lang="ja">${t.from}</b> (${trapMeaning(t.from)}). Здесь нужна другая часть.`;
  }
}
function finishBuild() {
  const { c, errors } = st, d = deckEntry(c);
  queue.shift();
  if (errors) queue.splice(Math.min(3, queue.length), 0, c); else doneSet.add(c);
  if (!errors) {
    const h = document.createElementNS(NS, 'svg'); h.setAttribute('class', 'kp-hana'); h.setAttribute('viewBox', '0 0 100 100');
    h.innerHTML = `<path pathLength="1" d="${hanaPath()}"/>`; view.querySelector('#kp-canvas').append(h);
  }
  view.querySelectorAll('.kp-tile').forEach(t => { t.disabled = true; });
  view.querySelector('#kp-hint').hidden = true;
  const msg = view.querySelector('#kp-bmsg'); msg.className = 'kp-msg kp-good';
  const word = d.words[0];
  msg.innerHTML = `<b lang="ja">${c}</b> ${d.m}. ${d.tell}${errors ? ' Этот кандзи скоро вернётся ещё раз.' : ''}${word ? `<br><b lang="ja">${word[0]}</b> ${jp(word[1])}, ${word[2]}` : ''}`;
  const next = document.createElement('button'); next.className = 'kp-btn kp-main'; next.textContent = queue.length ? 'Следующий' : 'Готово';
  next.onclick = () => { newBuild(); bringIntoView(view, 'start'); };
  msg.after(next); next.focus({ preventScroll: true }); bringIntoView(next);
}
function renderBuildEnd() {
  const nextPortion = deck.part && typeof deck.p === 'number' && deck.p < deck.portions.length ? deck.p + 1 : null;
  view.innerHTML = `<div class="kp-tell"><h2 class="kp-ask">Все ${buildList.length} собраны</h2><p>Ошибок за круг: ${misses}. Кандзи с ошибками возвращались, пока не собрались чисто.</p><div class="kp-ctrl">${nextPortion ? `<a class="kp-btn kp-main" href="${partsHash({ tab: 'build', part: deck.part, form: deck.form, p: nextPortion })}">Следующая порция</a>` : ''}<button class="kp-btn ${nextPortion ? '' : 'kp-main'}" id="kp-again">Ещё раз</button></div></div>`;
  view.querySelector('#kp-again').onclick = () => { queue = shuffle(buildList); doneSet = new Set(); misses = 0; newBuild(); };
}

/* ---------- Отличить ---------- */
let tellQueue = [], right = 0, total = 0, tellDeck = null;
function startTell() {
  if (tellDeck !== deck.id) { tellDeck = deck.id; tellQueue = []; right = 0; total = 0; }
  newTell();
}
function newTell() {
  if (!tellQueue.length) tellQueue = shuffle(deck.list);
  const c = tellQueue.shift(), d = deckEntry(c);
  let pool;
  if (deck.part) {
    pool = deck.list.filter(x => x !== c);
    if (pool.length < 3) pool = [...pool, ...shuffle(deck.family.list.filter(x => x !== c && !pool.includes(x)))];
  } else pool = (K[c].g === 0 ? GROUPS[0].list : [...GROUPS[1].list, '食']).filter(x => x !== c);
  const options = shuffle([c, ...shuffle(pool).slice(0, 3)]);
  // В ответах могут быть кандзи не из порции, рисуем их как записи той же семьи.
  view.innerHTML = `<div class="kp-two">
    <div class="kp-tell kp-center"><h2 class="kp-ask">${d.m}</h2><div class="kp-yomi" lang="ja">${d.y}</div></div>
    <div><p class="kp-score">Верно ${right} из ${total}</p><p class="kp-do">Какой кандзи это значит?</p>
      <div class="kp-opts">${options.map(o => `<button class="kp-opt" data-c="${o}" aria-label="${o}">${entrySVG(deckEntry(o), { plain: true })}</button>`).join('')}</div>
      <div id="kp-tres"></div></div></div>`;
  view.querySelectorAll('.kp-opt').forEach(b => {
    b.onclick = () => {
      const pick = b.dataset.c, ok = pick === c; total++;
      if (ok) right++; else tellQueue.splice(Math.min(3, tellQueue.length), 0, c);
      view.querySelectorAll('.kp-opt').forEach(x => { x.disabled = true; if (x.dataset.c === c) x.classList.add('kp-right'); });
      if (!ok) b.classList.add('kp-wrong');
      view.querySelector('.kp-score').textContent = `Верно ${right} из ${total}`;
      const fig = x => `<figure><div class="kp-sq">${entrySVG(deckEntry(x), { guides: true })}</div><figcaption><b lang="ja">${x}</b> ${deckEntry(x).m}</figcaption></figure>`;
      view.querySelector('#kp-tres').innerHTML = `<div class="kp-msg ${ok ? 'kp-good' : 'kp-bad'}" role="status">${ok ? `Да, <b lang="ja">${c}</b>, ${d.m}.` : `Это был <b lang="ja">${c}</b>, а выбран <b lang="ja">${pick}</b>.`} ${d.tell}${ok ? '' : ` У ${jp(pick)}: ${deckEntry(pick).tell}`}</div>${ok ? '' : `<div class="kp-versus">${fig(pick)}${fig(c)}</div>`}<button class="kp-btn kp-main" id="kp-tnext">Следующий</button>`;
      const next = view.querySelector('#kp-tnext'); next.onclick = () => { newTell(); bringIntoView(view, 'start'); };
      next.focus({ preventScroll: true }); bringIntoView(next);
    };
  });
}

/* ---------- Гулять ---------- */
let walkCur = '食', trail = [], showAll = false;
function deepUses(c) {
  const seen = new Set(), stack = [...(DIRECT[c] || [])];
  while (stack.length) { const x = stack.pop(); if (seen.has(x)) continue; seen.add(x); stack.push(...(DIRECT[x] || [])); }
  return [...seen].filter(x => W[x].j);
}
function gloss(c) {
  const n = W[c];
  if (n.m) return { t: n.m };
  if (n.f) return { t: n.p.length ? n.f : 'просто форма: ' + n.f, form: true };
  return { t: 'значения в словаре нет', form: true };
}
let walkJump = false;
const go = c => { walkJump = true; location.hash = partsHash({ k: c }); };
function nodeSVG(c) {
  const n = W[c];
  const inner = n.p.length
    ? n.p.map((p, i) => `<g class="kp-part ${p[0] ? 'kp-w' + (i % 4 + 1) : 'kp-w0'}" data-i="${i}">${p[1].map(k => `<path data-n="${k}" d="${n.s[k]}"/>`).join('')}${p[0] ? p[1].map(k => `<path class="kp-hit" d="${n.s[k]}"/>`).join('') : ''}</g>`).join('')
    : `<g class="kp-pi">${n.s.map((d, k) => `<path data-n="${k}" d="${d}"/>`).join('')}</g>`;
  return `<svg class="kp-k" viewBox="0 0 109 109" role="img" aria-label="${c}">${GUIDES}<g>${inner}</g></svg>`;
}
function treeHTML(c, path, top) {
  const n = W[c], rows = [], first = new Map();
  n.p.forEach((p, i) => {
    if (p[0] && first.has(p[0])) { first.get(p[0]).x++; return; }
    const row = { p, i, x: 1 }; if (p[0]) first.set(p[0], row); rows.push(row);
  });
  return rows.map(({ p, i, x }) => {
    const cls = top ? (p[0] ? 'kp-w' + (i % 4 + 1) : 'kp-w0') : 'kp-pi';
    const mark = top ? `data-i="${i}"` : '';
    const strokes = p[1].map(k => n.s[k]);
    if (!p[0]) return `<li><div class="kp-node" ${mark}><div class="kp-mini">${partSVG(strokes, cls)}</div><div><small>просто черты, своего значения нет</small></div></div></li>`;
    const kids = !path.includes(p[0]) && W[p[0]] && W[p[0]].p.length ? `<ul>${treeHTML(p[0], [...path, p[0]], false)}</ul>` : '';
    return `<li><a class="kp-node" href="${partsHash({ k: p[0] })}" ${mark}><div class="kp-mini">${partSVG(strokes, cls)}</div><div><strong lang="ja">${p[0]}</strong>${x > 1 ? `<em>×${x}</em> ` : ''}<small>${gloss(p[0]).t}</small></div></a>${kids}</li>`;
  }).join('');
}
function renderWalk(k) {
  const unknown = k && !W[k] ? k : null;
  if (k && W[k] && k !== walkCur) { walkCur = k; showAll = false; }
  const c = walkCur, n = W[c], g = gloss(c);
  if (trail.at(-1) !== c) { const i = trail.indexOf(c); if (i >= 0) trail = trail.slice(0, i + 1); else trail.push(c); trail = trail.slice(-12); }
  const variants = Object.keys(W).filter(x => W[x].v === c);
  // У 食 считаем и форму 飠: иначе 飲 и 飯 не попали бы в список.
  const uses = [...new Set([c, ...variants].flatMap(deepUses))].filter(x => x !== c && !variants.includes(x));
  const inGenki = uses.filter(x => W[x].l).sort((a, b) => W[a].l - W[b].l || W[a].sc - W[b].sc);
  const others = uses.filter(x => !W[x].l).sort((a, b) => W[a].sc - W[b].sc);
  const LIMIT = 48, visible = showAll ? others : others.slice(0, LIMIT);
  // Подсказка чтения: доля кандзи с этой частью, которые читаются одинаково.
  let hint = '';
  if (n.sc >= 2 && uses.length >= 3) {
    const count = {};
    uses.forEach(x => (W[x].on || []).forEach(r => (count[r] ||= []).push(x)));
    const best = Object.entries(count).sort((a, b) => b[1].length - a[1].length)[0];
    if (best && best[1].length >= 3 && best[1].length / uses.length >= .5) hint = `<p class="kp-hintr">Может подсказывать чтение: <b lang="ja">${best[0]}</b> у ${best[1].length} из ${uses.length} кандзи с этой частью.<small>Это подсчёт по словарю. Совпадение тоже возможно.</small></p>`;
  }
  const trainKey = FAMILIES.find(f => f.key === familyKey(W, c))?.key;
  const trainForm = n.v && n.m ? { слева: 'left', справа: 'right', сверху: 'top', снизу: 'bottom' }[n.m.split(' ').at(-1)] : null;
  const lessons = {};
  for (const x in W) if (W[x].l) (lessons[W[x].l] ||= []).push(x);
  const useLink = (x, pale) => `<a class="kp-use ${pale ? 'kp-pale' : ''}" href="${partsHash({ k: x })}"><b lang="ja">${x}</b>${pale ? '' : `<small>${W[x].m || ''}</small>`}</a>`;
  view.innerHTML = `<form class="kp-bar" id="kp-search"><input id="kp-q" type="text" placeholder="Вставьте или наберите кандзи" aria-label="Кандзи или часть" autocomplete="off" lang="ja"><button class="kp-btn">Найти</button><button class="kp-btn" type="button" id="kp-rnd">Случайный из Genki</button></form>
    ${unknown ? `<p class="kp-msg kp-bad">Кандзи ${jp(unknown)} в этом наборе нет. Здесь кандзи Genki, остальные дзёё и их части.</p>` : ''}
    <details class="kp-lessons"><summary>Все кандзи Genki по урокам</summary><div class="kp-gl">${Object.entries(lessons).map(([l, list]) => `<span>Урок ${l}</span><div class="kp-row kp-tight">${list.map(x => `<a class="kp-ch" lang="ja" href="${partsHash({ k: x })}">${x}</a>`).join('')}</div>`).join('')}</div></details>
    <div class="kp-trail" aria-label="Пройденный путь">${trail.map((x, i) => `${i ? '<span aria-hidden="true">›</span>' : ''}<a href="${partsHash({ k: x })}" aria-label="${x}" ${x === c ? 'aria-current="true"' : ''}>${partSVG(W[x].s)}</a>`).join('')}</div>
    <div class="kp-walk">
      <div class="kp-wfig"><div class="kp-sq" id="kp-wbig">${nodeSVG(c)}</div><div class="kp-ctrl"><button class="kp-btn" id="kp-worder">Черты по порядку</button></div>${n.p.some(p => p[0]) ? '<p class="kp-note">Нажмите на часть, чтобы перейти к ней.</p>' : ''}</div>
      <div class="kp-winfo">
        <div class="kp-head">${n.j ? `<b lang="ja">${c}</b>` : ''}<span class="${g.form ? 'kp-form' : ''}">${g.t}</span></div>
        <div class="kp-yomi" lang="ja">${[...(n.on || []), ...(n.kun || [])].join('・')}</div>
        <div class="kp-tags">${n.l ? `<span class="kp-tag kp-g">Genki, урок ${n.l}</span>` : n.j ? '<span class="kp-tag">вне Genki</span>' : '<span class="kp-tag">только как часть</span>'}<span class="kp-tag">черт: ${n.sc}</span>${K[c] ? `<a href="${partsHash({ tab: 'study', k: c })}">Открыть в тренажёре</a>` : ''}</div>
        ${trainKey ? `<div class="kp-ctrl"><a class="kp-btn" href="${partsHash({ tab: 'study', part: trainKey, form: trainForm })}">Тренировать эту часть</a></div>` : ''}
        ${n.t ? `<p class="kp-tell">${n.t}</p>` : ''}
        ${n.v ? `<p class="kp-do">Это форма знака ${W[n.v] ? `<a class="kp-big" lang="ja" href="${partsHash({ k: n.v })}">${n.v}</a>` : `<b lang="ja">${n.v}</b>`}</p>` : ''}
        ${variants.length ? `<p class="kp-do">Его другие формы: ${variants.map(x => `<a class="kp-big" lang="ja" href="${partsHash({ k: x })}">${x}</a>`).join(' ')}</p>` : ''}
        <div class="kp-sec"><h3>Из чего состоит</h3>${n.p.length ? `<ul class="kp-tree">${treeHTML(c, [c], true)}</ul>` : '<p class="kp-none">Дальше не делится.</p>'}</div>
        <div class="kp-sec"><h3>Где ещё встречается${variants.length && uses.length ? `, считая формы ${variants.map(jp).join(' ')}` : ''}</h3>${hint}
          ${inGenki.length ? `<p class="kp-label">В Genki: ${inGenki.length}</p><div class="kp-uses">${inGenki.map(x => useLink(x)).join('')}</div>` : ''}
          ${others.length ? `<p class="kp-label kp-gap">Вне Genki: ${others.length}</p><div class="kp-uses">${visible.map(x => useLink(x, true)).join('')}</div>${others.length > LIMIT && !showAll ? `<button class="kp-btn kp-gap" id="kp-more">Показать все ${others.length}</button>` : ''}` : ''}
          ${!uses.length ? '<p class="kp-none">Больше нигде в этом наборе.</p>' : ''}
        </div>
      </div>
    </div>`;
  cropAll(view);
  if (walkJump) { walkJump = false; bringIntoView(view.querySelector('.kp-trail'), 'start'); }
  view.querySelectorAll('.kp-node, .kp-use, .kp-trail a, .kp-winfo a.kp-big').forEach(link => { link.addEventListener('click', () => { walkJump = true; }); });
  const big = view.querySelector('#kp-wbig');
  view.querySelector('#kp-worder').onclick = () => drawStrokes(big);
  const highlight = i => { big.classList.toggle('kp-dim', i !== null); big.querySelectorAll('.kp-part').forEach(part => part.classList.toggle('kp-on', +part.dataset.i === i)); };
  big.querySelectorAll('.kp-part').forEach(part => {
    const p = n.p[+part.dataset.i];
    if (p[0]) { part.style.cursor = 'pointer'; part.onclick = () => go(p[0]); }
    part.onmouseenter = () => highlight(+part.dataset.i); part.onmouseleave = () => highlight(null);
  });
  view.querySelectorAll('.kp-tree > li > .kp-node').forEach(row => {
    const i = +row.dataset.i;
    row.onmouseenter = row.onfocus = () => highlight(i);
    row.onmouseleave = row.onblur = () => highlight(null);
  });
  view.querySelector('#kp-rnd').onclick = () => { const all = Object.values(lessons).flat(); go(all[Math.floor(Math.random() * all.length)]); };
  view.querySelector('#kp-search').onsubmit = e => {
    e.preventDefault();
    const text = [...view.querySelector('#kp-q').value.trim()];
    const hit = text.find(x => W[x]) || text.find(x => /\p{Script=Han}/u.test(x));
    if (hit) go(hit);
  };
  const more = view.querySelector('#kp-more'); if (more) more.onclick = () => { showAll = true; renderWalk(); };
}
