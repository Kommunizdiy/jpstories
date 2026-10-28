import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const clean = raw => raw.replace(/^﻿/, '').replace(/\r\n?/g, '\n');
const SLUG = /^[a-z0-9][a-z0-9-]*$/;

// series/<id>.txt: шапка (series — как в главах, title, genre, mark), затем --- и описание абзацами.
// Имя файла становится адресом страницы: series/camera.txt → #series=camera.
export function parseSeries(raw, id) {
  if (!SLUG.test(id)) throw new Error(`series/${id}.txt: имя файла — только латиница в нижнем регистре, цифры и дефис`);
  const [head, ...rest] = clean(raw).trim().split(/\n---(?:\n|$)/);
  const meta = {};
  for (const line of head.split('\n')) {
    const colon = line.indexOf(':');
    if (colon > 0) meta[line.slice(0, colon).trim()] = line.slice(colon + 1).trim();
  }
  if (!meta.series) throw new Error(`series/${id}.txt: нужна строка series: с тем же названием, что в главах`);
  if (meta.mark && [...meta.mark].length !== 1) throw new Error(`series/${id}.txt: mark — один знак`);
  const info = { id, name: meta.series };
  if (meta.title) info.title = meta.title;
  if (meta.genre) info.genre = meta.genre;
  if (meta.mark) info.mark = meta.mark;
  const description = rest.join('\n---\n').split(/\n\s*\n/).map(p => p.replace(/\s*\n\s*/g, ' ').trim()).filter(Boolean);
  if (description.length) info.description = description;
  return info;
}

// Собирает серии из глав (story.series + story.chapter) и необязательных описаний.
export function collectSeries(stories, described = []) {
  const groups = new Map();
  for (const story of stories) {
    if (!story.series) continue;
    if (!groups.has(story.series)) groups.set(story.series, []);
    groups.get(story.series).push(story);
  }
  const names = new Set();
  for (const info of described) {
    if (names.has(info.name)) throw new Error(`series/${info.id}.txt: серия «${info.name}» уже описана в другом файле`);
    names.add(info.name);
    if (!groups.has(info.name)) throw new Error(`series/${info.id}.txt: нет ни одной главы с series: ${info.name}`);
  }
  const ids = new Set(described.map(info => info.id));
  const result = [];
  for (const [name, chapters] of groups) {
    chapters.sort((a, b) => a.chapter - b.chapter);
    for (let i = 1; i < chapters.length; i++) {
      if (chapters[i].chapter === chapters[i - 1].chapter) {
        throw new Error(`серия «${name}»: глава ${chapters[i].chapter} встречается дважды (${chapters[i - 1].id}, ${chapters[i].id})`);
      }
    }
    let info = described.find(d => d.name === name);
    if (!info) {
      // Без файла описания адрес берётся из имени первой главы: 01-camera-01 → camera.
      let id = chapters[0].id.replace(/^\d+-/, '').replace(/-\d+$/, '').toLowerCase();
      if (!SLUG.test(id) || ids.has(id)) id = `series-${result.length + 1}`;
      info = { id, name };
    }
    ids.add(info.id);
    result.push({ ...info, chapters: chapters.map(story => story.id) });
  }
  return result;
}

export async function readSeries(root) {
  const directory = path.join(root, 'series');
  let files;
  try { files = (await readdir(directory)).filter(file => file.endsWith('.txt')).sort(); }
  catch (error) { if (error.code === 'ENOENT') return []; throw error; }
  return Promise.all(files.map(async file => parseSeries(await readFile(path.join(directory, file), 'utf8'), file.slice(0, -4))));
}
