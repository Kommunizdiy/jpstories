// Справочник: грамматика, словарь, кандзи и счётные суффиксы. Данные — reference.json из папки reference/.
import { referenceHash } from './routing.js';

let cache = null;
let ref = null;
export function loadReference() {
  if (!cache) {
    cache = fetch(new URL('./reference.json', import.meta.url))
      .then(response => { if (!response.ok) throw new Error(`HTTP ${response.status}`); return response.json(); })
      .then(data => { ref = data; return data; })
      .catch(error => { cache = null; throw error; });
  }
  return cache;
}

const esc = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const store = {
  get(key, fallback) { try { const v = localStorage.getItem('jpstories-ref:' + key); return v === null ? fallback : JSON.parse(v); } catch { return fallback; } },
  set(key, value) { try { localStorage.setItem('jpstories-ref:' + key, JSON.stringify(value)); } catch {} },
};

// Слова справочника для слова из истории: по написанию кандзи или по кане (однобуквенную кану не сравниваем, чтобы は-частица не находила 歯).
export function dictionaryMatches(data, surface) {
  const s = surface.trim();
  if (!s) return [];
  return data.vocab.filter(w => w.kanji === s || (w.kana === s && (!w.kanji || [...s].length > 1)));
}

const TITLES = { grammar: 'Грамматика', vocab: 'Словарь', kanji: 'Кандзи', counters: 'Счётные суффиксы' };
const INTROS = {
  grammar: 'Краткие правила Genki I по урокам с примерами.',
  vocab: 'Слова Genki I с кандзи, чтением и переводом: по темам или по урокам.',
  kanji: '145 кандзи первой книги с чтениями и значениями.',
  counters: 'Счётные суффиксы урока 14 Genki II и повторение из первой книги.',
};
const POS = { n: 'сущ.', u: 'う-гл.', ru: 'る-гл.', irr: 'неправ. гл.', i: 'い-прил.', na: 'な-прил.', x: 'прочее' };
const SHORT = { u: 'う-гл.', ru: 'る-гл.', irr: 'неправ.', i: 'い', na: 'な' };
const GROUPS = [['all', 'Все'], ['n', 'Сущ.'], ['v', 'Глаголы'], ['a', 'Прилаг.'], ['x', 'Прочее']];
const TYPE_SECTIONS = [['n', 'Существительные'], ['v', 'Глаголы'], ['a', 'Прилагательные'], ['x', 'Наречия, слова и выражения']];
const inGroup = (type, group) => group === 'all' || (group === 'v' ? ['u', 'ru', 'irr'].includes(type) : group === 'a' ? ['i', 'na'].includes(type) : type === group);

function setHash(route) {
  const url = new URL(location.href); url.hash = referenceHash(route);
  history.replaceState(null, '', url);
}
function chipRow(label, items, current, id) {
  return `<div class="ref-row" id="${id}" role="group" aria-label="${esc(label)}"><span class="ref-label">${esc(label)}</span>` +
    items.map(([value, text, count]) => `<button type="button" class="chip" data-v="${esc(value)}" aria-pressed="${String(value) === String(current)}">${esc(text)}${count != null ? `<span class="c">${count}</span>` : ''}</button>`).join('') + '</div>';
}
function head(view, extra = '') {
  return `<div class="ref-head"><div class="eyebrow">СПРАВОЧНИК · GENKI I</div><h1>${TITLES[view]}</h1><p class="intro">${INTROS[view]}</p>${extra}</div>`;
}

export async function showReference(container, route) {
  container.hidden = false;
  document.title = `${TITLES[route.view]} — 小さな物語`;
  if (!ref) {
    container.innerHTML = `${head(route.view)}<p class="ref-status">Загружаем справочник…</p>`;
    try { await loadReference(); } catch (error) {
      container.innerHTML = `${head(route.view)}<div class="empty">Не удалось загрузить справочник. Обновите страницу или пересоберите сайт.<br><button type="button" class="ref-retry">Повторить</button></div>`;
      container.querySelector('.ref-retry').onclick = () => showReference(container, route);
      console.error('Загрузка справочника:', error);
      return;
    }
  }
  ({ grammar: renderGrammar, vocab: renderVocab, kanji: renderKanji, counters: renderCounters })[route.view](container, route);
}

/* Грамматика */
function renderGrammar(container, route) {
  const lessons = ref.grammar.map(g => g.lesson);
  let lesson = lessons.includes(route.lesson) ? route.lesson : 'all';
  container.innerHTML = head('grammar') +
    chipRow('Урок', [['all', 'Все']].concat(lessons.map(n => [n, n])), lesson, 'ref-g-lessons') + '<div id="ref-body"></div>';
  const body = container.querySelector('#ref-body');
  const draw = () => {
    container.querySelectorAll('#ref-g-lessons .chip').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === String(lesson))));
    body.innerHTML = ref.grammar.filter(g => lesson === 'all' || g.lesson === lesson).map(g =>
      `<section class="g-lesson"><div class="g-head"><span class="eyebrow">УРОК ${g.lesson}</span><h2><span lang="ja">${esc(g.title)}</span> <small>${esc(g.subtitle)}</small></h2>` +
      `<span class="g-links"><a href="#lesson=${g.lesson}">Истории урока →</a><a href="${referenceHash({ view: 'vocab', lesson: g.lesson })}">Слова урока →</a></span></div><div class="g-rules">` +
      g.rules.map(r => `<div class="g-rule"><h3 lang="ja">${esc(r.pattern)}</h3>${r.text.map(t => `<p>${esc(t)}</p>`).join('')}` +
        (r.examples.length ? `<ul class="g-ex">${r.examples.map(([jp, ru]) => `<li><span lang="ja">${esc(jp)}</span><span class="ru">${esc(ru)}</span></li>`).join('')}</ul>` : '') + '</div>').join('') +
      '</div></section>').join('');
  };
  container.querySelector('#ref-g-lessons').onclick = e => {
    const b = e.target.closest('.chip'); if (!b) return;
    lesson = b.dataset.v === 'all' ? 'all' : Number(b.dataset.v);
    setHash({ view: 'grammar', lesson: lesson === 'all' ? null : lesson });
    draw();
  };
  draw();
}

/* Словарь */
function renderVocab(container, route) {
  const themes = ref.themes;
  const gk = new Set(ref.kanji.map(k => k.kanji));
  const st = {
    mode: route.q ? 'lessons' : store.get('mode', 'themes'),
    theme: themes.includes(route.theme) ? route.theme : 'all',
    lesson: route.lesson && route.lesson <= 12 ? route.lesson : 'all',
    group: store.get('group', 'all'),
    q: route.q || '',
  };
  const themeCount = Object.fromEntries(themes.map(t => [t, ref.vocab.filter(w => w.theme === t).length]));
  container.innerHTML = head('vocab') + `<div class="ref-controls">
    ${chipRow('Вид', [['themes', 'По темам'], ['lessons', 'По урокам']], st.mode, 'ref-mode')}
    <input id="ref-q" class="ref-search" type="search" placeholder="Поиск: кандзи, кана или перевод" autocomplete="off" aria-label="Поиск по словарю" value="${esc(st.q)}">
    ${chipRow('Тема', [['all', 'Все темы']].concat(themes.map(t => [t, t, themeCount[t]])), st.theme, 'ref-themes')}
    ${chipRow('Урок', [['all', 'Все']].concat(Array.from({ length: 12 }, (_, i) => [i + 1, i + 1])), st.lesson, 'ref-lessons')}
    ${chipRow('Тип', GROUPS, st.group, 'ref-groups')}
    <div class="ref-toggles"><label><input type="checkbox" id="ref-hide-kn"> Скрыть чтение</label><label><input type="checkbox" id="ref-hide-ru"> Скрыть перевод</label><span class="count" id="ref-count"></span></div>
    <p class="ref-legend">Цветом выделены кандзи, которые изучаются в Genki I. «ур.» — урок, где слово появляется. В режиме проверки нажмите на строку, чтобы открыть скрытое.</p>
  </div><div id="ref-body" class="v-list"></div>
  <p class="ref-note">Слова собраны по открытым спискам лексики Genki и сверены вручную. Свободного списка именно 3-го издания нет, поэтому отдельные слова в книге могут стоять в другом уроке.</p>`;
  const body = container.querySelector('#ref-body');
  const kj = s => [...s].map(c => gk.has(c) ? `<span class="g">${esc(c)}</span>` : esc(c)).join('');
  const word = (w, meta) => `<div class="v" tabindex="0"><div class="kj" lang="ja">${w.kanji ? kj(w.kanji) : esc(w.kana)}</div><div class="kn" lang="ja">${w.kanji ? esc(w.kana) : ''}</div><div class="ru">${esc(w.meaning)}</div><div class="meta">${meta}</div></div>`;
  const filtered = () => {
    const q = st.q.trim().toLowerCase();
    return ref.vocab.filter(w => (st.lesson === 'all' || w.lesson === st.lesson) && inGroup(w.type, st.group) &&
      (st.mode !== 'themes' || st.theme === 'all' || w.theme === st.theme) &&
      (!q || w.kanji.includes(q) || w.kana.includes(q) || w.meaning.toLowerCase().includes(q) || w.theme.toLowerCase().includes(q)));
  };
  const sync = () => {
    const mark = (id, v) => container.querySelectorAll(`#${id} .chip`).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === String(v))));
    mark('ref-mode', st.mode); mark('ref-themes', st.theme); mark('ref-lessons', st.lesson); mark('ref-groups', st.group);
    container.querySelector('#ref-themes').hidden = st.mode !== 'themes';
    setHash({ view: 'vocab', lesson: st.lesson === 'all' ? null : st.lesson, theme: st.mode === 'themes' && st.theme !== 'all' ? st.theme : null, q: st.q.trim() || null });
  };
  const draw = () => {
    const items = filtered();
    let out = '';
    if (st.mode === 'themes') {
      for (const theme of themes) {
        const inTheme = items.filter(w => w.theme === theme);
        if (!inTheme.length) continue;
        out += `<section class="v-theme"><div class="v-theme-head"><h2>${esc(theme)}</h2><span class="count">${inTheme.length}</span><button type="button" class="ref-copy" data-theme="${esc(theme)}">Скопировать список</button></div>`;
        for (const [group, label] of TYPE_SECTIONS) {
          const rows = inTheme.filter(w => inGroup(w.type, group));
          if (rows.length) out += `<h3 class="v-sub">${label}</h3>` + rows.map(w => word(w, (SHORT[w.type] ? SHORT[w.type] + ' · ' : '') + 'ур. ' + w.lesson)).join('');
        }
        out += '</section>';
      }
    } else {
      let last = 0;
      for (const w of items) {
        if (st.lesson === 'all' && w.lesson !== last) { out += `<h3 class="v-sub v-lesson">Урок ${w.lesson}</h3>`; last = w.lesson; }
        out += word(w, `${POS[w.type]} · ${esc(w.theme)}`);
      }
    }
    body.innerHTML = out || '<div class="empty">Ничего не найдено. Попробуйте другое слово или сбросьте фильтры.</div>';
    container.querySelector('#ref-count').textContent = `Показано: ${items.length} из ${ref.vocab.length}`;
  };
  const bind = (id, key, parse = v => v, after) => container.querySelector('#' + id).onclick = e => {
    const b = e.target.closest('.chip'); if (!b) return;
    st[key] = parse(b.dataset.v); if (after) after(); sync(); draw();
  };
  bind('ref-mode', 'mode', v => v, () => store.set('mode', st.mode));
  bind('ref-themes', 'theme');
  bind('ref-lessons', 'lesson', v => v === 'all' ? 'all' : Number(v));
  bind('ref-groups', 'group', v => v, () => store.set('group', st.group));
  container.querySelector('#ref-q').oninput = e => { st.q = e.target.value; sync(); draw(); };
  for (const [id, cls] of [['ref-hide-kn', 'hide-kn'], ['ref-hide-ru', 'hide-ru']]) {
    const box = container.querySelector('#' + id);
    box.checked = store.get(id, false); body.classList.toggle(cls, box.checked);
    box.onchange = () => { body.classList.toggle(cls, box.checked); store.set(id, box.checked); body.querySelectorAll('.v.open').forEach(r => r.classList.remove('open')); };
  }
  body.onclick = e => {
    const copy = e.target.closest('.ref-copy');
    if (copy) { copyTheme(copy, filtered().filter(w => w.theme === copy.dataset.theme)); return; }
    e.target.closest('.v')?.classList.toggle('open');
  };
  body.onkeydown = e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.classList.contains('v')) { e.preventDefault(); e.target.classList.toggle('open'); } };
  sync(); draw();
}

function copyTheme(button, words) {
  const lines = [button.dataset.theme];
  for (const [group, label] of TYPE_SECTIONS) {
    const part = words.filter(w => inGroup(w.type, group));
    if (!part.length) continue;
    lines.push('', label + ':');
    part.forEach(w => lines.push(`${w.kanji ? `${w.kanji}（${w.kana}）` : w.kana} — ${w.meaning}`));
  }
  const text = lines.join('\n');
  const done = message => { button.textContent = message; setTimeout(() => { button.textContent = 'Скопировать список'; }, 1600); };
  const fallback = () => {
    const area = document.createElement('textarea'); area.value = text; area.setAttribute('readonly', ''); area.style.position = 'fixed'; area.style.opacity = '0';
    document.body.append(area); area.select();
    let ok = false; try { ok = document.execCommand('copy'); } catch {}
    area.remove(); done(ok ? 'Скопировано' : 'Не удалось скопировать');
  };
  try { navigator.clipboard.writeText(text).then(() => done('Скопировано'), fallback); } catch { fallback(); }
}

/* Кандзи */
function renderKanji(container, route) {
  const lessons = [...new Set(ref.kanji.map(k => k.lesson))];
  let lesson = lessons.includes(route.lesson) ? route.lesson : 'all';
  container.innerHTML = head('kanji') + chipRow('Урок', [['all', 'Все']].concat(lessons.map(n => [n, n])), lesson, 'ref-k-lessons') +
    '<p class="ref-legend">Онъёми — катаканой, кунъёми — хираганой; в скобках окуригана.</p><div id="ref-body" class="k-grid"></div>';
  const body = container.querySelector('#ref-body');
  const draw = () => {
    container.querySelectorAll('#ref-k-lessons .chip').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === String(lesson))));
    body.innerHTML = ref.kanji.filter(k => lesson === 'all' || k.lesson === lesson).map(k =>
      `<div class="k-card"><div class="k-big" lang="ja">${esc(k.kanji)}<small>урок ${k.lesson}</small></div><div class="k-on" lang="ja">${esc(k.on || '—')}</div><div class="k-kun" lang="ja">${esc(k.kun || '—')}</div><div class="k-mean">${esc(k.meaning)}</div></div>`).join('');
  };
  container.querySelector('#ref-k-lessons').onclick = e => {
    const b = e.target.closest('.chip'); if (!b) return;
    lesson = b.dataset.v === 'all' ? 'all' : Number(b.dataset.v);
    setHash({ view: 'kanji', lesson: lesson === 'all' ? null : lesson }); draw();
  };
  draw();
}

/* Счётные суффиксы */
const NUMBERS = ['いち', 'に', 'さん', 'よん', 'ご', 'ろく', 'なな', 'はち', 'きゅう', 'じゅう', 'なん'];
function counterTable(table) {
  const headRow = '<tr><th scope="col">Суффикс</th><th scope="col">Что считаем</th>' + Array.from({ length: 10 }, (_, i) => `<th scope="col">${i + 1}</th>`).join('') + '<th scope="col" lang="ja">何</th></tr>';
  const rows = table.rows.map(r => `<tr><th scope="row" class="c-name" lang="ja">〜${esc(r.counter)}<span>${esc(r.reading)}</span></th><td class="c-what">${esc(r.what)}</td>` +
    r.forms.map((f, i) => `<td lang="ja"${r.reading && f !== NUMBERS[i] + r.reading ? ' class="shift"' : ''}>${esc(f)}</td>`).join('') + '</tr>').join('');
  return `<div class="c-wrap"><table class="c-table"><caption>${esc(table.caption)}</caption><thead>${headRow}</thead><tbody>${rows}</tbody></table></div>`;
}
function renderCounters(container) {
  container.innerHTML = head('counters') + '<div id="ref-body">' + ref.counters.blocks.map(block =>
    `<section class="c-block"><h2>${esc(block.title)}</h2>${block.lead ? `<p class="intro">${esc(block.lead)}</p>` : ''}` +
    (block.tables || []).map(counterTable).join('') +
    (block.notes ? '<div class="g-rules">' + block.notes.map(n => `<div class="g-rule"><h3>${esc(n.title)}</h3>${n.text.map(t => `<p>${esc(t)}</p>`).join('')}` +
      (n.examples.length ? `<ul class="g-ex">${n.examples.map(([jp, ru]) => `<li><span lang="ja">${esc(jp)}</span><span class="ru">${esc(ru)}</span></li>`).join('')}</ul>` : '') + '</div>').join('') + '</div>' : '') +
    (block.remarks || []).slice(0, 1).map(t => `<p class="ref-legend">${esc(t)}</p>`).join('') +
    (block.dates ? `<div class="c-wrap"><table class="c-table c-dates"><caption>${esc(block.dates.caption)}</caption><tbody><tr>${block.dates.days.map(([d]) => `<th scope="col">${esc(d)}</th>`).join('')}</tr><tr>${block.dates.days.map(([, r]) => `<td lang="ja" class="shift">${esc(r)}</td>`).join('')}</tr></tbody></table></div>` : '') +
    (block.remarks || []).slice(1).map(t => `<p class="ref-legend">${esc(t)}</p>`).join('') +
    '</section>').join('') + '</div>';
}
