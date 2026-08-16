/**
 * Visual QA. Serves dist/ and screenshots every route at four widths, reporting
 * horizontal overflow and console errors as it goes.
 *
 * Overflow is the check that matters: a page that scrolls sideways on a phone is
 * broken in a way no unit test sees.
 *
 *   node scripts/shots.js [--widths 1440,1024,768,390] [--out shots]
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const DIST = path.join(ROOT, 'dist');
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const arg = (name, fallback) => {
  const i = process.argv.indexOf('--' + name);
  return i > -1 ? process.argv[i + 1] : fallback;
};
const WIDTHS = arg('widths', '1440,1024,768,390').split(',').map(Number);
const OUT = path.join(ROOT, arg('out', 'shots'));

const ROUTES = [
  ['home', '/'],
  ['chain', '/chain/'],
  ['explainers', '/explainers/'],
  ['companies', '/companies/'],
  ['sites', '/sites/'],
  ['site-horizon1', '/sites/iren-horizon-1/'],
  ['intelligence', '/intelligence/'],
  ['compare', '/compare/?c=IREN,WULF,APLD'],
  ['catalysts', '/catalysts/'],
  ['lab', '/lab/'],
  ['research', '/research/'],
  ['company-iren', '/companies/iren/'],
  ['methodology', '/methodology/']
];

const MIME = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.json': 'application/json',
  '.xml': 'application/xml', '.txt': 'text/plain', '.webmanifest': 'application/manifest+json'
};

function serve() {
  return new Promise(resolve => {
    const server = http.createServer((req, res) => {
      let p = decodeURIComponent(req.url.split('?')[0]);
      // /api is a Vercel function, not a file. Stub it so the feed state machine
      // exercises its real "failed" branch rather than reporting a spurious 404.
      if (p.startsWith('/api/')) {
        res.writeHead(503, { 'content-type': 'application/json' });
        return res.end(JSON.stringify({ error: 'offline in visual QA' }));
      }
      let file = path.join(DIST, p);
      if (!path.extname(file)) file = path.join(file, 'index.html');
      if (!fs.existsSync(file)) { res.writeHead(404); return res.end('not found'); }
      res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream' });
      res.end(fs.readFileSync(file));
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

const run = async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const server = await serve();
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await puppeteer.launch({
    executablePath: fs.existsSync(CHROME) ? CHROME : undefined,
    headless: 'new',
    args: ['--no-sandbox', '--font-render-hinting=none']
  });

  const problems = [];
  for (const width of WIDTHS) {
    for (const [name, route] of ROUTES) {
      const page = await browser.newPage();
      await page.setViewport({ width, height: 900, deviceScaleFactor: 1 });
      const errors = [];
      page.on('pageerror', e => errors.push('pageerror: ' + e.message));
      page.on('console', m => {
        if (m.type() !== 'error') return;
        // The stubbed /api is expected to fail here; that is the point of the stub.
        const from = (m.location() || {}).url || '';
        if (from.includes('/api/')) return;
        errors.push('console: ' + m.text());
      });
      page.on('requestfailed', r => {
        if (!r.url().includes('/api/')) errors.push('requestfailed: ' + r.url());
      });

      await page.goto(base + route, { waitUntil: 'networkidle0', timeout: 45000 });
      /* Walk the page so lazy images actually load. Without this a full-page
         screenshot shows empty boxes where below-the-fold imagery belongs, and
         the shot misrepresents the page rather than recording it. */
      await page.evaluate(async () => {
        for (let y = 0; y < document.body.scrollHeight; y += 600) {
          window.scrollTo(0, y);
          await new Promise(r => setTimeout(r, 45));
        }
        window.scrollTo(0, 0);
      });
      // give the canvas and any client render a frame
      await new Promise(r => setTimeout(r, 450));

      const metrics = await page.evaluate(() => {
        const de = document.documentElement;
        const over = [];
        if (de.scrollWidth > de.clientWidth + 1) {
          for (const el of document.querySelectorAll('body *')) {
            const r = el.getBoundingClientRect();
            if (r.right > de.clientWidth + 1 && r.width > 0) {
              over.push({
                sel: el.tagName.toLowerCase() + (el.className && typeof el.className === 'string'
                  ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : ''),
                right: Math.round(r.right), w: Math.round(r.width)
              });
            }
          }
        }
        // smallest interactive target, which must clear 44px
        let smallest = null;
        for (const el of document.querySelectorAll('a,button,select,input,summary')) {
          const r = el.getBoundingClientRect();
          if (!r.width || !r.height) continue;
          if (!smallest || r.height < smallest.h) {
            smallest = { h: Math.round(r.height), sel: el.tagName.toLowerCase() + '.' + (el.className || '') };
          }
        }
        return { scrollWidth: de.scrollWidth, clientWidth: de.clientWidth, over: over.slice(0, 6), smallest };
      });

      const overflow = metrics.scrollWidth - metrics.clientWidth;
      if (overflow > 1) problems.push(`${name} @${width}: overflows by ${overflow}px — ` +
        metrics.over.map(o => `${o.sel} (right ${o.right})`).join(', '));
      for (const e of errors) problems.push(`${name} @${width}: ${e}`);

      await page.screenshot({ path: path.join(OUT, `${width}-${name}.png`), fullPage: width === 1440 });
      console.log(`  ${width.toString().padStart(4)}px ${name.padEnd(16)} ` +
        `${overflow > 1 ? `OVERFLOW ${overflow}px` : 'ok'}` +
        `${errors.length ? `  ${errors.length} error(s)` : ''}` +
        `  min target ${metrics.smallest ? metrics.smallest.h + 'px' : 'n/a'}`);
      await page.close();
    }
  }

  await browser.close();
  server.close();

  console.log(`\nshots → ${path.relative(ROOT, OUT)}/`);
  if (problems.length) {
    console.log(`\n${problems.length} problem(s):`);
    for (const p of problems) console.log('  ✗ ' + p);
    process.exitCode = 1;
  } else {
    console.log('\n✓ no overflow, no console errors');
  }
};

run().catch(e => { console.error(e); process.exit(1); });
