// Hash links work on static hosts, including GitHub Pages repository subpaths.
export function routeHash({ storyId, lesson }) {
  const params = new URLSearchParams();
  if (storyId) params.set('story', storyId);
  else params.set('lesson', String(lesson));
  return `#${params}`;
}

export function resolveRoute(hash, stories, rememberedHash = '') {
  const params = new URLSearchParams((hash || rememberedHash).replace(/^#/, ''));
  const story = stories.find(s => s.id === params.get('story'));
  if (story) return { lesson: story.lesson, storyId: story.id };
  const requestedLesson = Number(params.get('lesson'));
  const lesson = Number.isInteger(requestedLesson) && requestedLesson >= 1 && requestedLesson <= 23 ? requestedLesson : 1;
  return { lesson, storyId: stories.find(s => s.lesson === lesson)?.id };
}

// Big multi-chapter stories: #series=camera opens the table of contents.
export function seriesHash(id) {
  return `#${new URLSearchParams({ series: id })}`;
}

// Reference sections: #view=grammar|vocab|kanji|counters, optionally &lesson=N, &theme=…, &q=….
export const REFERENCE_VIEWS = ['grammar', 'vocab', 'kanji', 'counters'];

export function routeView(hash) {
  let params;
  try { params = new URLSearchParams((hash || '').replace(/^#/, '')); } catch { return { view: 'stories' }; }
  const view = params.get('view');
  if (!view && params.get('series')) return { view: 'series', series: params.get('series') };
  if (!REFERENCE_VIEWS.includes(view)) return { view: 'stories' };
  const route = { view };
  const lesson = Number(params.get('lesson'));
  if (params.has('lesson') && Number.isInteger(lesson) && lesson >= 1 && lesson <= 23) route.lesson = lesson;
  if (params.get('theme')) route.theme = params.get('theme');
  if (params.get('q')) route.q = params.get('q');
  return route;
}

export function referenceHash({ view, lesson, theme, q }) {
  const params = new URLSearchParams({ view });
  if (lesson) params.set('lesson', String(lesson));
  if (theme) params.set('theme', theme);
  if (q) params.set('q', q);
  return `#${params}`;
}
