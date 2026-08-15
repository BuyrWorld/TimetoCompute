/** Local static server for dist/. Mirrors Vercel's directory-index behaviour. */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), 'dist');
const PORT = Number(process.env.PORT) || 4321;
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.json': 'application/json',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.xml': 'application/xml',
  '.txt': 'text/plain; charset=utf-8'
};

http.createServer((req, res) => {
  let url = decodeURIComponent(req.url.split('?')[0]);

  // The API routes are Vercel functions; locally they simply aren't available,
  // which is a useful way to confirm the page degrades gracefully.
  if (url.startsWith('/api/')) {
    res.writeHead(503, { 'content-type': 'application/json' });
    return res.end(JSON.stringify({ error: 'API routes run on Vercel, not in the static dev server' }));
  }

  let file = path.join(ROOT, url);
  if (url.endsWith('/')) file = path.join(file, 'index.html');
  else if (!path.extname(file)) file = path.join(file, 'index.html');

  fs.readFile(file, (err, data) => {
    if (err) {
      res.writeHead(404, { 'content-type': 'text/plain' });
      return res.end('404 ' + url);
    }
    res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' });
    res.end(data);
  });
}).listen(PORT, () => console.log(`T2C dev server → http://localhost:${PORT}`));
