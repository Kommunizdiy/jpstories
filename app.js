let stories = [];
const $ = s => document.querySelector(s);
let book = 1, lesson = 1, current = null, activeWord = null;
let completed;
try { completed = new Set(JSON.parse(localStorage.getItem('jpstories-read') || '[]')); } catch { completed = new Set(); }
function closePopup() { $('#word-popup').hidden = true; activeWord?.classList.remove('selected'); activeWord = null; }
function renderLessons() {
  $('#lessons').replaceChildren();
  for (let n = book === 1 ? 1 : 13; n <= (book === 1 ? 12 : 23); n++) {
    const button = document.createElement('button');
    button.className = 'lesson' + (lesson === n ? ' active' : '');
    button.textContent = String(n).padStart(2, '0');
    button.setAttribute('aria-label', `Урок ${n}`);
    button.setAttribute('aria-pressed', String(lesson === n));
    if (stories.some(s => s.lesson === n)) button.classList.add('has-stories');
    button.onclick = () => { lesson = n; render(); };
    $('#lessons').append(button);
  }
}
function render() {
  closePopup(); renderLessons();
  document.querySelectorAll('[data-book]').forEach(b => { b.classList.toggle('active', +b.dataset.book === book); b.setAttribute('aria-pressed', String(+b.dataset.book === book)); });
  $('#book-label').textContent = `GENKI ${book === 1 ? 'I' : 'II'} · 3RD EDITION`;
  $('#lesson-title').textContent = `Урок ${lesson}`;
  const filtered = stories.filter(s => s.lesson === lesson);
  $('#story-count').textContent = `Историй: ${filtered.length}`;
  $('#story-list').replaceChildren();
  filtered.forEach((story, i) => {
    const button = document.createElement('button'); button.className = 'story-card';
    const number = document.createElement('span'); number.className = 'story-number'; number.textContent = String(i + 1).padStart(2, '0');
    const titles = document.createElement('span'); const title = document.createElement('strong'); title.lang = 'ja'; title.textContent = story.title;
    const sub = document.createElement('small'); sub.textContent = story.subtitle; titles.append(title, sub);
    const arrow = document.createElement('span'); arrow.className = 'story-arrow'; arrow.textContent = completed.has(story.id) ? '✓' : '↗';
    button.append(number, titles, arrow); button.onclick = () => openStory(story); button.dataset.id = story.id;
    $('#story-list').append(button);
  });
  if (filtered.length) openStory(filtered[0]);
  else { current = null; $('#reader').hidden = true; const empty = document.createElement('div'); empty.className = 'empty'; empty.textContent = 'Здесь начинается следующая глава. Добавьте историю для этого урока в папку stories и пересоберите сайт.'; $('#story-list').append(empty); }
}
function openStory(story) {
  closePopup(); current = story; $('#reader').hidden = false;
  document.querySelectorAll('.story-card').forEach(c => c.classList.toggle('active', c.dataset.id === story.id));
  $('#reader-title').textContent = story.title; $('#reader-subtitle').textContent = story.subtitle;
  $('#reader-body').replaceChildren();
  for (const paragraph of story.body.split(/\n\s*\n/)) {
    const p = document.createElement('p');
    const pattern = /\[([^\]|]+)\|([^\]|]*)\|([^\]]+)\]/g;
    let end = 0;
    for (const match of paragraph.matchAll(pattern)) {
      p.append(document.createTextNode(paragraph.slice(end, match.index)));
      const word = document.createElement('button'); word.className = 'word'; word.textContent = match[1];
      word.setAttribute('aria-label', `${match[1]} — показать перевод`);
      word.onclick = () => showWord(word, match[1], match[2], match[3]); p.append(word); end = match.index + match[0].length;
    }
    p.append(document.createTextNode(paragraph.slice(end))); $('#reader-body').append(p);
  }
  updateRead();
}
function showWord(element, surface, reading, meaning) {
  closePopup(); activeWord = element; element.classList.add('selected');
  $('#word-surface').textContent = surface; $('#word-reading').textContent = reading; $('#word-meaning').textContent = meaning;
  const popup = $('#word-popup'); popup.hidden = false;
  const rect = element.getBoundingClientRect();
  popup.style.left = Math.max(12, Math.min(rect.left, innerWidth - popup.offsetWidth - 12)) + 'px';
  popup.style.top = Math.max(12, rect.bottom + popup.offsetHeight + 12 < innerHeight ? rect.bottom + 10 : rect.top - popup.offsetHeight - 10) + 'px';
}
function updateRead() { $('#mark-read').textContent = completed.has(current.id) ? '✓ Прочитано' : 'Отметить прочитанным'; $('#mark-read').classList.toggle('done', completed.has(current.id)); }
$('#mark-read').onclick = () => {
  if (!current) return;
  completed.has(current.id) ? completed.delete(current.id) : completed.add(current.id);
  try { localStorage.setItem('jpstories-read', JSON.stringify([...completed])); } catch {}
  updateRead(); document.querySelector(`.story-card.active .story-arrow`).textContent = completed.has(current.id) ? '✓' : '↗';
};
document.querySelectorAll('[data-book]').forEach(button => button.onclick = () => { book = +button.dataset.book; lesson = book === 1 ? 1 : 13; render(); });
$('#font-size').onclick = () => { $('#reader-body').classList.toggle('large'); closePopup(); };
$('#close-popup').onclick = closePopup;
document.addEventListener('click', e => { if (!e.target.closest('.word, #word-popup')) closePopup(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') { const previous = activeWord; closePopup(); previous?.focus(); } });
addEventListener('resize', closePopup); addEventListener('scroll', closePopup, true);
async function loadStories() {
  $('#story-list').textContent = 'Загружаем истории…';
  try {
    const response = await fetch(new URL('./stories.json', import.meta.url));
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    stories = await response.json();
    if (!Array.isArray(stories)) throw new Error('Некорректный список историй');
    render();
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
loadStories();
