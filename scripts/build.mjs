import { mkdir, readdir, readFile, writeFile, copyFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { parseStory } from './stories.mjs';
import { buildReference } from './reference.mjs';
import { collectSeries, readSeries } from './series.mjs';

export const root = fileURLToPath(new URL('../', import.meta.url));
export const output = path.join(root, 'dist');
export const staticFiles = ['index.html', 'app.js', 'routing.js', 'reference.js', 'series.js', 'style.css'];
export async function build() {
  const directory = path.join(root, 'stories');
  const files = (await readdir(directory)).filter(file => file.endsWith('.txt')).sort();
  const stories = await Promise.all(files.map(async file => parseStory(await readFile(path.join(directory, file), 'utf8'), file.slice(0, -4))));
  stories.sort((a, b) => a.lesson - b.lesson || a.id.localeCompare(b.id, 'en'));
  const series = collectSeries(stories, await readSeries(root));
  const reference = await buildReference(root);
  await mkdir(output, { recursive: true });
  await Promise.all(staticFiles.map(file => copyFile(path.join(root, file), path.join(output, file))));
  await writeFile(path.join(output, 'stories.json'), JSON.stringify(stories));
  await writeFile(path.join(output, 'series.json'), JSON.stringify(series));
  await writeFile(path.join(output, 'reference.json'), JSON.stringify(reference));
  await writeFile(path.join(output, '.nojekyll'), '');
  return stories;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const stories = await build();
  console.log(`Готово: ${stories.length} историй и справочник → dist/`);
}
