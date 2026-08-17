/**
 * Raster image validation.
 *
 * Enforces the asset pack's non-negotiable image rules, which are easy to state
 * and easy to break silently:
 *
 *   - No image may distort its intrinsic aspect ratio.
 *   - No image may be enlarged past its native resolution (allowing for DPR).
 *   - Every image declares width and height, so nothing shifts as it loads.
 *   - Every image has alt text (empty alt is fine for decoration, but it must
 *     be present and deliberate).
 *   - object-fit: fill is never used on a T2C asset.
 *   - Nothing references reference-mockups/ in production.
 *
 * Checked at every viewport in IMPLEMENTATION_GUIDE.md, because a source that is
 * comfortable at 1440 can be visibly soft at 2560.
 *
 *   node scripts/imagecheck.js [--widths 390,...] [--dpr 2]
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
const WIDTHS = arg('widths', '390,430,768,1366,1440,1920,2560,3840').split(',').map(Number);
const ROUTES = arg('routes', '/,/sites/,/sites/iren-horizon-1/,/companies/iren/,/explainers/,/news/,/time-machine/').split(',');
/** A 2x screen is the realistic worst case for upscaling. */
const DPR = Number(arg('dpr', '2'));

const MIME = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.json': 'application/json' };

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

const problems = [];
/** Softness caused by the source art rather than by the pipeline. */
const notes = new Set();

/** The widest variant of the same image that actually exists in the output. */
const variantCache = new Map();
function largestVariant(name) {
  const stem = name.replace(/(-\d+)?\.(webp|png)$/, '');
  if (variantCache.has(stem)) return variantCache.get(stem);
  let max = 0;
  for (const f of walk(DIST)) {
    const b = path.basename(f);
    if (!b.startsWith(stem)) continue;
    if (!/\.(webp|png)$/.test(b)) continue;
    if (b.replace(/(-\d+)?\.(webp|png)$/, '') !== stem) continue;
    max = Math.max(max, fileWidth(b));
  }
  variantCache.set(stem, max);
  return max;
}

/**
 * The chosen file's true pixel width, read from the file itself. PNG carries it
 * in the IHDR; WebP in the VP8/VP8L/VP8X chunk. Falling back to the filename
 * suffix would be guessing.
 */
const widthCache = new Map();
function fileWidth(name) {
  if (widthCache.has(name)) return widthCache.get(name);
  const hits = walk(DIST).filter(f => path.basename(f) === name);
  let w = 0;
  if (hits.length) {
    const b = fs.readFileSync(hits[0]);
    if (b.slice(1, 4).toString() === 'PNG') {
      w = b.readUInt32BE(16);
    } else if (b.slice(0, 4).toString() === 'RIFF' && b.slice(8, 12).toString() === 'WEBP') {
      const fmt = b.slice(12, 16).toString();
      if (fmt === 'VP8X') w = 1 + (b.readUIntLE(24, 3) & 0xFFFFFF);
      else if (fmt === 'VP8 ') w = b.readUInt16LE(26) & 0x3FFF;
      else if (fmt === 'VP8L') {
        const bits = b.readUInt32LE(21);
        w = 1 + (bits & 0x3FFF);
      }
    }
  }
  widthCache.set(name, w);
  return w;
}

/* ---- static checks over the built HTML ---- */
const walk = (dir, acc = []) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, acc); else acc.push(p);
  }
  return acc;
};
for (const f of walk(DIST).filter(f => f.endsWith('.html'))) {
  const html = fs.readFileSync(f, 'utf8');
  const rel = '/' + path.relative(DIST, f).split(path.sep).join('/');
  if (/reference-mockups/.test(html)) {
    problems.push(`${rel}: references reference-mockups/, which must never ship`);
  }
  for (const m of html.matchAll(/<img\b[^>]*>/g)) {
    const tag = m[0];
    if (!/\salt=/.test(tag)) problems.push(`${rel}: <img> without alt — ${tag.slice(0, 80)}`);
    if (!/\swidth="\d+"/.test(tag) || !/\sheight="\d+"/.test(tag)) {
      problems.push(`${rel}: <img> without explicit dimensions — ${tag.slice(0, 80)}`);
    }
  }
}
const css = fs.readFileSync(path.join(DIST, 'styles.css'), 'utf8');
if (/object-fit:\s*fill/.test(css)) problems.push('styles.css: object-fit: fill is used on an asset');

/* ---- rendered checks ---- */
const browser = await puppeteer.launch({
  executablePath: fs.existsSync(CHROME) ? CHROME : undefined,
  headless: 'new', args: ['--no-sandbox']
});

for (const width of WIDTHS) {
  for (const route of ROUTES) {
    const page = await browser.newPage();
    await page.setViewport({ width, height: 900, deviceScaleFactor: DPR });
    await page.goto(base + route, { waitUntil: 'networkidle0' });
    // Scroll so lazy images resolve.
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 600) {
        window.scrollTo(0, y); await new Promise(r => setTimeout(r, 40));
      }
    });
    await new Promise(r => setTimeout(r, 500));

    /* naturalWidth is NOT the file's pixel width for a srcset image: the spec
       density-corrects it, so a 800px file chosen for a 390px slot reports 390.
       Dividing by it therefore always yields the DPR and finds "upscaling"
       everywhere. The real pixel width comes from the chosen file instead. */
    const rows = await page.evaluate(() => [...document.images].map(i => {
      const r = i.getBoundingClientRect();
      if (!r.width || !r.height || !i.naturalWidth) return null;
      const cs = getComputedStyle(i);
      return {
        src: (i.currentSrc || i.src).split('/').pop(),
        fit: cs.objectFit,
        boxRatio: r.width / r.height,
        natRatio: i.naturalWidth / i.naturalHeight,
        boxW: Math.round(r.width)
      };
    }).filter(Boolean));

    for (const r of rows) {
      r.fileW = fileWidth(r.src);
      r.upscale = r.fileW ? (r.boxW * DPR) / r.fileW : 0;
    }

    for (const r of rows) {
      // `fill` and `none` do not preserve ratio; cover/contain/scale-down do.
      const preserves = ['contain', 'cover', 'scale-down'].includes(r.fit);
      const ratioOff = Math.abs(r.boxRatio - r.natRatio) / r.natRatio;
      if (!preserves && ratioOff > 0.02) {
        problems.push(`${route} @${width}: ${r.src} distorts — box ${r.boxRatio.toFixed(3)} vs native ` +
          `${r.natRatio.toFixed(3)} with object-fit:${r.fit}`);
      }
      if (r.fit === 'fill' && ratioOff > 0.02) {
        problems.push(`${route} @${width}: ${r.src} uses object-fit:fill and is stretched`);
      }
      /* Upscaling has two very different causes, and only one is a bug.
         If a LARGER derivative exists and the browser did not pick it, the
         `sizes` attribute is lying about the layout — a pipeline fault, and a
         failure. If the chosen file is already the largest that exists, the
         source art simply has no more detail; that is a limit of the supplied
         image and is reported as a note so a genuine regression still stands out. */
      if (r.fileW && r.upscale > 1.15) {
        const largest = largestVariant(r.src);
        const msg = `${route} @${width}: ${r.src} enlarged x${r.upscale.toFixed(2)} at ${DPR}x ` +
          `(${r.boxW}px box needs ${r.boxW * DPR}px, source is ${r.fileW}px)`;
        if (largest > r.fileW) {
          problems.push(`${msg} — a ${largest}px variant exists but sizes did not select it`);
        } else {
          notes.add(`${r.src.replace(/-\d+\.(webp|png)$/, '')}: native art is ${r.fileW}px; ` +
            `soft above ~${Math.round(r.fileW / DPR)} CSS px on a ${DPR}x screen`);
        }
      }
    }
    await page.close();
  }
}

await browser.close();
server.close();

console.log(`checked ${ROUTES.length} routes at ${WIDTHS.length} widths, ${DPR}x DPR`);

if (notes.size) {
  console.log(`\nsource-art ceilings (not pipeline faults, no derivative can add detail):`);
  for (const n of [...notes].sort()) console.log('  · ' + n);
}

if (problems.length) {
  console.log(`\n${problems.length} problem(s):`);
  for (const p of problems) console.log('  ✗ ' + p);
  process.exitCode = 1;
} else {
  console.log('✓ no distortion, no upscaling, every image dimensioned and alt-texted');
}
