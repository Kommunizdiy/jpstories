import { routeHash, resolveRoute, routeView, referenceHash, seriesHash, partsHash } from './routing.js';
import { showReference, loadReference, dictionaryMatches, kanjiForWord } from './reference.js';
import { readingPlan, plural } from './series.js';
import { splitSections, tasksOf, glossaryOf, TOKEN } from './sections.js';
import { showParts } from './kanji-parts.js';

let stories = [];
let series = [];
let storyById = new Map(), seriesByName = new Map();
let storiesLoaded = false;
const $ = s => document.querySelector(s);
let book = 1, lesson = 1, current = null, activeWord = null;
let completed;
try { completed = new Set(JSON.parse(localStorage.getItem('jpstories-read') || '[]')); } catch { completed = new Set(); }
// Последняя открытая глава каждой большой истории: { camera: '04-camera-04' }.
let seriesLast = {};
try { const saved = JSON.parse(localStorage.getItem('jpstories-series') || '{}'); if (saved && typeof saved === 'object' && !Array.isArray(saved)) seriesLast = saved; } catch {}
// Ответы на задания: { 'id-истории': ['ответ 1', 'ответ 2'] }.
let answers = {};
try { const saved = JSON.parse(localStorage.getItem('jpstories-answers') || '{}'); if (saved && typeof saved === 'object' && !Array.isArray(saved)) answers = saved; } catch {}
function saveAnswer(storyId, index, text) {
  const list = Array.isArray(answers[storyId]) ? answers[storyId] : [];
  list[index] = text;
  answers[storyId] = list;
  try { localStorage.setItem('jpstories-answers', JSON.stringify(answers)); return true; } catch { return false; }
}
const answeredCount = story => tasksOf(story.body).filter((_, i) => (answers[story.id]?.[i] || '').trim()).length;
function el(tag, className = '', text = '', lang = '') {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  if (lang) node.lang = lang;
  return node;
}
// Обычный клик — переход внутри страницы; Ctrl/Cmd/Shift-клик по-прежнему открывает ссылку в новой вкладке.
function onPlainClick(link, handler) {
  link.addEventListener('click', event => {
    if (event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault(); handler();
  });
}
function closePopup() { $('#word-popup').hidden = true; activeWord?.classList.remove('selected'); activeWord = null; }
function saveLocation(storyId, historyMode = 'push') {
  const hash = routeHash({ storyId, lesson });
  if (location.hash !== hash) {
    const url = new URL(location.href); url.hash = hash;
    history[historyMode === 'replace' ? 'replaceState' : 'pushState'](null, '', url);
  }
  try { localStorage.setItem('jpstories-location', hash); } catch {}
  $('.site-nav [data-view="stories"]').href = hash;
}
function restoreLocation(useRemembered = false) {
  if (!storiesLoaded) return;
  let remembered = '';
  if (useRemembered) {
    try { remembered = localStorage.getItem('jpstories-location') || ''; } catch {}
  }
  const route = resolveRoute(location.hash, stories, remembered);
  lesson = route.lesson; book = lesson <= 12 ? 1 : 2;
  // #lesson=N тоже открывает первую историю урока, но выбранной явно считается только #story=….
  const named = new URLSearchParams((location.hash || remembered).replace(/^#/, '')).get('story');
  render(route.storyId, 'replace', route.storyId === named);
}
// popstate и hashchange приходят парой на один переход — второй вызов пропускаем.
let lastRoute = { hash: null, at: -Infinity };
function route(force = false) {
  const now = performance.now();
  if (force !== true && location.hash === lastRoute.hash && now - lastRoute.at < 100) return;
  lastRoute = { hash: location.hash, at: now };
  const target = routeView(location.hash);
  const isStories = target.view === 'stories' || target.view === 'series';
  $('#stories-view').hidden = !isStories;
  $('#reference-view').hidden = isStories || ['tasks', 'parts'].includes(target.view);
  $('#parts-view').hidden = target.view !== 'parts';
  $('#tasks-view').hidden = target.view !== 'tasks';
  document.querySelectorAll('.site-nav a').forEach(a => {
    const on = a.dataset.view === (isStories ? 'stories' : target.view);
    a.classList.toggle('active', on);
    if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
  closePopup();
  if (target.view === 'series') { showSeries(target.series); return; }
  if (isStories) { restoreLocation(!location.hash); return; }
  scrollTo(0, 0);
  if (target.view === 'tasks') { showTasks(); return; }
  if (target.view === 'parts') { showParts($('#parts-view'), target); return; }
  showReference($('#reference-view'), target);
}
function renderLessons(active = lesson) {
  $('#lessons').replaceChildren();
  for (let n = book === 1 ? 1 : 13; n <= (book === 1 ? 12 : 23); n++) {
    const button = document.createElement('button');
    button.className = 'lesson' + (active === n ? ' active' : '');
    button.textContent = String(n).padStart(2, '0');
    button.setAttribute('aria-label', `Урок ${n}`);
    button.setAttribute('aria-pressed', String(active === n));
    if (stories.some(s => s.lesson === n)) button.classList.add('has-stories');
    button.onclick = () => {
      lesson = n; render();
      // На телефоне между уроками и историями большие истории: без прокрутки выбор урока не виден.
      if (matchMedia('(max-width:700px)').matches) $('.library').scrollIntoView({ behavior: 'smooth' });
    };
    $('#lessons').append(button);
  }
  document.querySelectorAll('[data-book]').forEach(b => { b.classList.toggle('active', +b.dataset.book === book); b.setAttribute('aria-pressed', String(+b.dataset.book === book)); });
}
// Библиотека показывает либо уроки со списком историй, либо оглавление большой истории.
function setSeriesPage(on) {
  $('#series-page').hidden = !on;
  $('.library > .section-head').hidden = on;
  $('#story-list').hidden = on;
  if (on) $('#reader').hidden = true;
}
function render(selectedId, historyMode = 'push', explicit = true) {
  closePopup(); setSeriesPage(false); renderLessons();
  $('#book-label').textContent = `GENKI ${book === 1 ? 'I' : 'II'} · 3RD EDITION`;
  $('#lesson-title').textContent = `Урок ${lesson}`;
  const lessonLinks = $('#lesson-links'); lessonLinks.replaceChildren();
  if (lesson <= 23) {
    for (const [view, text] of [['grammar', 'Грамматика урока'], ['vocab', 'Слова урока']]) {
      const link = document.createElement('a'); link.href = referenceHash({ view, lesson }); link.textContent = text + ' →';
      lessonLinks.append(link);
    }
  }
  const filtered = stories.filter(s => s.lesson === lesson);
  // Если у серии в уроке несколько глав, они показываются одной карточкой со ссылкой на оглавление.
  const perSeries = new Map();
  for (const s of filtered) if (s.series && seriesByName.has(s.series)) perSeries.set(s.series, (perSeries.get(s.series) || 0) + 1);
  const items = [], grouped = new Set();
  for (const s of filtered) {
    if (perSeries.get(s.series) > 1) {
      if (!grouped.has(s.series)) { grouped.add(s.series); items.push({ group: seriesByName.get(s.series) }); }
    } else items.push({ story: s });
  }
  $('#story-count').textContent = `Историй: ${items.length}`;
  $('#story-list').replaceChildren();
  items.forEach((item, i) => {
    const number = el('span', 'story-number', String(i + 1).padStart(2, '0'));
    if (item.group) {
      const info = item.group, plan = planFor(info);
      const card = el('a', 'story-card in-series series-group');
      card.href = seriesHash(info.id); card.dataset.series = info.name;
      const titles = el('span');
      titles.append(el('span', 'series-tag', `Большая история · ${chapterCount(plan.total)}`), el('strong', '', info.title || info.name, info.title ? 'ja' : ''), el('small', 'series-group-meta', groupMeta(info, plan)));
      card.append(number, titles, el('span', 'story-arrow', '→'));
      $('#story-list').append(card);
      return;
    }
    const story = item.story;
    const button = document.createElement('button'); button.className = 'story-card';
    const titles = document.createElement('span'); const title = document.createElement('strong'); title.lang = 'ja'; title.textContent = story.title;
    const sub = document.createElement('small'); sub.textContent = story.subtitle;
    if (story.series) {
      button.classList.add('in-series');
      const total = stories.filter(s => s.series === story.series).length;
      const tag = el('span', 'series-tag', 'Большая история');
      tag.append(el('span', 'series-tag-of', ` · глава ${story.chapter} из ${total}`));
      titles.append(tag);
    }
    titles.append(title, sub);
    const arrow = document.createElement('span'); arrow.className = 'story-arrow'; arrow.textContent = completed.has(story.id) ? '✓' : '↗';
    button.append(number, titles, arrow); button.onclick = () => openStory(story); button.dataset.id = story.id;
    $('#story-list').append(button);
  });
  const chosen = filtered.find(story => story.id === selectedId);
  // Без выбора открывается первая отдельная история урока, а не глава из середины серии.
  const fallback = items.find(item => item.story)?.story || filtered[0];
  if (filtered.length) openStory(chosen || fallback, historyMode, Boolean(chosen) && explicit);
  else { current = null; $('#reader').hidden = true; const empty = document.createElement('div'); empty.className = 'empty'; empty.textContent = 'Здесь начинается следующая глава. Добавьте историю для этого урока в папку stories и пересоберите сайт.'; $('#story-list').append(empty); document.title = `Урок ${lesson} — 小さな物語`; saveLocation(null, historyMode); }
  renderSeriesShelf();
}
function openStory(story, historyMode = 'push', explicit = true) {
  closePopup(); current = story; $('#reader').hidden = false;
  document.title = `${story.title} — 小さな物語`;
  saveLocation(story.id, historyMode);
  if (explicit) rememberChapter(story);
  renderSeriesBar(story);
  document.querySelectorAll('#story-list .story-card').forEach(c => c.classList.toggle('active', c.dataset.id === story.id || (Boolean(story.series) && c.dataset.series === story.series)));
  $('#reader-title').textContent = story.title; $('#reader-subtitle').textContent = story.subtitle;
  $('#level-note').hidden = !story.note;
  $('#level-note').open = false;
  $('#level-note-text').textContent = story.note || '';
  $('#reader-body').replaceChildren(...renderBody(story));
  const navigation = $('#series-navigation'); navigation.replaceChildren(); navigation.hidden = !story.series;
  if (story.series) {
    const chapters = chaptersOf(story.series);
    const position = chapters.findIndex(s => s.id === story.id);
    const info = seriesByName.get(story.series);
    const previous = chapters[position - 1], next = chapters[position + 1];
    if (previous) navigation.append(chapterLink(previous, `← Предыдущая глава · Урок ${previous.lesson}`));
    if (info) {
      const contents = el('a', 'series-contents', next ? 'Все главы' : 'Конец истории · все главы');
      contents.href = seriesHash(info.id);
      navigation.append(contents);
    }
    if (next) navigation.append(chapterLink(next, `Следующая глава → · Урок ${next.lesson}`));
  }
  updateRead();
}

// ——— Текст истории и его разделы ———
function annotated(paragraph, tag = 'p') {
  const node = document.createElement(tag);
  let end = 0;
  for (const match of paragraph.matchAll(TOKEN)) {
    node.append(document.createTextNode(paragraph.slice(end, match.index)));
    const word = el('button', 'word', match[1]);
    word.setAttribute('aria-label', `${match[1]} — показать перевод`);
    word.onclick = () => showWord(word, match[1], match[2], match[3]); node.append(word); end = match.index + match[0].length;
  }
  node.append(document.createTextNode(paragraph.slice(end)));
  return node;
}
function sectionHeading(text, id = '') {
  const heading = el('h3', '', text, 'ru');
  if (id) heading.id = id;
  return heading;
}
function renderBody(story) {
  const nodes = [];
  let taskIndex = 0;
  for (const section of splitSections(story.body)) {
    if (section.kind === 'text') { nodes.push(...section.paragraphs.map(p => annotated(p))); continue; }
    if (section.kind === 'questions') { nodes.push(sectionHeading(section.title), ...section.paragraphs.map(p => annotated(p))); continue; }
    if (section.kind === 'words') {
      const list = el('dl', 'glossary');
      for (const entry of glossaryOf(section.paragraphs)) {
        const term = el('dt');
        const word = el('button', 'word', entry.surface);
        word.setAttribute('aria-label', `${entry.surface} — показать перевод`);
        word.onclick = () => showWord(word, entry.surface, entry.reading, entry.meaning);
        term.append(word);
        if (entry.reading) term.append(el('span', 'glossary-kana', entry.reading));
        list.append(term, el('dd', '', entry.meaning, 'ru'));
      }
      nodes.push(sectionHeading(section.title), list);
      continue;
    }
    if (section.kind === 'tasks') {
      nodes.push(sectionHeading(section.title, 'story-tasks'));
      const list = el('ol', 'tasks');
      for (const paragraph of section.paragraphs) {
        const index = taskIndex++;
        const item = el('li', 'task');
        const field = el('textarea', 'task-answer');
        field.lang = 'ja'; field.rows = 3;
        field.placeholder = 'Ваш ответ — по-японски или по-русски';
        field.setAttribute('aria-label', `Ответ на задание ${index + 1}`);
        field.value = answers[story.id]?.[index] || '';
        const status = el('span', 'task-status');
        status.setAttribute('aria-live', 'polite');
        let timer;
        field.addEventListener('input', () => {
          clearTimeout(timer);
          timer = setTimeout(() => { status.textContent = saveAnswer(story.id, index, field.value) ? 'Сохранено в этом браузере' : 'Не удалось сохранить'; }, 400);
        });
        item.append(annotated(paragraph), field, status);
        list.append(item);
      }
      nodes.push(list);
      continue;
    }
    if (section.kind === 'translation') {
      const details = el('details', 'translation');
      details.lang = 'ru';
      details.append(el('summary', '', 'Перевод текста'), ...section.paragraphs.map(p => el('p', '', p)));
      nodes.push(details);
    }
  }
  return nodes;
}

// ——— Раздел «Задания»: тексты с вопросами для обсуждения ———
function showTasks() {
  const page = $('#tasks-view');
  document.title = 'Задания — 小さな物語';
  page.replaceChildren();
  const head = el('div', 'ref-head');
  head.append(el('div', 'eyebrow', 'ЧТЕНИЕ И ОБСУЖДЕНИЕ'), el('h1', '', 'Задания'),
    el('p', 'intro', 'Тексты с заданиями: прочитайте текст, нажимая на незнакомые слова, затем ответьте на вопросы. Ответы сохраняются в этом браузере. Перевод текста спрятан под ним — откройте, чтобы проверить себя.'));
  page.append(head);
  if (!storiesLoaded) { page.append(el('p', 'ref-status', 'Загружаем истории…')); return; }
  const withTasks = stories.filter(story => tasksOf(story.body).length);
  if (!withTasks.length) {
    page.append(el('div', 'empty', 'Пока нет текстов с заданиями. Добавьте в историю раздел «Задания» — см. README.'));
    return;
  }
  const list = el('div', 'story-list tasks-list');
  withTasks.forEach((story, i) => {
    const total = tasksOf(story.body).length, done = answeredCount(story);
    const card = el('a', 'story-card');
    card.href = routeHash({ storyId: story.id });
    const names = el('span');
    names.append(el('span', 'series-tag', `Урок ${story.lesson} · ${total} ${plural(total, ['задание', 'задания', 'заданий'])}`), el('strong', '', story.title, 'ja'), el('small', '', story.subtitle));
    names.append(el('small', 'tasks-progress', done ? `Отвечено: ${done} из ${total}` : 'Ещё не начато'));
    card.append(el('span', 'story-number', String(i + 1).padStart(2, '0')), names, el('span', 'story-arrow', done === total ? '✓' : '↗'));
    onPlainClick(card, () => {
      history.pushState(null, '', card.href);
      route(true);
      requestAnimationFrame(() => $('#story-tasks')?.scrollIntoView({ block: 'start' }));
    });
    list.append(card);
  });
  page.append(list);
}

// ——— Большие истории (серии глав) ———
function indexStories() {
  storyById = new Map(stories.map(story => [story.id, story]));
  series = series
    .filter(info => info && info.id && info.name && Array.isArray(info.chapters))
    .map(info => ({ ...info, chapters: info.chapters.filter(id => storyById.has(id)) }))
    .filter(info => info.chapters.length);
  seriesByName = new Map(series.map(info => [info.name, info]));
}
function chaptersOf(name) {
  const info = seriesByName.get(name);
  const chapters = info ? info.chapters.map(id => storyById.get(id)).filter(Boolean) : [];
  return chapters.length ? chapters : stories.filter(s => s.series === name).sort((a, b) => a.chapter - b.chapter);
}
function planFor(info) { return readingPlan(info.chapters, completed, seriesLast[info.id]); }
function rememberChapter(story) {
  const info = story.series && seriesByName.get(story.series);
  if (!info || seriesLast[info.id] === story.id) return;
  seriesLast[info.id] = story.id;
  try { localStorage.setItem('jpstories-series', JSON.stringify(seriesLast)); } catch {}
}
function openChapter(story) {
  lesson = story.lesson; book = lesson <= 12 ? 1 : 2;
  render(story.id);
  $('#reader').scrollIntoView({ block: 'start' });
}
function chapterLink(story, text, className = '') {
  const link = el('a', className, text);
  link.href = routeHash({ storyId: story.id });
  onPlainClick(link, () => openChapter(story));
  return link;
}
function continueLink(info, plan, className) {
  const target = storyById.get(plan.target);
  const first = storyById.get(info.chapters[0]);
  const text = plan.mode === 'start' ? `Начать с главы ${first.chapter} →`
    : plan.mode === 'again' ? `Перечитать с главы ${first.chapter} →`
    : `Продолжить: глава ${target.chapter} →`;
  return chapterLink(target, text, className);
}
function meter(info, plan) {
  const bar = el('span', 'series-meter');
  bar.setAttribute('aria-hidden', 'true');
  for (const id of info.chapters) {
    const step = el('span', completed.has(id) ? 'on' : id === plan.target && plan.mode !== 'again' ? 'next' : '');
    bar.append(step);
  }
  return bar;
}
const chapterCount = n => `${n} ${plural(n, ['глава', 'главы', 'глав'])}`;
const groupMeta = (info, plan) => `${info.name} · ${plan.read ? `прочитано ${plan.read} из ${plan.total}` : 'оглавление и описание'}`;
function renderSeriesShelf(activeId = null) {
  const shelf = $('#series-shelf'); shelf.replaceChildren();
  shelf.hidden = !series.length;
  if (!series.length) return;
  shelf.append(el('div', 'eyebrow', series.length > 1 ? 'БОЛЬШИЕ ИСТОРИИ' : 'БОЛЬШАЯ ИСТОРИЯ'));
  for (const info of series) {
    const plan = planFor(info);
    const card = el('a', 'series-card' + (info.id === activeId ? ' active' : ''));
    card.href = seriesHash(info.id);
    if (activeId === info.id) card.setAttribute('aria-current', 'page');
    if (info.mark) { const mark = el('span', 'series-mark', info.mark, 'ja'); mark.setAttribute('aria-hidden', 'true'); card.append(mark); }
    card.append(el('span', 'series-card-meta', [info.genre, chapterCount(plan.total)].filter(Boolean).join(' · ')), el('strong', '', info.name));
    if (info.title) card.append(el('span', 'series-card-ja', info.title, 'ja'));
    card.append(meter(info, plan), el('span', 'series-card-meta', plan.read ? `Прочитано ${plan.read} из ${plan.total}` : 'Оглавление и описание →'));
    shelf.append(card, continueLink(info, plan, 'series-go'));
  }
}
function showSeries(id) {
  if (!storiesLoaded) return;
  const info = series.find(s => s.id === id);
  if (!info) { restoreLocation(); return; }
  closePopup(); current = null;
  const chapters = chaptersOf(info.name);
  book = chapters[0].lesson <= 12 ? 1 : 2;
  setSeriesPage(true); renderLessons(null); renderSeriesShelf(info.id);
  document.title = `${info.name} — 小さな物語`;
  const plan = planFor(info);
  const page = $('#series-page'); page.replaceChildren();
  const head = el('div', 'section-head');
  const titles = el('div');
  titles.append(el('div', 'eyebrow', ['БОЛЬШАЯ ИСТОРИЯ', info.genre, chapterCount(chapters.length)].filter(Boolean).join(' · ').toUpperCase()), el('h2', '', info.name));
  if (info.title) titles.append(el('p', 'series-title-ja', info.title, 'ja'));
  head.append(titles, el('span', 'count', `Прочитано: ${plan.read} из ${plan.total}`));
  page.append(head);
  if (info.description) {
    const description = el('div', 'series-desc');
    for (const paragraph of info.description) description.append(el('p', '', paragraph));
    page.append(description);
  }
  const actions = el('div', 'series-actions');
  actions.append(meter(info, plan), continueLink(info, plan, 'primary'));
  if (plan.mode === 'continue' && plan.target !== info.chapters[0]) actions.append(chapterLink(chapters[0], 'С первой главы', 'secondary'));
  page.append(actions);
  const list = el('ol', 'story-list chapter-list');
  list.setAttribute('aria-label', 'Главы');
  for (const story of chapters) {
    const item = el('li');
    const isNext = story.id === plan.target && plan.mode !== 'again';
    const card = chapterLink(story, '', 'story-card' + (isNext ? ' next' : ''));
    const names = el('span');
    if (isNext) names.append(el('span', 'series-tag', plan.mode === 'start' ? 'Начало' : 'Читать дальше'));
    names.append(el('strong', '', story.title, 'ja'), el('small', '', `Глава ${story.chapter} · Урок ${story.lesson}`));
    card.append(el('span', 'story-number', String(story.chapter).padStart(2, '0')), names, el('span', 'story-arrow', completed.has(story.id) ? '✓' : '↗'));
    if (completed.has(story.id)) card.setAttribute('aria-label', `Глава ${story.chapter}, ${story.title} — прочитано`);
    item.append(card); list.append(item);
  }
  page.append(list);
  if (matchMedia('(max-width: 700px)').matches) $('.library').scrollIntoView({ block: 'start' });
  else scrollTo(0, 0);
}
function renderSeriesBar(story) {
  const bar = $('#series-bar'); bar.replaceChildren();
  const info = story.series && seriesByName.get(story.series);
  bar.hidden = !info;
  if (!info) return;
  const chapters = chaptersOf(story.series);
  const top = el('div', 'series-bar-top');
  const name = el('a', 'series-bar-name', info.name); name.href = seriesHash(info.id);
  top.append(name, el('span', '', `Глава ${story.chapter} из ${chapters.length}`));
  const dots = el('div', 'chapter-dots');
  for (const chapter of chapters) {
    const dot = chapterLink(chapter, String(chapter.chapter), 'chapter-dot' + (completed.has(chapter.id) ? ' read' : '') + (chapter.id === story.id ? ' current' : ''));
    dot.title = `Глава ${chapter.chapter} · ${chapter.title}`;
    dot.setAttribute('aria-label', `Глава ${chapter.chapter}: ${chapter.title}${completed.has(chapter.id) ? ', прочитано' : ''}`);
    if (chapter.id === story.id) dot.setAttribute('aria-current', 'step');
    dots.append(dot);
  }
  bar.append(top, dots);
}
function showWord(element, surface, reading, meaning) {
  closePopup(); activeWord = element; popupScroll = scrollY; element.classList.add('selected');
  $('#word-surface').textContent = surface; $('#word-reading').textContent = reading; $('#word-meaning').textContent = meaning;
  const popup = $('#word-popup'); popup.hidden = false;
  const dictionary = $('#word-dictionary'); dictionary.hidden = true;
  showKanjiLinks(surface);
  placePopup(element);
  loadReference().then(data => {
    if (activeWord !== element) return;
    const written = kanjiForWord(data.vocab, surface, meaning);
    if (written.length) showKanjiLinks(written.join(''), written.join(' / '));
    if (dictionaryMatches(data, surface).length) { dictionary.href = referenceHash({ view: 'vocab', q: surface }); dictionary.hidden = false; }
    placePopup(element);
  }).catch(() => {});
}
// Ссылки на разбор кандзи. Для слова, данного каной, сначала показываем, как оно пишется.
function showKanjiLinks(text, writtenAs = '') {
  const kanji = [...new Set(text.match(/\p{Script=Han}/gu) || [])], box = $('#word-kanji');
  box.hidden = !kanji.length; box.replaceChildren();
  if (!kanji.length) return;
  if (writtenAs) { box.append('Пишется ', el('span', 'word-written', writtenAs, 'ja')); box.append(el('br')); }
  box.append('Разбор кандзи:');
  for (const k of kanji) { const link = el('a', '', k, 'ja'); link.href = partsHash({ k }); box.append(link); }
}
function placePopup(element) {
  const popup = $('#word-popup');
  const rect = element.getBoundingClientRect();
  popup.style.left = Math.max(12, Math.min(rect.left, innerWidth - popup.offsetWidth - 12)) + 'px';
  popup.style.top = Math.max(12, rect.bottom + popup.offsetHeight + 12 < innerHeight ? rect.bottom + 10 : rect.top - popup.offsetHeight - 10) + 'px';
}
function updateRead() { $('#mark-read').textContent = completed.has(current.id) ? '✓ Прочитано' : 'Отметить прочитанным'; $('#mark-read').classList.toggle('done', completed.has(current.id)); }
$('#mark-read').onclick = () => {
  if (!current) return;
  completed.has(current.id) ? completed.delete(current.id) : completed.add(current.id);
  try { localStorage.setItem('jpstories-read', JSON.stringify([...completed])); } catch {}
  updateRead();
  const arrow = document.querySelector(`#story-list .story-card[data-id="${current.id}"] .story-arrow`);
  if (arrow) arrow.textContent = completed.has(current.id) ? '✓' : '↗';
  if (current.series) {
    renderSeriesShelf(); renderSeriesBar(current);
    const info = seriesByName.get(current.series);
    const meta = info && document.querySelector(`#story-list .series-group[data-series="${CSS.escape(info.name)}"] .series-group-meta`);
    if (meta) meta.textContent = groupMeta(info, planFor(info));
  }
};
document.querySelectorAll('[data-book]').forEach(button => button.onclick = () => { book = +button.dataset.book; lesson = book === 1 ? 1 : 13; render(); });
$('#font-size').onclick = () => { $('#reader-body').classList.toggle('large'); closePopup(); };
$('#close-popup').onclick = closePopup;
document.addEventListener('click', e => { if (!e.target.closest('.word, #word-popup')) closePopup(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') { const previous = activeWord; closePopup(); previous?.focus(); } });
// Адресная строка телефона меняет высоту окна, а палец слегка сдвигает страницу: перевод от этого не закрываем.
let popupWidth = innerWidth, popupScroll = 0;
addEventListener('resize', () => {
  if (innerWidth !== popupWidth) { popupWidth = innerWidth; closePopup(); } else if (activeWord) placePopup(activeWord);
});
addEventListener('scroll', event => {
  if (!activeWord) return;
  if (event.target !== document || Math.abs(scrollY - popupScroll) > 60) closePopup(); else placePopup(activeWord);
}, true);
addEventListener('popstate', route);
addEventListener('hashchange', route);
async function loadStories() {
  $('#story-list').textContent = 'Загружаем истории…';
  try {
    const [response, seriesResponse] = await Promise.all([
      fetch(new URL('./stories.json', import.meta.url)),
      fetch(new URL('./series.json', import.meta.url)).catch(() => null),
    ]);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    stories = await response.json();
    if (!Array.isArray(stories)) throw new Error('Некорректный список историй');
    // Без series.json главы по-прежнему открываются, просто без полки и оглавления.
    series = seriesResponse?.ok ? await seriesResponse.json().catch(() => []) : [];
    if (!Array.isArray(series)) series = [];
    indexStories();
    storiesLoaded = true;
    renderSeriesShelf();
    if (['stories', 'series', 'tasks'].includes(routeView(location.hash).view)) route(true);
  } catch (error) {
    $('#reader').hidden = true;
    $('#story-list').replaceChildren();
    const message = document.createElement('div'); message.className = 'empty';
    message.textContent = 'Не удалось загрузить истории. Обновите страницу или проверьте сборку сайта.';
    const retry = document.createElement('button'); retry.textContent = 'Повторить'; retry.onclick = loadStories;
    message.append(document.createElement('br'), retry); $('#story-list').append(message);
    console.error('Загрузка историй:', error);
  }
}
route();
loadStories();
