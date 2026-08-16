/**
 * Overflow forensics.
 *
 * shots.js reports THAT a page overflows; this reports WHY. It walks the box
 * tree at a given width and names the widest element whose own box — not merely
 * a descendant's — exceeds the viewport, together with the computed properties
 * that usually cause it.
 *
 *   node scripts/overflow.js [--widths 320,1280] [--route /]
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const DIST = path.join(ROOT, 'dist');
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const arg = (n, f) => { const i = process.argv.indexOf('--' + n); return i > -1 ? process.argv[i + 1] : f; };
const WIDTHS = arg('widths', '320,375,768,1024,1280,1366,1440,1600').split(',').map(Number);
const ROUTES = arg('route', '/,/companies/,/sites/,/intelligence/,/news/,/lab/,/research/').split(',');

const MIME = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.json': 'application/json', '.xml': 'application/xml', '.txt': 'text/plain' };

const server = http.createServer((req, res) => {
  const p = decodeURIComponent(req.url.split('?')[0]);
  if (p.startsWith('/api/')) { res.writeHead(503, { 'content-type': 'application/json' }); return res.end('{}'); }
  let f = path.join(DIST, p);
  if (!path.extname(f)) f = path.join(f, 'index.html');
  if (!fs.existsSync(f)) { res.writeHead(404); return res.end('not found'); }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' });
  res.end(fs.readFileSync(f));
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;

const browser = await puppeteer.launch({
  executablePath: fs.existsSync(CHROME) ? CHROME : undefined,
  headless: 'new', args: ['--no-sandbox']
});

let found = 0;
for (const width of WIDTHS) {
  for (const route of ROUTES) {
    const page = await browser.newPage();
    await page.setViewport({ width, height: 900 });
    await page.goto(base + route, { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 200));

    const report = await page.evaluate(() => {
      const de = document.documentElement;
      const limit = de.clientWidth;
      const over = de.scrollWidth - limit;
      if (over <= 1) return { over, culprits: [] };

      const rows = [];
      for (const el of document.querySelectorAll('body *')) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.right <= limit + 1) continue;
        // Skip elements that are only wide because a child is: report the
        // outermost box in each chain, which is the one to actually fix.
        const parent = el.parentElement;
        if (parent && parent.getBoundingClientRect().right > limit + 1) continue;
        const cs = getComputedStyle(el);
        rows.push({
          sel: el.tagName.toLowerCase() +
            (typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/).join('.') : '') +
            (el.id ? '#' + el.id : ''),
          right: Math.round(r.right), width: Math.round(r.width),
          box: cs.boxSizing, pos: cs.position, minW: cs.minWidth,
          padL: cs.paddingLeft, padR: cs.paddingRight,
          maxW: cs.maxWidth, overflowX: cs.overflowX,
          parent: parent ? parent.tagName.toLowerCase() +
            (typeof parent.className === 'string' && parent.className ? '.' + parent.className.trim().split(/\s+/)[0] : '') : null,
          parentW: parent ? Math.round(parent.getBoundingClientRect().width) : null
        });
      }
      return { over, limit, scrollWidth: de.scrollWidth, culprits: rows.slice(0, 4) };
    });

    if (report.over > 1) {
      found++;
      console.log(`\n${route} @${width}px — overflows ${report.over}px (clientWidth ${report.limit}, scrollWidth ${report.scrollWidth})`);
      for (const c of report.culprits) {
        console.log(`  ${c.sel}`);
        console.log(`      width=${c.width} right=${c.right}  box-sizing=${c.box} position=${c.pos}`);
        console.log(`      min-width=${c.minW} max-width=${c.maxW} padding=${c.padL}/${c.padR} overflow-x=${c.overflowX}`);
        console.log(`      parent=${c.parent} (${c.parentW}px)`);
      }
    }
    await page.close();
  }
}

await browser.close();
server.close();
console.log(found ? `\n${found} overflowing combination(s)` : '\n✓ no overflow at any tested width');
if (found) process.exitCode = 1;
