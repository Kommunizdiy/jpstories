import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { build, output, staticFiles } from './build.mjs';

const preview = process.argv.includes('--preview');
if (!preview) await build();
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8' };
const files = new Set([...staticFiles, 'stories.json', 'series.json', 'reference.json']);
const rebuildOn = new Set(['index.html', 'stories.json', 'series.json', 'reference.json']);
let pending = Promise.resolve();
const server = http.createServer(async (request, response) => {
  try {
    const pathname = new URL(request.url, 'http://localhost').pathname;
    const file = pathname === '/' ? 'index.html' : pathname.slice(1);
    if (!files.has(file)) { response.writeHead(404); response.end('Not found'); return; }
    if (!preview && rebuildOn.has(file)) {
      pending = pending.catch(() => {}).then(build);
      await pending;
    }
    const content = await readFile(path.join(output, file));
    response.writeHead(200, { 'Content-Type': types[path.extname(file)], 'Cache-Control': 'no-store' });
    response.end(content);
  } catch (error) {
    console.error(error.message);
    response.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' }); response.end(error.message);
  }
});
server.listen(5173, '127.0.0.1', () => console.log('Local: http://127.0.0.1:5173'));
