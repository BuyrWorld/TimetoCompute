/**
 * Optical centring check.
 *
 * The asset pack ships a manual "centring lab": load an asset, drag scale and
 * offset sliders, and eyeball whether the object's visual mass sits on the two
 * centre guides. That works once. It does not survive a stylesheet edit six
 * weeks later, and nobody re-opens it before a deploy.
 *
 * So the lab's pass criteria are measured here instead. For every node the
 * browser renders, this reads the actual pixels, finds the alpha bounding box of
 * the visible object, and reports where its centre really sits inside the square
 * art stage. That is a different question from "is the <img> centred" — the img
 * is always centred; the OBJECT inside its transparent margins frequently is not,
 * and that is the defect the pack exists to fix.
 *
 * Checks, mirroring the lab's stated criteria:
 *   - the object's optical centre sits within tolerance of the stage centre;
 *   - the object fills enough of the stage to read at small sizes;
 *   - the object does not overflow the stage (which would clip against the frame);
 *   - no asset is displayed above its manifest maxCssWidth, which would upscale.
 *
 * It measures the rendered result, so it is agnostic about HOW centring was
 * achieved — manifest optics, a CSS change, or new artwork all get judged the
 * same way.
 */
import puppeteer from 'puppeteer-core';
import { createServer } from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ART_BY_ID } from '../data/artpack.js';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const DIST = path.join(ROOT, 'dist');
const PORT = 4610;

/* How far an object's optical centre may sit from the stage centre before it
   reads as misaligned beside its neighbours. Three percent of the stage is about
   2px on an 84px node — under the threshold where a row of seven looks ragged,
   and tight enough that a stylesheet change which quietly re-breaks centring
   fails here rather than shipping. */
const CENTRE_TOLERANCE = 3;
/* Below this the object floats in a large empty hexagon; above it, it collides
   with the frame. Both are lab failures. */
const MIN_FILL = 55;
const MAX_FILL = 99;

const MIME = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript',
  '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml',
  '.jpg': 'image/jpeg', '.json': 'application/json', '.xml': 'application/xml',
  '.txt': 'text/plain', '.ico': 'image/x-icon'
};

function serve() {
  const srv = createServer((q, r) => {
    let p = decodeURIComponent(q.url.split('?')[0]);
    if (p.endsWith('/')) p += 'index.html';
    const f = path.join(DIST, p);
    if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
    r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' });
    r.end(fs.readFileSync(f));
  });
  return new Promise(res => srv.listen(PORT, () => res(srv)));
}

/**
 * Measure every rendered cutout on the page.
 *
 * Runs in the browser because only the browser knows which srcset entry was
 * chosen, what the optics transform resolved to, and how large the box ended up.
 * The object is redrawn into a canvas at a fixed sample size so a 77px node and
 * a 172px node are measured on the same scale.
 */
const measure = async page => page.evaluate((tol) => {
  const S = 200;
  const out = [];
  for (const node of document.querySelectorAll('.cn-node')) {
    const img = node.querySelector('.cn-asset');
    const stage = node.querySelector('.cn-cut');
    if (!img || !stage || !img.complete || !img.naturalWidth) continue;

    const cs = getComputedStyle(img);
    const box = img.getBoundingClientRect();
    const stageBox = stage.getBoundingClientRect();

    const c = document.createElement('canvas');
    c.width = S; c.height = S;
    const ctx = c.getContext('2d', { willReadFrequently: true });

    /* Draw the object the way `object-fit: contain` would inside a square box,
       then apply the same scale the optics transform applies, so the measurement
       reflects what the reader actually sees. */
    const scale = parseFloat(
      (cs.transform.match(/matrix\(([-\d.]+)/) || [])[1] || '1'
    ) || 1;
    const nw = img.naturalWidth, nh = img.naturalHeight;
    const fit = Math.min(S / nw, S / nh) * scale;
    const dw = nw * fit, dh = nh * fit;
    ctx.drawImage(img, (S - dw) / 2, (S - dh) / 2, dw, dh);

    const d = ctx.getImageData(0, 0, S, S).data;
    let x0 = S, y0 = S, x1 = -1, y1 = -1;
    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        if (d[(y * S + x) * 4 + 3] > 12) {
          if (x < x0) x0 = x; if (x > x1) x1 = x;
          if (y < y0) y0 = y; if (y > y1) y1 = y;
        }
      }
    }
    if (x1 < 0) { out.push({ stage: node.dataset.stage, empty: true }); continue; }

    /* The optics x/y nudge moves the whole img box, so it is read from the
       resolved transform rather than re-derived from the pixels. */
    const m = cs.transform.match(/matrix\(([^)]+)\)/);
    const parts = m ? m[1].split(',').map(Number) : [1, 0, 0, 1, 0, 0];
    const shiftX = (parts[4] / Math.max(box.width, 1)) * 100;
    const shiftY = (parts[5] / Math.max(box.height, 1)) * 100;

    out.push({
      stage: node.dataset.stage,
      fillW: +(((x1 - x0 + 1) / S) * 100).toFixed(1),
      fillH: +(((y1 - y0 + 1) / S) * 100).toFixed(1),
      cX: +(((((x0 + x1) / 2) / S) * 100) + shiftX).toFixed(1),
      cY: +(((((y0 + y1) / 2) / S) * 100) + shiftY).toFixed(1),
      renderedW: Math.round(box.width),
      stageW: Math.round(stageBox.width),
      objectFit: cs.objectFit,
      objectPosition: cs.objectPosition,
      opacity: +cs.opacity
    });
  }
  return out;
}, CENTRE_TOLERANCE);

const srv = await serve();
const browser = await puppeteer.launch({
  executablePath: process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  args: ['--no-sandbox']
});

let failures = 0;
const fail = m => { failures++; console.log(`  ✗ ${m}`); };
const ok = m => console.log(`  ✓ ${m}`);

/* Widths that change the chain's layout, from the pack's QA list. */
for (const [w, h, label] of [[1440, 900, '1440px'], [1024, 768, '1024px'], [390, 844, '390px']]) {
  const page = await browser.newPage();
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
  await page.evaluate(async () => {
    for (let y = 0; y < 2400; y += 400) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 50)); }
    window.scrollTo(0, 0);
  });
  await new Promise(r => setTimeout(r, 500));

  const rows = await measure(page);
  console.log(`\n${label} — ${rows.length} nodes`);
  if (!rows.length) fail(`${label}: no chain nodes rendered`);

  for (const r of rows) {
    if (r.empty) { fail(`${label}/${r.stage}: renders no visible pixels`); continue; }

    const dx = Math.abs(r.cX - 50), dy = Math.abs(r.cY - 50);
    const centred = dx <= CENTRE_TOLERANCE && dy <= CENTRE_TOLERANCE;
    const filled = Math.max(r.fillW, r.fillH) >= MIN_FILL && Math.max(r.fillW, r.fillH) <= MAX_FILL;

    const line = `${label}/${r.stage.padEnd(10)} centre ${r.cX}%,${r.cY}% ` +
      `(off ${dx.toFixed(1)},${dy.toFixed(1)}) fill ${r.fillW}×${r.fillH}% @ ${r.renderedW}px`;

    if (!centred) fail(`${line} — optical centre outside ±${CENTRE_TOLERANCE}%`);
    else if (!filled) fail(`${line} — fills ${Math.max(r.fillW, r.fillH)}% of the stage, wanted ${MIN_FILL}–${MAX_FILL}%`);
    else ok(line);

    if (r.objectFit !== 'contain') fail(`${label}/${r.stage}: object-fit is ${r.objectFit}, must be contain`);
    if (r.opacity < 0.72 && r.stage) {
      // Only an explicitly unknown stage may drop below the pack's floor.
      const cls = await page.$eval(`.cn-node[data-stage="${r.stage}"]`, e => e.className);
      if (!cls.includes('is-gap')) {
        fail(`${label}/${r.stage}: opacity ${r.opacity} is below the pack's .72 floor`);
      }
    }
  }
  await page.close();
}

/* Nothing may be displayed above its manifest ceiling, which would upscale a
   raster into softness — the defect the pack asks to be ruled out explicitly. */
console.log('\nmanifest ceilings');
{
  const page = await browser.newPage();
  await page.setViewport({ width: 3840, height: 1400, deviceScaleFactor: 1 });
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 400));
  const widest = await page.$$eval('.cn-node', ns => ns.map(n => ({
    stage: n.dataset.stage,
    w: Math.round(n.querySelector('.cn-asset').getBoundingClientRect().width)
  })));
  const STEM = {
    materials: 'materials', wafers: 'wafer', chips: 'chips-hbm', photonics: 'photonics',
    factory: 'ai-factory', accepted: 'accepted', revenue: 'revenue'
  };
  for (const r of widest) {
    const a = ART_BY_ID[STEM[r.stage]];
    if (!a) { fail(`${r.stage}: no manifest entry`); continue; }
    if (r.w > a.maxCssWidth) fail(`${r.stage}: ${r.w}px exceeds manifest ceiling ${a.maxCssWidth}px`);
    else ok(`${r.stage.padEnd(10)} ${r.w}px ≤ ${a.maxCssWidth}px ceiling`);
  }
  await page.close();
}

await browser.close();
srv.close();

if (failures) {
  console.log(`\n✗ ${failures} centring failure(s)`);
  process.exit(1);
}
console.log('\n✓ every cutout is optically centred, adequately filled and within its manifest ceiling');
