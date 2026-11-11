import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';

const files = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/index.html', ['index.html', 'text/html; charset=utf-8']],
  ['/style.css', ['style.css', 'text/css; charset=utf-8']],
  ['/app.js', ['app.js', 'text/javascript; charset=utf-8']],
  ['/src/roundRobin.js', ['src/roundRobin.js', 'text/javascript; charset=utf-8']]
]);
const port = Number(process.env.PORT || 3000);
createServer(async (req, res) => {
  const entry = files.get(new URL(req.url, 'http://localhost').pathname);
  if (!entry || !['GET', 'HEAD'].includes(req.method)) {
    res.writeHead(404); res.end('No encontrado'); return;
  }
  try {
    const data = await readFile(new URL(entry[0], import.meta.url));
    res.writeHead(200, { 'Content-Type': entry[1], 'Cache-Control': 'no-store' });
    res.end(req.method === 'HEAD' ? undefined : data);
  } catch {
    res.writeHead(500); res.end('No se pudo cargar el archivo');
  }
}).listen(port, '127.0.0.1', () => console.log(`Abre http://localhost:${port}`));
