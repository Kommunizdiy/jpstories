// Раздел «Части»: прогулка по частям кандзи и тренажёр для похожих кандзи (#view=parts).
// Данные — reference/kanji-parts.json, черты из KanjiVG. Загружаются при первом открытии раздела.
import { partsHash } from './routing.js';

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

let W = null, loading = null, DIRECT = {}, root = null, view = null;
function loadParts() {
  loading ||= fetch(new URL('./kanji-parts.json', import.meta.url))
    .then(res => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.json(); })
    .then(data => {
      W = data;
      for (const c in W) for (const [part] of W[c].p) if (part && W[part]) (DIRECT[part] ||= new Set()).add(c);
    })
    .catch(error => { loading = null; throw error; });
  return loading;
}

export async function showParts(container, route) {
  root = container;
  const tab = TABS.some(t => t[0] === route.tab) ? route.tab : 'walk';
  container.innerHTML = `<div class="kp-top"><h1 class="kp-title">Части кандзи</h1>
    <p class="kp-lead" ${tab === 'walk' ? 'hidden' : ''}>Крыша 人 стоит на девяти кандзи отсюда, поэтому по ней их не отличить. Смотреть надо на то, что под ней. Серым показана общая часть, цветом та, что отличает. В тренажёре пока 12 похожих кандзи; 合, 令, 命 и 念 не из Genki.</p></div>
    <nav class="kp-tabs" aria-label="Режимы">${TABS.map(([id, name]) => `<a href="${partsHash({ tab: id })}" ${id === tab ? 'aria-current="page"' : ''}>${name}</a>`).join('')}</nav>
    <div id="kp-view"><p>Загружаем кандзи…</p></div>
    <p class="kp-credit">Черты и порядок их написания: <a href="https://kanjivg.tagaini.net/" target="_blank" rel="noopener">KanjiVG</a>, Ulrich Apel и соавторы, лицензия CC BY-SA 3.0. Чтения и английские значения: KANJIDIC (EDRDG, CC BY-SA). Деление на части местами упрощено, подсказки для памяти придуманы как ассоциации. Русские значения частей и кандзи Genki II написал Claude, со словарём они не сверялись.</p>`;
  view = container.querySelector('#kp-view');
  try { await loadParts(); } catch { if (root === container) view.innerHTML = '<p class="kp-msg kp-bad">Данные не загрузились. Обновите страницу.</p>'; return; }
  if (view !== container.querySelector('#kp-view')) return;
  if (tab === 'walk') renderWalk(route.k);
  if (tab === 'study') renderStudy(route.k);
  if (tab === 'build') newBuild();
  if (tab === 'tell') newTell();
}

/* ---------- Общие рисунки ---------- */
function kanjiSVG(c, { guides = false, plain = false } = {}) {
  const groups = K[c].parts.map((p, i) => `<g class="kp-part ${plain ? 'kp-pi' : 'kp-p' + i}" data-p="${i}">${p[2].map(n => `<path data-n="${n}" d="${W[c].s[n]}"/>`).join('')}</g>`).join('');
  return `<svg class="kp-k" viewBox="0 0 109 109" role="img" aria-label="${c}">${guides ? GUIDES : ''}<g class="kp-bg">${groups}</g></svg>`;
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
let studyCur = '食', apart = false;
function renderStudy(k) {
  if (K[k] && k !== studyCur) { studyCur = k; apart = false; }
  const cur = studyCur, d = K[cur];
  view.innerHTML = `<div class="kp-stack">
    <div class="kp-strip">${GROUPS.map(g => `<div><p class="kp-label">${g.name}</p><div class="kp-row">${g.list.map(c => `<a class="kp-pick" href="${partsHash({ tab: 'study', k: c })}" ${c === cur ? 'aria-current="true"' : ''} aria-label="${c}, ${K[c].m}">${kanjiSVG(c)}</a>`).join('')}</div></div>`).join('')}</div>
    <div class="kp-two">
      <div><div class="kp-sq" id="kp-big">${kanjiSVG(cur, { guides: true })}</div>
        <div class="kp-ctrl"><button class="kp-btn kp-main" id="kp-split">${apart ? 'Собрать обратно' : 'Разобрать на части'}</button><button class="kp-btn" id="kp-order">Черты по порядку</button><a class="kp-btn" href="${partsHash({ k: cur })}">Гулять от ${jp(cur)}</a></div></div>
      <div><div class="kp-head"><b lang="ja">${cur}</b><span>${d.m}</span></div><div class="kp-yomi" lang="ja">${d.y}</div>
        <ul class="kp-partlist">${d.parts.map((p, i) => `<li><div class="kp-mini">${partSVG(p[2].map(n => W[cur].s[n]), 'kp-p' + i)}</div><div><strong lang="ja">${p[0]}</strong><small>${p[1]}</small>${i === 0 && d.see ? ` <a href="${partsHash({ tab: 'study', k: d.see })}">открыть ${jp(d.see)}</a>` : ''}</div></li>`).join('')}</ul>
        <p class="kp-tell">${d.tell}<i>Для памяти: ${d.mem}</i></p>
        <ul class="kp-words">${d.words.map(w => `<li><b lang="ja">${w[0]}</b><span lang="ja">${w[1]}</span>${w[2]}</li>`).join('')}</ul>
      </div></div></div>`;
  cropAll(view); applyApart();
  view.querySelector('#kp-split').onclick = e => { apart = !apart; e.target.textContent = apart ? 'Собрать обратно' : 'Разобрать на части'; applyApart(); };
  view.querySelector('#kp-order').onclick = playOrder;
}
function applyApart() {
  const big = view.querySelector('#kp-big'); if (!big) return;
  big.querySelector('.kp-bg').style.transform = apart ? 'scale(.74)' : '';
  big.querySelectorAll('.kp-part').forEach(g => { const p = K[studyCur].parts[+g.dataset.p]; g.style.transform = apart ? `translate(${p[3][0]}px,${p[3][1]}px)` : ''; });
}
function playOrder() {
  if (apart) { apart = false; applyApart(); view.querySelector('#kp-split').textContent = 'Разобрать на части'; }
  if (!motion()) return;
  const paths = [...view.querySelectorAll('#kp-big path')].sort((a, b) => a.dataset.n - b.dataset.n);
  paths.forEach((p, i) => {
    p.setAttribute('pathLength', '1'); p.style.strokeDasharray = '1';
    const an = p.animate([{ strokeDashoffset: 1, opacity: 0 }, { strokeDashoffset: 1, opacity: 1, offset: .01 }, { strokeDashoffset: 0, opacity: 1 }], { duration: 420, delay: i * 460, fill: 'backwards', easing: 'ease-in-out' });
    an.onfinish = () => { p.style.strokeDasharray = ''; p.removeAttribute('pathLength'); };
  });
}

/* ---------- Собрать ---------- */
let queue = shuffle(ALL), doneSet = new Set(), misses = 0, st = null;
function trapPart(key) {
  if (key === '艮*') return { label: '艮', strokes: range(3, 8).map(i => W['食'].s[i]), why: `Это ${jp('艮')}, то есть ${jp('良')} без короткой верхней черты. В ${jp('食')} она есть.` };
  const [label, from] = key.split('@');
  return { label, from, strokes: K[from].parts.find(p => p[0] === label)[2].map(i => W[from].s[i]) };
}
function hanaPath() {
  let d = ''; const n = 260;
  for (let i = 0; i <= n; i++) {
    const t = i / n * Math.PI * 5.2, r = (i < n * .5 ? 26 : 17) + (i < n * .5 ? 5 * Math.sin(t * 6) : -i / n * 14);
    d += (i ? 'L' : 'M') + (50 + r * Math.cos(t - 1.2)).toFixed(1) + ' ' + (50 + r * Math.sin(t - 1.2)).toFixed(1);
  }
  return d;
}
function newBuild() {
  if (!queue.length) { renderBuildEnd(); return; }
  const c = queue[0], d = K[c];
  const need = d.parts.map((p, i) => ({ i, label: p[0], strokes: p[2].map(n => W[c].s[n]) })).filter(p => !(d.g === 0 && p.i === 0));
  st = { c, placed: new Set(), errors: 0, tiles: shuffle([...need.map(n => ({ ...n, ok: true })), ...d.trap.map(trapPart).map(t => ({ ...t, ok: false }))]) };
  view.innerHTML = `<div class="kp-two">
    <div><div class="kp-sq" id="kp-canvas"><svg class="kp-k" viewBox="0 0 109 109" role="img" aria-label="Поле сборки">${GUIDES}<g id="kp-ghost" class="kp-ghost" style="display:none">${W[c].s.map(p => `<path d="${p}"/>`).join('')}</g><g id="kp-placed">${d.g === 0 ? `<g class="kp-p0">${d.parts[0][2].map(n => `<path d="${W[c].s[n]}"/>`).join('')}</g>` : ''}</g></svg></div>
      <div class="kp-ctrl"><button class="kp-btn" id="kp-hint">Показать контур</button></div></div>
    <div><p class="kp-score">Собрано ${doneSet.size} из ${ALL.length}${misses ? ` · ошибок ${misses}` : ''}</p>
      <h2 class="kp-ask">${d.m}</h2><div class="kp-yomi" lang="ja">${d.y}</div>
      <p class="kp-do">${d.g === 0 ? 'Крыша уже стоит. Выберите, что должно быть под ней.' : 'Выберите все части этого кандзи.'}</p>
      <div class="kp-tiles">${st.tiles.map((t, i) => `<button class="kp-tile" data-i="${i}" aria-label="Часть ${t.label}">${partSVG(t.strokes)}</button>`).join('')}</div>
      <div class="kp-msg" id="kp-bmsg" role="status">Нажмите на часть, и она встанет на своё место.</div>
    </div></div>`;
  cropAll(view);
  view.querySelector('#kp-hint').onclick = () => { const g = view.querySelector('#kp-ghost'), on = g.style.display === 'none'; g.style.display = on ? '' : 'none'; if (on) st.errors++; };
  view.querySelectorAll('.kp-tile').forEach(b => { b.onclick = () => pickTile(b); });
}
function pickTile(b) {
  const t = st.tiles[+b.dataset.i], msg = view.querySelector('#kp-bmsg'), d = K[st.c];
  if (t.ok) {
    b.disabled = true; st.placed.add(t.i);
    const g = document.createElementNS(NS, 'g'); g.setAttribute('class', 'kp-p' + t.i);
    g.innerHTML = t.strokes.map(x => `<path d="${x}"/>`).join('');
    view.querySelector('#kp-placed').append(g);
    msg.className = 'kp-msg'; msg.innerHTML = `<b lang="ja">${t.label}</b> на месте.`;
    if (st.placed.size === d.parts.length - (d.g === 0 ? 1 : 0)) finishBuild();
  } else {
    st.errors++; misses++; b.classList.remove('kp-no'); void b.offsetWidth; b.classList.add('kp-no'); b.disabled = true;
    msg.className = 'kp-msg kp-bad';
    msg.innerHTML = t.why || `<b lang="ja">${t.label}</b> из кандзи <b lang="ja">${t.from}</b> (${K[t.from].m}). Здесь нужна другая часть.`;
  }
}
function finishBuild() {
  const { c, errors } = st, d = K[c];
  queue.shift();
  if (errors) queue.splice(Math.min(3, queue.length), 0, c); else doneSet.add(c);
  if (!errors) {
    const h = document.createElementNS(NS, 'svg'); h.setAttribute('class', 'kp-hana'); h.setAttribute('viewBox', '0 0 100 100');
    h.innerHTML = `<path pathLength="1" d="${hanaPath()}"/>`; view.querySelector('#kp-canvas').append(h);
  }
  view.querySelectorAll('.kp-tile').forEach(t => { t.disabled = true; });
  view.querySelector('#kp-hint').hidden = true;
  const msg = view.querySelector('#kp-bmsg'); msg.className = 'kp-msg kp-good';
  msg.innerHTML = `<b lang="ja">${c}</b> ${d.m}. ${d.tell}${errors ? ' Этот кандзи скоро вернётся ещё раз.' : ''}<br><b lang="ja">${d.words[0][0]}</b> ${jp(d.words[0][1])}, ${d.words[0][2]}`;
  const next = document.createElement('button'); next.className = 'kp-btn kp-main'; next.textContent = queue.length ? 'Следующий' : 'Готово'; next.onclick = newBuild;
  msg.after(next); next.focus({ preventScroll: true });
}
function renderBuildEnd() {
  view.innerHTML = `<div class="kp-tell"><h2 class="kp-ask">Все ${ALL.length} собраны</h2><p>Ошибок за круг: ${misses}. Кандзи с ошибками возвращались, пока не собрались чисто.</p><button class="kp-btn kp-main" id="kp-again">Начать заново</button></div>`;
  view.querySelector('#kp-again').onclick = () => { queue = shuffle(ALL); doneSet = new Set(); misses = 0; newBuild(); };
}

/* ---------- Отличить ---------- */
let tellQueue = [], right = 0, total = 0;
function newTell() {
  if (!tellQueue.length) tellQueue = shuffle(ALL);
  const c = tellQueue.shift(), d = K[c];
  const pool = d.g === 0 ? GROUPS[0].list : [...GROUPS[1].list, '食'];
  const options = shuffle([c, ...shuffle(pool.filter(x => x !== c)).slice(0, 3)]);
  view.innerHTML = `<div class="kp-two">
    <div class="kp-tell kp-center"><h2 class="kp-ask">${d.m}</h2><div class="kp-yomi" lang="ja">${d.y}</div></div>
    <div><p class="kp-score">Верно ${right} из ${total}</p><p class="kp-do">Какой кандзи это значит?</p>
      <div class="kp-opts">${options.map(o => `<button class="kp-opt" data-c="${o}" aria-label="${o}">${kanjiSVG(o, { plain: true })}</button>`).join('')}</div>
      <div id="kp-tres"></div></div></div>`;
  view.querySelectorAll('.kp-opt').forEach(b => {
    b.onclick = () => {
      const pick = b.dataset.c, ok = pick === c; total++;
      if (ok) right++; else tellQueue.splice(Math.min(3, tellQueue.length), 0, c);
      view.querySelectorAll('.kp-opt').forEach(x => { x.disabled = true; if (x.dataset.c === c) x.classList.add('kp-right'); });
      if (!ok) b.classList.add('kp-wrong');
      view.querySelector('.kp-score').textContent = `Верно ${right} из ${total}`;
      const fig = x => `<figure><div class="kp-sq">${kanjiSVG(x, { guides: true })}</div><figcaption><b lang="ja">${x}</b> ${K[x].m}</figcaption></figure>`;
      view.querySelector('#kp-tres').innerHTML = `<div class="kp-msg ${ok ? 'kp-good' : 'kp-bad'}" role="status">${ok ? `Да, <b lang="ja">${c}</b>, ${d.m}.` : `Это был <b lang="ja">${c}</b>, а выбран <b lang="ja">${pick}</b>.`} ${d.tell}${ok ? '' : ` У ${jp(pick)}: ${K[pick].tell}`}</div>${ok ? '' : `<div class="kp-versus">${fig(pick)}${fig(c)}</div>`}<button class="kp-btn kp-main" id="kp-tnext">Следующий</button>`;
      const next = view.querySelector('#kp-tnext'); next.onclick = newTell; next.focus({ preventScroll: true });
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
  if (n.e) return { t: n.e + ' (англ.)' };
  return { t: 'значения в словаре нет', form: true };
}
const go = c => { location.hash = partsHash({ k: c }); };
function nodeSVG(c) {
  const n = W[c];
  const inner = n.p.length
    ? n.p.map((p, i) => `<g class="kp-part ${p[0] ? 'kp-w' + (i % 4 + 1) : 'kp-w0'}" data-i="${i}">${p[1].map(k => `<path d="${n.s[k]}"/>`).join('')}</g>`).join('')
    : `<g class="kp-pi">${n.s.map(d => `<path d="${d}"/>`).join('')}</g>`;
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
  const lessons = {};
  for (const x in W) if (W[x].l) (lessons[W[x].l] ||= []).push(x);
  const useLink = (x, pale) => `<a class="kp-use ${pale ? 'kp-pale' : ''}" href="${partsHash({ k: x })}"><b lang="ja">${x}</b>${pale ? '' : `<small>${W[x].m || ''}</small>`}</a>`;
  view.innerHTML = `<form class="kp-bar" id="kp-search"><input id="kp-q" type="text" placeholder="Вставьте или наберите кандзи" aria-label="Кандзи или часть" autocomplete="off" lang="ja"><button class="kp-btn">Найти</button><button class="kp-btn" type="button" id="kp-rnd">Случайный из Genki</button></form>
    ${unknown ? `<p class="kp-msg kp-bad">Кандзи ${jp(unknown)} в этом наборе нет. Здесь кандзи Genki, остальные дзёё и их части.</p>` : ''}
    <details class="kp-lessons"><summary>Все кандзи Genki по урокам</summary><div class="kp-gl">${Object.entries(lessons).map(([l, list]) => `<span>Урок ${l}</span><div class="kp-row kp-tight">${list.map(x => `<a class="kp-ch" lang="ja" href="${partsHash({ k: x })}">${x}</a>`).join('')}</div>`).join('')}</div></details>
    <div class="kp-trail" aria-label="Пройденный путь">${trail.map((x, i) => `${i ? '<span aria-hidden="true">›</span>' : ''}<a href="${partsHash({ k: x })}" aria-label="${x}" ${x === c ? 'aria-current="true"' : ''}>${partSVG(W[x].s)}</a>`).join('')}</div>
    <div class="kp-walk">
      <div><div class="kp-sq" id="kp-wbig">${nodeSVG(c)}</div></div>
      <div>
        <div class="kp-head">${n.j ? `<b lang="ja">${c}</b>` : ''}<span class="${g.form ? 'kp-form' : ''}">${g.t}</span></div>
        <div class="kp-yomi" lang="ja">${[...(n.on || []), ...(n.kun || [])].join('・')}</div>
        <div>${n.l ? `<span class="kp-tag kp-g">Genki, урок ${n.l}</span>` : n.j ? '<span class="kp-tag">вне Genki</span>' : '<span class="kp-tag">только как часть</span>'}<span class="kp-tag">черт: ${n.sc}</span>${K[c] ? `<a href="${partsHash({ tab: 'study', k: c })}">Открыть в тренажёре</a>` : ''}</div>
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
  const big = view.querySelector('#kp-wbig');
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
