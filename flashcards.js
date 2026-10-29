// Карточки для повторения слов словаря: случайный порядок, японский → русский и наоборот.
// «Не помню» возвращает карточку через несколько шагов; тренировка кончается, когда вспомнены все слова.

export const DIRECTIONS = [['mixed', 'Вперемешку'], ['jp', 'Японский → русский'], ['ru', 'Русский → японский']];
export const RETRY_GAP = 4;

export function shuffle(items, random = Math.random) {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const pickDirection = (direction, random) => direction === 'mixed' ? (random() < 0.5 ? 'jp' : 'ru') : direction;

export function createSession(words, { direction = 'mixed', random = Math.random } = {}) {
  const queue = shuffle(words, random).map(word => ({ word, dir: pickDirection(direction, random) }));
  return { queue, total: queue.length, learned: 0, missed: [], random };
}

// remembered = true — карточка уходит; false — возвращается через RETRY_GAP карточек и попадает в «трудные».
export function answer(session, remembered) {
  const card = session.queue.shift();
  if (!card) return session;
  if (remembered) session.learned++;
  else {
    if (!session.missed.includes(card.word)) session.missed.push(card.word);
    session.queue.splice(Math.min(RETRY_GAP, session.queue.length), 0, card);
  }
  return session;
}

export function setDirection(session, direction) {
  for (const card of session.queue) card.dir = pickDirection(direction, session.random);
}

// Чтение на лицевой стороне прячем, только если все кандзи слова уже знакомы (из Genki I).
export function hideReading(word, known) {
  const kanji = [...(word.kanji || '')].filter(c => /\p{Script=Han}/u.test(c));
  return kanji.length > 0 && kanji.every(c => known.has(c));
}

const esc = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const store = {
  get(key, fallback) { try { const v = localStorage.getItem('jpstories-cards:' + key); return v === null ? fallback : JSON.parse(v); } catch { return fallback; } },
  set(key, value) { try { localStorage.setItem('jpstories-cards:' + key, JSON.stringify(value)); } catch {} },
};

let closeActive = null;
export function closeFlashcards() { closeActive?.(); }

export function openFlashcards({ words, title, pos = {}, known = new Set(), opener = null }) {
  if (!words.length) return;
  closeFlashcards();
  let direction = DIRECTIONS.some(([v]) => v === store.get('dir', 'mixed')) ? store.get('dir', 'mixed') : 'mixed';
  let session = createSession(words, { direction });
  let revealed = false;

  const root = document.createElement('div');
  root.className = 'fc-overlay';
  root.innerHTML = `<div class="fc-box" role="dialog" aria-modal="true" aria-labelledby="fc-title">
    <div class="fc-top"><div><div class="eyebrow">КАРТОЧКИ</div><h2 id="fc-title">${esc(title)}</h2></div>
    <button type="button" class="fc-close" aria-label="Закрыть карточки">×</button></div>
    <div class="fc-dir" role="group" aria-label="Направление">${DIRECTIONS.map(([v, t]) => `<button type="button" class="chip" data-v="${v}">${t}</button>`).join('')}</div>
    <div class="fc-stage" aria-live="polite"></div></div>`;
  const stage = root.querySelector('.fc-stage');
  const markDirection = () => root.querySelectorAll('.fc-dir .chip').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === direction)));

  const renderCard = () => {
    const card = session.queue[0];
    if (!card) { renderDone(); return; }
    const w = card.word;
    const jp = w.kanji || w.kana;
    const kanaFront = Boolean(w.kanji) && !hideReading(w, known);
    const kana = `<div class="fc-kana" lang="ja">${esc(w.kana)}</div>`;
    const front = card.dir === 'jp'
      ? `<div class="fc-jp" lang="ja">${esc(jp)}</div>${kanaFront ? kana : ''}`
      : `<div class="fc-ru">${esc(w.meaning)}</div>`;
    const back = card.dir === 'jp'
      ? `${w.kanji && !kanaFront ? kana : ''}<div class="fc-ru">${esc(w.meaning)}</div>`
      : `<div class="fc-jp" lang="ja">${esc(jp)}</div>${w.kanji ? kana : ''}`;
    const meta = [pos[w.type], `урок ${w.lesson}`, w.theme].filter(Boolean).join(' · ');
    const missed = session.missed.length ? ` · не вспомнил: ${session.missed.length}` : '';
    stage.innerHTML = `<div class="fc-progress"><span class="fc-bar"><i style="width:${Math.round(session.learned / session.total * 100)}%"></i></span>
      <span>${session.learned} из ${session.total}${missed}</span></div>
      <div class="fc-card${revealed ? ' open' : ''}">
        <div class="fc-ask">${card.dir === 'jp' ? 'Что это значит?' : 'Как это по-японски?'}</div>
        <div class="fc-front">${front}</div>
        <div class="fc-back"${revealed ? '' : ' hidden'}>${back}</div>
        <div class="fc-meta">${esc(meta)}</div>
      </div>
      <div class="fc-actions">${revealed
        ? '<button type="button" class="fc-no">Не помню <kbd>1</kbd></button><button type="button" class="fc-yes">Помню <kbd>2</kbd></button>'
        : '<button type="button" class="fc-show">Показать ответ <kbd>пробел</kbd></button>'}</div>`;
    stage.querySelector(revealed ? '.fc-yes' : '.fc-show').focus();
  };

  const renderDone = () => {
    const missed = session.missed;
    const list = missed.map(w => `<li><span lang="ja">${esc(w.kanji ? `${w.kanji}（${w.kana}）` : w.kana)}</span> — ${esc(w.meaning)}</li>`).join('');
    stage.innerHTML = `<div class="fc-done"><div class="fc-jp" lang="ja">おつかれさま！</div>
      <p>Все ${session.total} карточек пройдены. С первого раза: ${session.total - missed.length}.</p>
      ${missed.length ? `<h3>Трудные слова</h3><ul class="fc-missed">${list}</ul>` : ''}
      <div class="fc-actions">${missed.length ? `<button type="button" class="fc-again-missed">Повторить трудные (${missed.length})</button>` : ''}
      <button type="button" class="fc-again">Ещё раз все</button><button type="button" class="fc-finish">Закрыть</button></div></div>`;
    stage.querySelector('.fc-again-missed, .fc-again').focus();
  };

  const restart = list => { session = createSession(list, { direction }); revealed = false; renderCard(); };
  const reveal = () => { if (!revealed && session.queue.length) { revealed = true; renderCard(); } };
  const grade = remembered => { if (!revealed) return; answer(session, remembered); revealed = false; renderCard(); };

  root.addEventListener('click', e => {
    if (e.target === root || e.target.closest('.fc-close, .fc-finish')) { close(); return; }
    const chip = e.target.closest('.fc-dir .chip');
    if (chip) {
      direction = chip.dataset.v; store.set('dir', direction); markDirection();
      setDirection(session, direction); revealed = false; renderCard(); return;
    }
    if (e.target.closest('.fc-show, .fc-card')) { reveal(); return; }
    if (e.target.closest('.fc-no')) grade(false);
    else if (e.target.closest('.fc-yes')) grade(true);
    else if (e.target.closest('.fc-again-missed')) restart(session.missed);
    else if (e.target.closest('.fc-again')) restart(words);
  });
  const onKey = e => {
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    if (e.key === 'Tab') {
      const items = [...root.querySelectorAll('button:not([disabled])')];
      const i = items.indexOf(document.activeElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); items.at(-1).focus(); }
      else if (!e.shiftKey && i === items.length - 1) { e.preventDefault(); items[0].focus(); }
      return;
    }
    if ((e.key === ' ' || e.key === 'Enter') && e.target.tagName === 'BUTTON') return; // кнопка сработает сама
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); revealed ? grade(true) : reveal(); }
    else if (e.key === '1' || e.key === 'ArrowLeft') grade(false);
    else if (e.key === '2' || e.key === 'ArrowRight') grade(true);
  };
  function close() {
    root.remove();
    document.removeEventListener('keydown', onKey, true);
    removeEventListener('hashchange', close);
    document.documentElement.classList.remove('fc-lock');
    closeActive = null;
    opener?.focus();
  }
  closeActive = close;
  document.addEventListener('keydown', onKey, true);
  addEventListener('hashchange', close);
  document.documentElement.classList.add('fc-lock');
  document.body.append(root);
  markDirection();
  renderCard();
}
