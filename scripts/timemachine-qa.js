/**
 * AI Time Machine interaction QA.
 *
 * Drives the complete path the integration brief specifies — title, campaigns,
 * Photonics Shift, briefing, evidence, thesis, confirmation, jump, outcome,
 * debrief, completion, refresh, resume — in a real browser, because none of it
 * can be proven from the markup alone.
 *
 * The two assertions that matter most are the ones a screenshot would not catch:
 * that the outcome fails closed when no price has been verified, and that no
 * source published after a chapter's cutoff appears before the player commits.
 */
import puppeteer from 'puppeteer-core';
import { createServer } from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const DIST = path.join(ROOT, 'dist');
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const MIME = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png',
  '.webp': 'image/webp', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.json': 'application/json'
};

const missing = [];
const srv = createServer((q, r) => {
  let p = decodeURIComponent(q.url.split('?')[0]);
  if (p.endsWith('/')) p += 'index.html';
  if (p.startsWith('/api/')) { r.writeHead(503); return r.end('{}'); }
  const f = path.join(DIST, p);
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) {
    missing.push(p); r.writeHead(404); return r.end();
  }
  r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' });
  r.end(fs.readFileSync(f));
});
await new Promise(r => srv.listen(4700, r));

const browser = await puppeteer.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });

const errs = [];
page.on('pageerror', e => errs.push('pageerror: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
page.on('requestfailed', r => errs.push('requestfailed: ' + r.url()));

let failures = 0;
const ok = (n, c, d = '') => {
  if (!c) failures++;
  console.log((c ? '  \u2713 ' : '  \u2717 ') + n + (c || !d ? '' : ' \u2014 ' + d));
};
const wait = ms => new Promise(r => setTimeout(r, ms));
const B = 'http://localhost:4700';
const cls = () => page.$eval('#tmRoot', e => e.className);
const LOGO_RATIO = 514 / 120;

await page.goto(B + '/time-machine/', { waitUntil: 'networkidle0' });
await wait(400);

/* ---- title ---- */
ok('title screen renders', /tm-screen--title/.test(await cls()));
const logo = await page.$eval('.tm-title-top .tm-brand__logo', e => ({
  src: e.getAttribute('src'), alt: e.alt, fit: getComputedStyle(e).objectFit,
  w: e.getBoundingClientRect().width, h: e.getBoundingClientRect().height,
  nat: e.naturalWidth + 'x' + e.naturalHeight,
  bg: getComputedStyle(e).backgroundColor
}));
ok('real logo on the title screen',
  logo.src === '/Logo/logo-header.png' && logo.alt === 'TimeToCompute', JSON.stringify(logo));
ok('logo loads at native resolution', logo.nat === '514x120', logo.nat);
ok('logo uses object-fit: contain', logo.fit === 'contain', logo.fit);
ok('logo aspect ratio preserved',
  Math.abs((logo.w / logo.h) - LOGO_RATIO) < 0.08, (logo.w / logo.h).toFixed(2));
ok('no black plate behind the logo', /rgba\(0, 0, 0, 0\)|transparent/.test(logo.bg), logo.bg);
ok('the CSS "T2C" badge is gone', (await page.$$('.tm-brand__mark')).length === 0);

/* ---- campaign selection ---- */
await page.click('[data-act="campaigns"]');
await wait(250);
ok('campaign selection shows all five campaigns',
  (await page.$$eval('.tm-campaign-card', e => e.length)) === 5);

/* ---- Photonics Shift ---- */
await page.click('[data-act="open"][data-id="photonics-shift"]');
await wait(250);
ok('campaign prologue opens', /tm-screen--prologue/.test(await cls()));
await page.click('[data-act="begin"]');
await wait(250);

/* ---- briefing ---- */
ok('chapter briefing opens', /tm-screen--briefing/.test(await cls()));
ok('the knowledge cutoff is stated',
  /Knowledge cutoff/.test(await page.$eval('.tm-date-chip', e => e.textContent)));
ok('the briefing shows fact, meaning and unknown',
  (await page.$$eval('.tm-clue-stack article', e => e.length)) === 3);

/* ---- evidence drawer ---- */
await page.click('[data-act="evidence"]');
await wait(250);
const evCount = await page.$$eval('.tm-evidence-list article', e => e.length);
ok('evidence drawer opens with sources', evCount > 0, evCount + ' sources');
const evLinks = await page.$$eval('.tm-evidence-list a', a => a.map(x => ({ t: x.target, r: x.rel })));
ok('every evidence link opens safely',
  evLinks.length > 0 && evLinks.every(l => l.t === '_blank' && /noopener/.test(l.r) && /noreferrer/.test(l.r)));
ok('the drawer is a modal dialog',
  (await page.$eval('[data-sheet]', e => e.getAttribute('aria-modal'))) === 'true');
ok('focus moves into the dialog',
  await page.evaluate(() => document.querySelector('[data-sheet]').contains(document.activeElement)));

/* NO FUTURE LEAKAGE, asserted against the real dates rather than a proxy. */
const leak = await page.evaluate(() => {
  const data = JSON.parse(document.getElementById('tm-data').textContent);
  const camp = data.campaigns.find(c => c.id === 'photonics-shift');
  const ev = data.events.find(e => e.id === camp.chapterIds[0]);
  const byId = Object.fromEntries(data.sources.map(s => [s.id, s]));
  const shown = [...document.querySelectorAll('.tm-evidence-list a')].map(a => a.getAttribute('href'));
  const reveal = (ev.revealSourceIds || []).map(id => byId[id]).filter(Boolean);
  return {
    revealShown: reveal.filter(s => shown.includes(s.url)).length,
    lateShown: (ev.briefingSourceIds || []).map(id => byId[id])
      .filter(s => s && s.publishedAt > ev.cutoffAt).length
  };
});
ok('no reveal source is exposed before commitment', leak.revealShown === 0, String(leak.revealShown));
ok('no briefing source postdates its own cutoff', leak.lateShown === 0, String(leak.lateShown));

await page.keyboard.press('Escape');
await wait(200);
ok('Escape closes the drawer', (await page.$$('[data-sheet]')).length === 0);

/* ---- thesis ---- */
await page.click('[data-act="decide"]');
await wait(250);
ok('three theses are offered', (await page.$$eval('.tm-choice-card', e => e.length)) === 3);
ok('theses form a radiogroup',
  (await page.$eval('.tm-choice-grid', e => e.getAttribute('role'))) === 'radiogroup');
ok('every thesis states a mechanism and a risk',
  (await page.$$eval('.tm-choice-card__detail.is-risk', e => e.length)) === 3);
await page.click('.tm-choice-card');
await wait(200);
ok('selecting a thesis marks it chosen',
  (await page.$eval('.tm-choice-card', e => e.getAttribute('aria-checked'))) === 'true');

/* ---- confirmation ---- */
await page.click('[data-act="review"]');
await wait(250);
ok('confirmation modal opens', (await page.$$('.tm-confirm')).length === 1);
ok('confirmation warns the next screen reveals later information',
  /unavailable at the cutoff/.test(await page.$eval('.tm-confirm__warning', e => e.textContent)));

/* ---- jump ---- */
await page.click('[data-act="lock"]');
await wait(250);
ok('the time jump plays', /tm-screen--jump/.test(await cls()));

/* ---- outcome ---- */
await wait(1700);
ok('the outcome screen arrives', /tm-screen--outcome/.test(await cls()), await cls());
const pending = await page.$eval('.tm-price-pending strong', e => e.textContent).catch(() => null);
ok('fail-closed: an unverified price shows the awaiting state',
  pending === 'Market result awaiting verification', String(pending));
ok('no price was invented',
  !/\$[\d,]+\s*\u2192/.test(await page.$eval('.tm-outcome-value', e => e.textContent)));
ok('the physical chain is explained',
  (await page.$$eval('.tm-chain span', e => e.length)) === 5);
ok('later evidence is revealed',
  (await page.$$eval('.tm-later-evidence div', e => e.length)) > 0);

/* ---- debrief ---- */
await page.click('[data-act="debrief"]');
await wait(250);
ok('the debrief opens', /tm-screen--debrief/.test(await cls()));
const dbLinks = await page.$$eval('.tm-source-list a', a => a.map(x => ({ t: x.target, r: x.rel })));
ok('debrief sources open safely',
  dbLinks.length > 0 && dbLinks.every(l => l.t === '_blank' && /noopener/.test(l.r) && /noreferrer/.test(l.r)));

/* ---- completion ---- */
await page.click('[data-act="complete"]');
await wait(250);
ok('the chapter completes', /tm-screen--chapter-complete/.test(await cls()));

/* ---- persistence ---- */
const saved = await page.evaluate(() => localStorage.getItem('t2c-ai-time-machine-v1'));
ok('progress is saved locally', !!saved && /photonics-shift/.test(saved));
ok('an unverified chapter moves no capital',
  saved && JSON.parse(saved).campaigns['photonics-shift'].appliedEvents.length === 0);

await page.reload({ waitUntil: 'networkidle0' });
await wait(400);
const resumeBtn = await page.$('[data-act="resume"]');
ok('resume is offered after a refresh', !!resumeBtn);
if (resumeBtn) {
  await resumeBtn.click();
  await wait(300);
  ok('resume returns to the campaign', /tm-screen--(briefing|recap)/.test(await cls()), await cls());
}

/* ---- integration ---- */
ok('a back-to-TimeToCompute control exists', (await page.$$('.tm-utility--exit')).length === 1);
const full = await page.content();
ok('the not-investment-advice disclaimer is present', /not investment advice/i.test(full));
ok('the site shell is retained', /class="mainnav"/.test(full));

/* ---- the game may not restyle the rest of the site ---- */
await page.goto(B + '/', { waitUntil: 'networkidle0' });
await wait(300);
const bleed = await page.evaluate(() => {
  const sheets = [...document.styleSheets];
  let tmRules = 0, unscoped = 0;
  for (const s of sheets) {
    let rules; try { rules = s.cssRules; } catch (e) { continue; }
    for (const r of rules) {
      const sel = r.selectorText;
      if (!sel || !/\.tm-/.test(sel)) continue;
      tmRules++;
      if (!sel.split(',').every(p => p.trim().startsWith('.t2c-time-machine') ||
        p.trim().startsWith('.tm-shell') || p.trim().startsWith('.tm-footnote'))) unscoped++;
    }
  }
  return { tmRules, unscoped };
});
ok('no game rule escapes its scope', bleed.unscoped === 0,
  bleed.unscoped + ' of ' + bleed.tmRules + ' unscoped');

/* ---- responsive ---- */
for (const [w, h] of [[1440, 900], [1024, 768], [430, 932], [390, 844]]) {
  await page.setViewport({ width: w, height: h });
  await page.goto(B + '/time-machine/', { waitUntil: 'networkidle0' });
  await wait(350);
  const r = await page.evaluate(() => {
    const el = document.querySelector('.tm-brand__logo');
    const b = el ? el.getBoundingClientRect() : null;
    const targets = [...document.querySelectorAll('#tmRoot button, #tmRoot a')]
      .filter(x => x.offsetParent !== null)
      .map(x => x.getBoundingClientRect().height);
    return {
      overflow: document.documentElement.scrollWidth > window.innerWidth + 1,
      ratio: b ? b.width / b.height : null,
      visible: b ? b.width > 20 && b.height > 8 : false,
      tooSmall: targets.filter(t => t > 0 && t < 44).length
    };
  });
  ok(w + '\u00d7' + h + ': no horizontal overflow', !r.overflow);
  ok(w + '\u00d7' + h + ': logo visible and uncropped',
    r.visible && Math.abs(r.ratio - LOGO_RATIO) < 0.15, r.ratio ? r.ratio.toFixed(2) : 'absent');
}

console.log('\n  console/page errors: ' + (errs.length ? errs.slice(0, 6).join(' | ') : 'none'));
console.log('  404s during play: ' + (missing.length ? [...new Set(missing)].join(', ') : 'none'));
/* The QA server stubs /api/ with 503 by design, so those are expected. A 404 is
   never expected: it means a shipped page references a file that does not exist. */
const realErrs = errs.filter(e => !/503/.test(e));
if (realErrs.length || missing.length) failures++;

await browser.close();
srv.close();
console.log(failures ? '\n\u2717 ' + failures + ' failure(s)' : '\n\u2713 the full Time Machine path passes');
process.exit(failures ? 1 : 0);
