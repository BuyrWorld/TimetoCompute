/**
 * Interaction QA. Drives the built site in a real browser and asserts the things
 * only a running page can prove: that the filters filter, that the Lab recomputes,
 * that a saved call survives a reload, that keyboard focus reaches the controls,
 * and that a legacy hash still lands on its route.
 *
 *   node scripts/interact.js
 */
import { chainState } from '../src/lib/chain.js';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const DIST = path.join(ROOT, 'dist');
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const MIME = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json',
  '.xml': 'application/xml', '.txt': 'text/plain'
};

function serve() {
  return new Promise(resolve => {
    const server = http.createServer((req, res) => {
      const p = decodeURIComponent(req.url.split('?')[0]);
      /* The news feed is the one page whose whole content comes from the API, so
         a blanket 503 would leave it untested. It gets a fixture reproducing the
         shapes that actually matter: a story with its own artwork, a Yahoo story
         carrying the generic house placeholder every Yahoo item shares, and a
         story with no image at all. Everything else still fails, so the rest of
         the site is exercised against an unavailable provider. */
      if (p === '/api/catalysts') {
        const day = n => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
        res.writeHead(200, { 'content-type': 'application/json' });
        return res.end(JSON.stringify({ available: true, events: [
          { id: 'earn-NVDA', ticker: 'NVDA', title: 'NVDA quarterly results', category: 'earnings', status: 'confirmed-date',
            expectedAt: day(1), expectedWindowStart: null, expectedWindowEnd: null, session: 'amc', quarter: 3, year: 2027,
            timezone: 'America/New_York', confidence: 'confirmed', isCompanyGuidance: false, provider: 'finnhub',
            affectsMetric: null, description: 'Scheduled quarterly results.' },
          { id: 'earn-IREN', ticker: 'IREN', title: 'IREN quarterly results', category: 'earnings', status: 'confirmed-date',
            expectedAt: day(11), expectedWindowStart: null, expectedWindowEnd: null, session: null,
            timezone: 'America/New_York', confidence: 'confirmed', isCompanyGuidance: false, provider: 'finnhub',
            affectsMetric: null, description: 'Scheduled quarterly results.' }
        ] }));
      }
      if (p === '/api/news') {
        // A reachable image, so the card's own onerror handler does not remove it.
        const realArt = `http://${req.headers.host}/Logo/logo-header.png`;
        res.writeHead(200, { 'content-type': 'application/json' });
        return res.end(JSON.stringify({
          count: 4,
          items: [
            {
              headline: 'IREN expands Childress with its own artwork', url: 'https://example.com/a',
              source: 'Benzinga', datetime: Math.floor(Date.now() / 1000) - 3600,
              image: realArt, symbols: ['IREN']
            },
            {
              headline: 'CoreWeave and Nebius sign capacity deal on Yahoo placeholder day', url: 'https://example.com/b',
              source: 'Yahoo', datetime: Math.floor(Date.now() / 1000) - 7200,
              image: 'https://s.yimg.com/rz/stage/p/yahoo_finance_en-US_h_p_finance_2.png',
              symbols: ['CRWV', 'NBIS']
            },
            {
              headline: 'TSMC warns of tight advanced-packaging supply', url: 'https://example.com/c',
              source: 'SeekingAlpha', datetime: Math.floor(Date.now() / 1000) - 86400,
              image: null, symbols: ['TSM']
            },
            {
              headline: "Here's what $10,000 invested in Nvidia could be worth by 2030", url: 'https://example.com/e',
              source: 'Yahoo', datetime: Math.floor(Date.now() / 1000) - 900,
              image: null, symbols: ['NVDA']
            },
            {
              headline: 'Elon Musk delivers spectacular news for rocket investors', url: 'https://example.com/d',
              source: 'Yahoo', datetime: Math.floor(Date.now() / 1000) - 600,
              image: null, symbols: ['NVDA']
            }
          ]
        }));
      }
      /* A digest whose points have already been checked server-side; the
         button only appears in a build that has unreviewed filings
         (T2C_FRESHNESS_FIXTURE), so the check below runs only then. */
      if (p === '/api/digest') {
        res.writeHead(200, { 'content-type': 'application/json' });
        return res.end(JSON.stringify({ ok: true, headline: 'IREN reported its full-year results.', unverifiedDropped: 1,
          truncated: false, writtenAt: new Date().toISOString(),
          points: [{ point: 'Signed a multi-year contract with a frontier AI lab.', quote: 'Signed a new multi-year AI Cloud contract with a leading frontier AI lab' }] }));
      }
      if (p.startsWith('/api/')) {
        res.writeHead(503, { 'content-type': 'application/json' });
        return res.end('{"error":"offline in QA"}');
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

const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok, detail });
  console.log(`  ${ok ? '✓' : '✗'} ${name}${ok || !detail ? '' : ' — ' + detail}`);
};

const run = async () => {
  const server = await serve();
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await puppeteer.launch({
    executablePath: fs.existsSync(CHROME) ? CHROME : undefined,
    headless: 'new', args: ['--no-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const errors = [];
  page.on('pageerror', e => errors.push(e.message));

  /* ---- legacy hashes still resolve ---- */
  await page.goto(base + '/#odds', { waitUntil: 'networkidle0' });
  check('legacy #odds lands on Companies now the Lab is retired',
    page.url().includes('/companies/'), page.url());

  await page.goto(base + '/#capacity', { waitUntil: 'networkidle0' });
  check('legacy #capacity lands on Research', page.url().includes('/research/'), page.url());

  /* ---- companies filter and sort ---- */
  await page.goto(base + '/companies/', { waitUntil: 'networkidle0' });
  const before = await page.$$eval('#companyGrid .snap', els => els.filter(e => !e.hidden).length);
  await page.select('#coModel', 'poweredShell');
  await new Promise(r => setTimeout(r, 120));
  const after = await page.$$eval('#companyGrid .snap', els => els.filter(e => !e.hidden).length);
  check('the operating-model filter narrows the grid', after > 0 && after < before, `${before} → ${after}`);

  const count = await page.$eval('#coCount', el => el.textContent);
  check('the result count matches what is visible', count.startsWith(String(after)), count);

  await page.select('#coModel', '');
  await page.select('#coSort', 'name');
  await new Promise(r => setTimeout(r, 120));
  const names = await page.$$eval('#companyGrid .snap', els =>
    els.map(e => e.getAttribute('data-name')));
  check('sorting by name orders the grid',
    names.join('|') === [...names].sort((a, b) => a.localeCompare(b)).join('|'), names.join(', '));

  const q = await page.$('#coSearch');
  await q.type('tera');
  await new Promise(r => setTimeout(r, 150));
  const searched = await page.$$eval('#companyGrid .snap', els => els.filter(e => !e.hidden).length);
  check('search narrows to a single match', searched === 1, `${searched} shown`);

  /* ---- the supply-chain homepage ---- */
  await page.goto(base + '/', { waitUntil: 'networkidle0' });
  const h1s = await page.$$eval('h1', els => els.map(e => e.textContent.trim()));
  check('the homepage has exactly one h1 and it is the proposition',
    h1s.length === 1 && /ground to the app/.test(h1s[0]), JSON.stringify(h1s));
  const cols = await page.$$eval('.cxcol', els => els.length);
  check('the chain shows twelve illustrated columns', cols === 12, `${cols}`);

  await page.click('[data-co="nvidia"]');
  await new Promise(r => setTimeout(r, 250));
  const trace = await page.evaluate(() => ({
    picked: document.querySelectorAll('.cxco.is-picked').length,
    up: [...document.querySelectorAll('.cxco.is-up')].map(b => b.dataset.co),
    down: [...document.querySelectorAll('.cxco.is-down')].map(b => b.dataset.co),
    open: document.getElementById('cxDrawer').open,
    pressed: document.querySelector('[data-co="nvidia"]').getAttribute('aria-pressed')
  }));
  check('picking a company lights its upstream suppliers', trace.up.includes('tsmc') && trace.up.includes('micron'), trace.up.join(','));
  check('picking a company lights its downstream customers', trace.down.includes('coreweave') && trace.down.includes('meta'), trace.down.join(','));
  check('the picked company is marked for assistive technology', trace.picked === 1 && trace.pressed === 'true');
  check('picking a company opens its details', trace.open);
  const drawerText = await page.$eval('#cxdBody', el => el.textContent);
  check('the details quote the filing behind each link', /We utilize foundries/.test(drawerText));
  check('the details say who it buys from and who it sells to', /Buys from/.test(drawerText) && /Sells to/.test(drawerText));

  await page.click('#cxdBody [data-go="tsmc"]');
  await new Promise(r => setTimeout(r, 200));
  const hopped = await page.$eval('#cxdName', el => el.textContent);
  check('a linked company opens from inside the details', /TSMC/.test(hopped), hopped);

  await page.keyboard.press('Escape');
  await new Promise(r => setTimeout(r, 150));
  const closed = await page.$eval('#cxDrawer', el => !el.open);
  check('Escape closes the details', closed);
  await page.click('[data-co="tsmc"]');
  await new Promise(r => setTimeout(r, 150));
  const cleared = await page.$$eval('.cxco.is-picked', els => els.length);
  check('tapping the picked company again clears the trace', cleared === 0, `${cleared}`);

  /* ---- twelve stages: deep link, +N more, arrows ---- */
  await page.goto(base + '/?entity=arista', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 300));
  const deepLink = await page.evaluate(() => ({
    picked: (document.querySelector('.cxco.is-picked') || {}).dataset?.co || null,
    up: [...document.querySelectorAll('.cxco.is-up')].map(b => b.dataset.co)
  }));
  check('a deep link opens the chain traced from that company', deepLink.picked === 'arista', JSON.stringify(deepLink));
  check('the deep-linked trace shows its disclosed supplier', deepLink.up.includes('broadcom'), deepLink.up.join(','));
  await page.keyboard.press('Escape');
  await page.goto(base + '/', { waitUntil: 'networkidle0' });
  const more = await page.evaluate(() => {
    const col = document.querySelector('.cxcol.is-collapsed');
    const hiddenBefore = [...col.querySelectorAll('.is-extra')].filter(li => getComputedStyle(li).display === 'none').length;
    col.querySelector('.cxmore').click();
    const hiddenAfter = [...col.querySelectorAll('.is-extra')].filter(li => getComputedStyle(li).display === 'none').length;
    return { hiddenBefore, hiddenAfter, expanded: col.querySelector('.cxmore').getAttribute('aria-expanded') };
  });
  check('"+N more" reveals the rest of a column and says so', more.hiddenBefore > 0 && more.hiddenAfter === 0 && more.expanded === 'true', JSON.stringify(more));
  const scrolled = await page.evaluate(async () => {
    const t = document.getElementById('cxTrack'); const before = t.scrollLeft;
    document.getElementById('cxNext').click();
    await new Promise(r => setTimeout(r, 700));
    return t.scrollLeft > before;
  });
  check('the forward arrow scrolls the twelve-stage chain', scrolled);

  /* ---- a site page: status, news, what comes next ---- */
  await page.goto(base + '/sites/apld-polaris-1/', { waitUntil: 'networkidle0' });
  const site = await page.evaluate(() => ({
    status: (document.querySelector('.hmstatus') || {}).textContent || '',
    news: (document.getElementById('siteNews') || {}).textContent || '',
    rail: document.querySelectorAll('.ed-railstep').length
  }));
  check('a site page leads with one status label', /Billing|Live|Building|Planned/.test(site.status), site.status);
  check('a site page settles its news list rather than spinning', !/Loading/.test(site.news), site.news.slice(0, 60));
  check('the stage rail is gone from site pages', site.rail === 0, `${site.rail}`);

  /* 404 recovery */
  await page.goto(base + '/404.html', { waitUntil: 'networkidle0' });
  const nf = await page.evaluate(() => ({
    h1: (document.querySelector('h1') || {}).textContent || '',
    nav: !!document.querySelector('.mainnav'),
    search: !!document.querySelector('#palette'),
    routes: document.querySelectorAll('.ed-card[href]').length
  }));
  check('the 404 is branded and offers recovery routes',
    /isn.t here/i.test(nf.h1) && nf.nav && nf.search && nf.routes >= 5, JSON.stringify(nf));

  /* ---- AI news hub ---- */
  await page.goto(base + '/news/', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 400));
  const hub = await page.$$eval('.nhstory', els => els.map(e => ({
    h: e.querySelector('.nhstoryh').textContent,
    img: (e.querySelector('.nhimg') || {}).src || null,
    touches: [...e.querySelectorAll('.nhtag-op')].map(t => t.firstChild.textContent.trim())
  })));
  check('the hub shows only stories that name a company on the map', hub.length === 3 && !hub.some(x => /Musk/.test(x.h)),
    hub.map(x => x.h).join(' | '));
  const own = hub.find(x => /artwork/.test(x.h));
  check('a story with its own artwork keeps it', own && /logo-header\.png$/.test(own.img || ''), JSON.stringify(own));
  const yahoo = hub.find(x => /placeholder/.test(x.h));
  check('a publisher house placeholder is not shown as story art', yahoo && yahoo.img === null, JSON.stringify(yahoo));
  const tsmc = hub.find(x => /TSMC/.test(x.h));
  check('a chip story reaches the neoclouds through disclosed links',
    tsmc && ['IREN', 'CoreWeave', 'Nebius'].every(n => tsmc.touches.includes(n)), JSON.stringify(tsmc && tsmc.touches));
  check('stock-tip commentary is hidden by default', !hub.some(x => /could be worth/.test(x.h)));
  await page.click('#nhMore');
  await new Promise(r => setTimeout(r, 150));
  const withAll = await page.$$eval('.nhstory .nhstoryh', els => els.map(e => e.textContent));
  const moreLabel = await page.$eval('#nhMore', el => el.textContent);
  check('one tap shows the market commentary, and says it can hide it again',
    withAll.some(h => /could be worth/.test(h)) && /Hide/.test(moreLabel), moreLabel);
  await page.click('#nhMore');
  const hexes = await page.$$eval('.nhstory .nhhex img', els => els.length);
  check('each mapped story carries its stage art', hexes >= 3, `${hexes}`);

  await page.click('[data-filter="stage-1"]');
  await new Promise(r => setTimeout(r, 150));
  const proc = await page.$$eval('.nhstory', els => els.length);
  const stagePressed = await page.$eval('[data-filter="stage-1"]', el => el.getAttribute('aria-pressed'));
  check('a stage filter narrows the stories and says it is on', proc === 1 && stagePressed === 'true', `${proc} ${stagePressed}`);

  await page.click('[data-mkind="image"]');
  await new Promise(r => setTimeout(r, 150));
  const models = await page.evaluate(() => ({
    shown: [...document.querySelectorAll('.nhmodel')].filter(m => !m.hidden).map(m => m.dataset.kind),
    provs: [...document.querySelectorAll('.nhprov')].filter(p => !p.hidden).length
  }));
  check('the model filter shows only that kind, and hides empty providers',
    models.shown.length > 0 && models.shown.every(k => k === 'image') && models.provs < 10, JSON.stringify(models));

  /* ---- sites directory filters and restores ---- */
  await page.goto(base + '/sites/', { waitUntil: 'networkidle0' });
  const sitesBefore = await page.$$eval('#siteGrid .sitecard', els => els.filter(e => !e.hidden).length);
  await page.select('#siteCountry', 'FI');
  await new Promise(r => setTimeout(r, 150));
  const sitesAfter = await page.$$eval('#siteGrid .sitecard', els => els.filter(e => !e.hidden).length);
  check('the country filter narrows the site grid',
    sitesAfter > 0 && sitesAfter < sitesBefore, `${sitesBefore} → ${sitesAfter}`);
  check('the site filter writes itself into the URL', page.url().includes('country=FI'), page.url());

  // Open a site, come back, and the filter must still be applied.
  await page.goto(page.url(), { waitUntil: 'networkidle0' });
  const restored = await page.$eval('#siteCountry', el => el.value);
  const restoredCount = await page.$$eval('#siteGrid .sitecard', els => els.filter(e => !e.hidden).length);
  check('returning to a filtered directory restores the filter',
    restored === 'FI' && restoredCount === sitesAfter, `${restored} / ${restoredCount} shown`);

  /* ---- a site page opens from its card ---- */
  await page.goto(base + '/sites/', { waitUntil: 'networkidle0' });
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle0' }),
    page.click('#siteGrid .sitecard')
  ]);
  check('a site card opens a real site page', /\/sites\/[a-z0-9-]+\/$/.test(page.url()), page.url());
  /* The site page used to render its delivery path twice, as a rail and a
     ladder. The ladder is gone; the rail is the one timeline. It must carry
     all seven stages, and the duplicate must not come back — losing the gate
     notes the ladder owned is exactly what happened when it was removed. */
  const ladderGone = await page.$$eval('.ladder .lstep', els => els.length);
  check('the duplicate status ladder is not rendered', ladderGone === 0, ladderGone + ' steps');
  /* Gate notes are asserted in test/shell.test.js across every site page that
     has them, rather than here where the harness lands on whichever card is
     first and that site may legitimately have none. */

  /* ---- company page: tabs ---- */
  await page.goto(base + '/companies/iren/', { waitUntil: 'networkidle0' });
  const coTabs = await page.evaluate(() => ({
    overview: !document.getElementById('overview').hidden,
    record: !document.getElementById('record').hidden,
    pos: !!document.querySelector('.copos .copnode')
  }));
  check('a company page opens on its overview with the full record behind a tab', coTabs.overview && !coTabs.record, JSON.stringify(coTabs));
  check('a company page shows where it sits in the chain', coTabs.pos);
  await page.click('#tab-sites');
  const onSites = await page.evaluate(() => ({ sites: !document.getElementById('sites').hidden, overview: !document.getElementById('overview').hidden,
    hash: location.hash, cards: document.querySelectorAll('#sites .sitecard').length }));
  check('the Sites tab shows the site cards and names itself in the URL', onSites.sites && !onSites.overview && onSites.hash === '#sites' && onSites.cards > 0, JSON.stringify(onSites));
  await page.focus('#tab-sites');
  await page.keyboard.press('ArrowRight');
  const kbd = await page.evaluate(() => document.activeElement.id + ' ' + !document.getElementById('news').hidden);
  check('arrow keys move between company tabs', kbd === 'tab-news true', kbd);
  await page.click('.coscore');
  const ring = await page.evaluate(() => !document.getElementById('record').hidden);
  check('the Reality Score ring opens the record that explains it', ring);

  /* ---- company page: plain-English digest of an unreviewed filing ---- */
  await page.goto(base + '/companies/iren/', { waitUntil: 'networkidle0' });
  if (await page.$('#overview [data-digest]')) {
    await page.click('#overview [data-digest]');
    await page.waitForSelector('#overview .dgpoints', { timeout: 5000 }).catch(() => {});
    const dg = await page.evaluate(() => {
      const out = document.querySelector('#overview .dgout');
      return { open: !out.hidden, label: !!out.querySelector('.dglabel'), quote: !!out.querySelector('.dgpoints blockquote'),
        dropped: /1 point was dropped/.test(out.textContent), btn: document.querySelector('#overview [data-digest]').textContent };
    });
    check('a new filing can be read in plain English, each point beside its quote, labelled as AI', dg.open && dg.label && dg.quote && dg.dropped, JSON.stringify(dg));
    await page.click('#overview [data-digest]');
    const shut = await page.evaluate(() => document.querySelector('#overview .dgout').hidden);
    check('the digest button closes what it opened', shut);
  }

  /* ---- company page: score, path, x-ray (in the Record tab) ---- */
  await page.goto(base + '/companies/iren/#record', { waitUntil: 'networkidle0' });
  const scoreShown = await page.$eval('.scoreval', el => el.textContent.trim());
  check('a scored company shows its number', /^\d+$/.test(scoreShown), scoreShown);

  const factorSamples = await page.$$eval('.sfactor .sfdetail', els =>
    els.map(e => e.textContent.trim()).filter(Boolean));
  check('every score factor prints the sample behind it',
    factorSamples.length === 4, factorSamples.join(' | '));

  const coPathSteps = await page.$$eval('#path .pstep', els => els.length);
  check('the company path shows all five stages', coPathSteps === 5, `${coPathSteps}`);

  await page.click('#path .pstep-btn');
  await new Promise(r => setTimeout(r, 150));
  const coEvidence = await page.$eval('#path .pstepev', el => !el.hidden);
  check('a company path stage opens its evidence', coEvidence);

  /* ---- estimates are marked, and can be switched off ----
     On Keel's page: IREN's billing estimate went away once its 10-K disclosed
     a real billing figure, which is the estimate rule working as intended. */
  await page.goto(base + '/companies/keel/#record', { waitUntil: 'networkidle0' });
  const estOn = await page.$$eval('[data-estimate]', els =>
    els.filter(e => getComputedStyle(e).display !== 'none').length);
  check('estimates are visible by default', estOn > 0, `${estOn}`);

  // The control lives in the utility menu, so open it first — as a reader would.
  await page.evaluate(() => { document.querySelector('details.umenu').open = true; });
  await page.click('#estBtn');
  await new Promise(r => setTimeout(r, 150));
  const estOff = await page.$$eval('[data-estimate]', els =>
    els.filter(e => getComputedStyle(e).display !== 'none').length);
  check('estimates can be switched off entirely', estOff === 0, `${estOff} still shown`);

  await page.reload({ waitUntil: 'networkidle0' });
  const estStill = await page.evaluate(() => document.documentElement.getAttribute('data-estimates'));
  check('the estimates preference persists', estStill === 'off', String(estStill));
  // The control lives in the utility menu, so open it first — as a reader would.
  await page.evaluate(() => { document.querySelector('details.umenu').open = true; });
  await page.click('#estBtn');
  await new Promise(r => setTimeout(r, 120));

  await page.goto(base + '/companies/coreweave/', { waitUntil: 'networkidle0' });
  const unscored = await page.$eval('#score', el => el.textContent);
  check('an unscored company explains itself rather than showing a blank panel',
    /Not enough published record/.test(unscored) && /Not available/.test(unscored));

  /* ---- intelligence: filter, review, persist ---- */
  await page.goto(base + '/intelligence/', { waitUntil: 'networkidle0' });
  const allSignals = await page.$$eval('#signalAll .sig', els => els.filter(e => !e.hidden).length);
  await page.click('.sigfilter[data-cat="outlook"]');
  await new Promise(r => setTimeout(r, 150));
  const outlookOnly = await page.$$eval('#signalAll .sig', els => els.filter(e => !e.hidden).length);
  check('a signal filter narrows the ledger',
    outlookOnly > 0 && outlookOnly < allSignals, `${allSignals} → ${outlookOnly}`);
  check('the signal filter is reflected in the URL', page.url().includes('change=outlook'), page.url());

  await page.goto(base + '/intelligence/', { waitUntil: 'networkidle0' });
  await page.click('#todayset [data-review]');
  await new Promise(r => setTimeout(r, 150));
  const caughtUp = await page.$eval('#caughtUp', el => !el.hidden);
  check('reviewing the whole daily set shows the caught-up state', caughtUp);

  await page.reload({ waitUntil: 'networkidle0' });
  const stillReviewed = await page.$eval('#todayset .sig', el => el.classList.contains('is-reviewed'));
  check('reviewed state survives a reload', stillReviewed);

  // The daily set is now hidden behind the caught-up state, so use a ledger row
  // that is NOT part of that set — the newest ledger row is today's signal.
  const todayIds = await page.$$eval('#todayset .sig', els => els.map(e => e.getAttribute('data-id')));
  const otherId = await page.$$eval('#signalAll .sig', (els, ids) =>
    els.map(e => e.getAttribute('data-id')).find(id => !ids.includes(id)), todayIds);

  const reviewPosts = [];
  page.on('request', r => { if (r.method() !== 'GET') reviewPosts.push(r.url()); });
  await page.click(`#signalAll [data-review="${otherId}"]`);
  await new Promise(r => setTimeout(r, 200));
  check('reviewing a signal sends no request anywhere', reviewPosts.length === 0, reviewPosts.join(', '));

  // Un-reviewing must bring the daily set back rather than stranding the reader
  // in a caught-up state they cannot leave.
  await page.click(`#signalAll [data-review="${todayIds[0]}"]`);
  await new Promise(r => setTimeout(r, 200));
  const backAgain = await page.$eval('#caughtUp', el => el.hidden);
  const listBack = await page.$eval('#todayset .siglist', el => !el.hidden);
  check('un-reviewing a signal leaves the caught-up state', backAgain && listBack);

  /* ---- keyboard reaches the controls ---- */
  await page.goto(base + '/companies/', { waitUntil: 'networkidle0' });
  await page.keyboard.press('Tab');
  const skip = await page.evaluate(() => document.activeElement.className);
  check('the first tab stop is the skip link', /skiplink/.test(skip), skip);

  // Walk the real tab order and confirm focus never falls off the document.
  const walk = await page.evaluate(() => ({ start: document.activeElement.tagName }));
  const focusTrail = [];
  for (let i = 0; i < 15; i++) {
    await page.keyboard.press('Tab');
    focusTrail.push(await page.evaluate(() => {
      const el = document.activeElement;
      return el === document.body ? 'BODY' : el.tagName;
    }));
  }
  check('tabbing walks real controls and never lands on the body',
    focusTrail.length === 15 && !focusTrail.includes('BODY'),
    `${walk.start} → ${focusTrail.join(',')}`);

  /* ---- sites: cards, no animated map ---- */
  await page.goto(base + '/sites/', { waitUntil: 'networkidle0' });
  const sitesPage = await page.evaluate(() => ({
    map: !!document.getElementById('infrastructure'),
    cards: document.querySelectorAll('.sitecard').length,
    labels: [...document.querySelectorAll('.sitecard .hmstatus')].map(e => e.textContent.trim())
  }));
  check('the sites page has no animated map', !sitesPage.map);
  check('every site card carries its one-word status',
    sitesPage.cards > 0 && sitesPage.labels.length === sitesPage.cards, `${sitesPage.labels.length}/${sitesPage.cards}`);

  /* ---- catalysts: the earnings calendar leads ---- */
  await page.goto(base + '/catalysts/', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 300));
  const ec = await page.evaluate(() => ({
    first: document.querySelector('main h1').textContent.trim(),
    cards: [...document.querySelectorAll('#ecOps .eccard, #ecNext .eccard')].map(c => ({
      name: c.querySelector('.ecname').textContent.replace(/\s+/g, ' ').trim(),
      when: c.querySelector('.eccountdown').textContent.trim(),
      soon: c.classList.contains('is-soon'),
      touches: [...c.querySelectorAll('.nhtag-op')].map(t => t.firstChild.textContent.trim())
    }))
  }));
  check('the catalysts page leads with the earnings calendar', /Earnings calendar/.test(ec.first), ec.first);
  // NVIDIA sits with the operators, soonest first: NVIDIA (day 1), then IREN (day 11).
  const opsNames = await page.$$eval('#ecOps .ecname', els => els.map(e => e.textContent));
  check('NVIDIA leads the calendar with the neoclouds',
    opsNames.length === 2 && /NVIDIA/.test(opsNames[0]) && /IREN/.test(opsNames[1]), JSON.stringify(opsNames));
  const nv = ec.cards.find(c => /NVIDIA/.test(c.name)) || {};
  check('a report this week is highlighted with a countdown', nv.soon && /Tomorrow/.test(nv.when || ''), nv.when);
  check('an NVIDIA report shows the neoclouds it touches',
    ['IREN', 'CoreWeave', 'Nebius'].every(n => (nv.touches || []).includes(n)), (nv.touches || []).join(','));

  /* ---- the watchlist journey works end to end ---- */
  await page.evaluate(() => localStorage.removeItem('t2c-watch'));
  await page.goto(base + '/companies/iren/', { waitUntil: 'networkidle0' });
  await page.click('.watchbtn[data-watch]');
  await new Promise(r => setTimeout(r, 200));
  const watchText = await page.$eval('.watchbtn .watchtext', el => el.textContent.trim());
  check('the company page watch button confirms immediately', watchText === 'Watching', watchText);

  await page.goto(base + '/companies/?filter=watching', { waitUntil: 'networkidle0' });
  const watchingShown = await page.$$eval('#companyGrid .snap', els => els.filter(e => !e.hidden).length);
  const bannerOn = await page.$eval('#watchBanner', el => !el.hidden);
  check('"view all watchlist" actually filters to watched companies',
    watchingShown === 1 && bannerOn, `${watchingShown} shown, banner=${bannerOn}`);

  /* ---- click-glow behaves for pointer, Enter and Space alike ---- */
  await page.goto(base + '/', { waitUntil: 'networkidle0' });

  const glowOnPointer = await page.evaluate(async () => {
    const el = document.querySelector('.navlink.press');
    el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    const on = el.classList.contains('is-pressed');
    await new Promise(r => setTimeout(r, 420));
    return { on, off: !el.classList.contains('is-pressed') };
  });
  check('a pointer press glows and then settles', glowOnPointer.on && glowOnPointer.off,
    JSON.stringify(glowOnPointer));

  const glowOnKey = await page.evaluate(async () => {
    const el = document.querySelector('.cxco.press');
    el.focus();
    const before = el.classList.contains('is-pressed');
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    const after = el.classList.contains('is-pressed');
    // A held key repeats keydown; it must not re-trigger.
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, repeat: true }));
    return { before, after };
  });
  check('keyboard activation produces the same glow as a pointer',
    !glowOnKey.before && glowOnKey.after, JSON.stringify(glowOnKey));

  const noShift = await page.evaluate(() => {
    const el = document.querySelector('.navlink.press');
    const before = el.getBoundingClientRect();
    const neighbourBefore = el.nextElementSibling.getBoundingClientRect().left;
    el.classList.add('is-pressed');
    const after = el.getBoundingClientRect();
    const neighbourAfter = el.nextElementSibling.getBoundingClientRect().left;
    el.classList.remove('is-pressed');
    return {
      sameWidth: Math.abs(before.width - after.width) < 0.5,
      neighbourStill: Math.abs(neighbourBefore - neighbourAfter) < 0.5
    };
  });
  check('the glow causes no layout shift', noShift.sameWidth && noShift.neighbourStill,
    JSON.stringify(noShift));

  /* ---- command palette ---- */
  await page.goto(base + '/', { waitUntil: 'networkidle0' });
  await page.keyboard.down('Control');
  await page.keyboard.press('KeyK');
  await page.keyboard.up('Control');
  await new Promise(r => setTimeout(r, 200));
  const palOpen = await page.$eval('#palette', el => el.open);
  check('Ctrl+K opens the command palette', palOpen);

  const palFocused = await page.evaluate(() => document.activeElement.id);
  check('the palette focuses its input on open', palFocused === 'palInput', palFocused);

  await page.type('#palInput', 'horizon');
  await new Promise(r => setTimeout(r, 200));
  const palRows = await page.$$eval('#palResults .palitem', els =>
    els.map(e => e.getAttribute('href')));
  check('the palette finds a site by name',
    palRows.some(h => h.startsWith('/sites/')), palRows.join(', '));

  await page.keyboard.press('Escape');
  await new Promise(r => setTimeout(r, 200));
  const palClosed = await page.$eval('#palette', el => !el.open);
  const focusRestored = await page.evaluate(() => document.activeElement.id);
  check('Escape closes the palette and returns focus to its trigger',
    palClosed && focusRestored === 'palOpen', `closed=${palClosed} focus=${focusRestored}`);

  /* ---- nav marks exactly one destination current ---- */
  for (const [route, expect] of [['/companies/', '/companies/'], ['/news/', '/news/'], ['/catalysts/', '/catalysts/'],
    ['/ai-news/', '/news/']]) {
    await page.goto(base + route, { waitUntil: 'networkidle0' });
    const current = await page.$$eval('[aria-current="page"]', els =>
      els.filter(e => e.classList.contains('navlink')).map(e => e.getAttribute('href')));
    check(`${route} marks itself current in the nav`,
      current.length === 1 && current[0] === expect, current.join(', '));
  }

  // A route demoted to the utility menu still says where you are.
  for (const route of ['/sites/', '/explainers/', '/intelligence/']) {
    await page.goto(base + route, { waitUntil: 'networkidle0' });
    const marked = await page.$$eval('.umenubtn[aria-current="page"]', els =>
      els.map(e => e.getAttribute('href')));
    check(`${route} marks itself current in the menu`,
      marked.length === 1 && marked[0] === route, marked.join(', '));
  }

  /* ---- AI catalysts: finite, filterable, reviewable ----
     The signal product moved from /ai-news/ to /catalysts/, where it sits above
     the dated events still ahead. /ai-news/ now carries the third-party wire,
     exercised separately above. */
  await page.goto(base + '/catalysts/', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 300));

  const anTotal = await page.$$eval('#anFeed .an-row', els => els.length);
  check('AI News lists a finite set of signals', anTotal > 0, `${anTotal} rows`);

  // Filtering by category narrows the feed and lands in the URL.
  const anBefore = await page.$$eval('#anFeed .an-row', els => els.filter(e => !e.hidden).length);
  await page.click('.an-filter[data-filter="cat"]:not([data-value=""])');
  await new Promise(r => setTimeout(r, 200));
  const anAfter = await page.$$eval('#anFeed .an-row', els => els.filter(e => !e.hidden).length);
  check('a category filter narrows the feed', anAfter > 0 && anAfter < anBefore, `${anBefore} → ${anAfter}`);
  check('the filter is addressable in the URL', /[?&]cat=/.test(page.url()), page.url());

  const anState = await page.$eval('#anFilterState', el => el.textContent.trim());
  check('the filter state is stated in words', /Filtered by/.test(anState), anState);

  // A filtered view survives a reload, which is what makes it citable.
  const anUrl = page.url();
  await page.goto(anUrl, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 250));
  const anReloaded = await page.$$eval('#anFeed .an-row', els => els.filter(e => !e.hidden).length);
  check('a filtered view survives a reload', anReloaded === anAfter, `${anReloaded} vs ${anAfter}`);

  await page.click('#anReset');
  await new Promise(r => setTimeout(r, 200));
  const anReset = await page.$$eval('#anFeed .an-row', els => els.filter(e => !e.hidden).length);
  check('reset restores the whole set', anReset === anTotal, `${anReset}`);
  check('reset clears the URL too', !/[?&]cat=/.test(page.url()), page.url());

  // Materiality is a threshold, not an exact match.
  await page.select('#anMateriality', 'high');
  await new Promise(r => setTimeout(r, 200));
  const anHigh = await page.$$eval('#anFeed .an-row:not([hidden])', els =>
    els.map(e => e.getAttribute('data-mat')));
  check('materiality filters to that level and above',
    anHigh.length > 0 && anHigh.every(m => m === 'high'), anHigh.join(','));
  await page.click('#anReset');
  await new Promise(r => setTimeout(r, 150));

  // Finite review progress, and a caught-up state that can actually be reached.
  const anPips = await page.$$eval('.an-pip', els => els.length);
  /* Every review button on the page, not just the feed's: the lead signal is
     lifted out of the feed and is still part of the set the pips measure. */
  await page.evaluate(() => {
    document.querySelectorAll('[data-review]').forEach(b => b.click());
  });
  await new Promise(r => setTimeout(r, 300));
  const anCaught = await page.$eval('#anCaughtUp', el => !el.hidden);
  const anDone = await page.$$eval('.an-pip.is-done', els => els.length);
  check('reviewing the whole latest set reaches the caught-up state',
    anCaught && anDone === anPips, `caught=${anCaught} pips ${anDone}/${anPips}`);

  const anLabel = await page.$eval('#anReviewCount', el => el.textContent.trim());
  check('review progress is stated in words as well as pips', /caught up/i.test(anLabel), anLabel);

  await page.reload({ waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 300));
  const anStillCaught = await page.$eval('#anCaughtUp', el => !el.hidden);
  check('review state survives a reload', anStillCaught);

  // Bookmarks are a separate store from review progress.
  const anFirstMark = await page.$('#anFeed .an-row [data-bookmark]');
  await anFirstMark.click();
  await new Promise(r => setTimeout(r, 200));
  const anMarked = await page.$$eval('#anFeed .an-row.is-bookmarked', els => els.length);
  const anMarkPressed = await page.$eval('#anFeed .an-row [data-bookmark]',
    el => el.getAttribute('aria-pressed'));
  check('bookmarking is separate from reviewing',
    anMarked === 1 && anMarkPressed === 'true', `${anMarked} bookmarked`);

  // Every material claim opens its evidence.
  const anEv = await page.$('#anFeed .an-evsum');
  await anEv.click();
  await new Promise(r => setTimeout(r, 200));
  const anEvOpen = await page.$eval('#anFeed .an-ev', el => el.open);
  const anEvLinks = await page.$$eval('#anFeed .an-ev[open] .an-evlink', els => els.length);
  check('a signal opens its documents', anEvOpen && anEvLinks > 0, `${anEvLinks} documents`);

  // The stage chips reach the explainers built in phase 3.
  const anStageHref = await page.$eval('.an-stage', el => el.getAttribute('href')).catch(() => null);
  check('an affected stage links into the explainer system',
    !!anStageHref && /^\/explainers\//.test(anStageHref), String(anStageHref));

  /* ---- Chain Mapping ---- */
  await page.goto(base + '/chain-mapping/', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 400));

  const cmCols = await page.$$eval('.cm-mode:not([hidden]) .cm-ch', els => els.length);
  check('the map shows all five columns', cmCols === 5, String(cmCols));

  /* The whole chain is drawn now, so no column should render empty. The
     empty-column plate still exists for the filtered case and is proven below. */
  const cmEmpty = await page.$$eval('.cm-mode:not([hidden]) .cm-emptyplate', els => els.length);
  check('no column is left empty', cmEmpty === 0, cmEmpty + ' empty');

  const cmCoverage = await page.evaluate(() => ({
    sourced: document.querySelectorAll('.cm-mode:not([hidden]) .cm-hexg[data-coverage="sourced"]').length,
    structural: document.querySelectorAll('.cm-mode:not([hidden]) .cm-hexg[data-coverage="structural"]').length
  }));
  check('both coverage states are drawn',
    cmCoverage.sourced > 0 && cmCoverage.structural > 0, JSON.stringify(cmCoverage));
  /* A structural node must never be styled as a sourced one. If the two ever
     converged the map would present industry structure as a T2C finding, which
     is the single failure this whole design exists to prevent. */
  const covStyles = await page.evaluate(() => {
    const g = s => getComputedStyle(document.querySelector(
      '.cm-mode:not([hidden]) .cm-hexg[data-coverage="' + s + '"] .cm-hexbody'));
    const a = g('sourced'), b = g('structural');
    return { same: a.stroke === b.stroke && a.strokeDasharray === b.strokeDasharray,
      structuralDashed: b.strokeDasharray !== 'none' && b.strokeDasharray !== '' };
  });
  check('a structural node is visibly not a sourced one', !covStyles.same);
  check('structural nodes are drawn dashed', covStyles.structuralDashed);

  /* THE TWO LINK SHAPES. A thin curve is a named agreement between two named
     companies; a wide band is T2C's own framing of how a deployment is built.
     They must be countable separately, or the page would present one as the
     other. */
  const cmEdges = await page.$$eval('.cm-mode:not([hidden]) .cm-edge', e => e.length);
  const cmStruct = await page.$$eval('.cm-mode:not([hidden]) .cm-edge.is-structural', e => e.length);
  check('the whole dependency chain is drawn', cmEdges > 10, cmEdges + ' links');
  check('exactly one link is an evidenced agreement',
    cmEdges - cmStruct === 1, (cmEdges - cmStruct) + ' evidenced');
  const bandGap = await page.evaluate(() => {
    const band = document.querySelector('.cm-mode:not([hidden]) .cm-band');
    const hexes = [...document.querySelectorAll('.cm-mode:not([hidden]) .cm-hexbody')];
    const b = band.getBoundingClientRect();
    // A band that touched a node would read as a line arriving at that company.
    return hexes.every(h => {
      const r = h.getBoundingClientRect();
      return r.right <= b.left + 1 || r.left >= b.right - 1;
    });
  });
  check('a structural band never touches a node', bandGap);

  const hud = await page.$eval('.cm-mode:not([hidden]) [data-hud]',
    e => e.textContent.replace(/\s+/g, ' ').trim());
  check('the readout counts evidenced and structural links apart',
    /1 evidenced agreement/i.test(hud) && /structural dependenc/i.test(hud), hud);
  check('the readout says how many nodes carry a T2C record',
    /with a T2C record/i.test(hud), hud);

  // Hovering a node lights the chain that actually runs through it.
  await page.hover('.cm-mode:not([hidden]) .cm-hexg[data-node="input-axt"]');
  await new Promise(r => setTimeout(r, 300));
  const cmChain = await page.$$eval('.cm-hexg.is-inchain', e => e.map(x => x.dataset.node));
  check('hovering a node traces its chain',
    cmChain.length === 2 && cmChain.indexOf('input-axt') !== -1 &&
    cmChain.indexOf('component-cw-laser') !== -1, cmChain.join(','));

  /* Tracing must reach across the whole chain — that is what the map is for —
     while a highlighted structural hop must stay visibly structural. Repainting
     every hop the same colour would erase the distinction at exactly the moment
     the reader is studying the path. */
  await page.hover('.cm-mode:not([hidden]) .cm-hexg[data-node="ref-silicon-wafer"]');
  await new Promise(r => setTimeout(r, 350));
  const deep = await page.$$eval('.cm-hexg.is-inchain', e => e.map(x => x.dataset.node));
  check('a wafer traces all the way to the operators',
    deep.length > 10 && deep.some(x => x.indexOf('operator-') === 0), deep.length + ' nodes');
  const hotStyles = await page.evaluate(() => {
    const s = document.querySelector('.cm-edge.is-hot.is-structural .cm-edgeline');
    if (!s) return null;
    const c = getComputedStyle(s);
    return { stroke: c.stroke, dashed: c.strokeDasharray !== 'none' && c.strokeDasharray !== '' };
  });
  check('a highlighted structural link stays structural',
    hotStyles && hotStyles.dashed && /43,\s*217,\s*245/.test(hotStyles.stroke),
    JSON.stringify(hotStyles));

  // Architecture toggle swaps exactly the interconnect node.
  const cmBefore = await page.$$eval('.cm-mode:not([hidden]) .cm-hexg', e => e.map(n => n.dataset.node));
  await page.click('.cm-segbtn[data-arch="next"]');
  await new Promise(r => setTimeout(r, 400));
  const cmAfter = await page.$$eval('.cm-mode:not([hidden]) .cm-hexg', e => e.map(n => n.dataset.node));
  const gone = cmBefore.filter(x => cmAfter.indexOf(x) === -1);
  const added = cmAfter.filter(x => cmBefore.indexOf(x) === -1);
  check('the architecture toggle swaps only the interconnect node',
    gone.length === 1 && added.length === 1 &&
    gone[0] === 'interconnect-deployed' && added[0] === 'interconnect-next',
    gone.join(',') + ' → ' + added.join(','));
  check('copper survives the toggle', cmAfter.indexOf('interconnect-copper') !== -1);
  check('the architecture is addressable in the URL', /architecture=next/.test(page.url()), page.url());

  const archSummary = await page.$eval('#cmArchSummary', e => e.textContent.trim());
  check('the toggle updates the explanation',
    /closer to the chip/i.test(archSummary), archSummary);

  await page.click('.cm-segbtn[data-arch="deployed"]');
  await new Promise(r => setTimeout(r, 350));

  // Drawer: opens, separates the three axes, and returns focus on close.
  await page.click('.cm-mode:not([hidden]) .cm-hexg[data-node="interconnect-deployed"]');
  await new Promise(r => setTimeout(r, 350));
  const cmDrawerOpen = await page.$eval('#cmDrawer', e => !e.hidden);
  const cmDrawerTitle = await page.$eval('#cm-drawer-h', e => e.textContent.trim());
  check('a node opens its evidence drawer',
    cmDrawerOpen && /pluggable optics/i.test(cmDrawerTitle), cmDrawerTitle);

  const axes = await page.$$eval('.cm-daxes dt', e => e.map(x => x.textContent.trim()));
  check('relationship, evidence, maturity and stage are four separate fields',
    axes.length === 4 && axes.join(',') === 'Relationship,Evidence,Maturity,Commercial stage',
    axes.join(','));

  const drawerFocus = await page.evaluate(() => document.activeElement.id);
  check('focus moves into the drawer', drawerFocus === 'cm-drawer-h', drawerFocus);

  /* THE SENTENCE THAT KEEPS THE REFERENCE LAYER HONEST. Opening a reference
     node must say what it is BEFORE any of its content, and must state that
     naming a company is not a supply claim. Without this the panel reads
     exactly like an evidenced one. */
  await page.click('.cm-mode:not([hidden]) .cm-hexg[data-coverage="structural"]');
  await new Promise(r => setTimeout(r, 350));
  const refPanel = await page.evaluate(() => {
    const t = document.querySelector('.cm-dcov');
    const body = document.getElementById('cmDrawerBody');
    return {
      coverage: t ? t.getAttribute("data-coverage") : null,
      leads: body && body.firstElementChild && body.firstElementChild.classList.contains('cm-dcov'),
      caveat: (document.querySelector('.cm-dcaveat') || {}).textContent || '',
      examples: document.querySelectorAll('.cm-dexamples li').length,
      sources: document.querySelectorAll('.cm-dsrc a').length
    };
  });
  check('a structural node declares its coverage first', refPanel.coverage === "structural" && refPanel.leads,
    JSON.stringify(refPanel));
  check('a reference node lists example companies', refPanel.examples > 0, String(refPanel.examples));
  check('and says naming one is not a supply claim',
    /not a claim that it supplies/i.test(refPanel.caveat) && /not a complete list/i.test(refPanel.caveat),
    refPanel.caveat.slice(0, 70));
  check('a reference node cites no sources of its own', refPanel.sources === 0, String(refPanel.sources));

  await page.keyboard.press('Escape');
  await new Promise(r => setTimeout(r, 250));
  await page.click('.cm-mode:not([hidden]) .cm-hexg[data-node="interconnect-deployed"]');
  await new Promise(r => setTimeout(r, 350));

  const cmSources = await page.$$eval('.cm-dsrc a', a => a.map(x => ({ t: x.target, r: x.rel })));
  check('every drawer source opens safely',
    cmSources.length > 0 && cmSources.every(l => l.t === '_blank' && /noopener/.test(l.r)));

  await page.keyboard.press('Escape');
  await new Promise(r => setTimeout(r, 300));
  const returned = await page.evaluate(() => (document.activeElement.dataset || {}).node);
  check('closing the drawer returns focus to the node that opened it',
    returned === 'interconnect-deployed', String(returned));

  // Filters emphasise without hiding.
  await page.click('.cm-trace[data-trace="bottleneck"]');
  await new Promise(r => setTimeout(r, 300));
  const ctx = await page.$$eval('.cm-mode:not([hidden]) .cm-hexg.is-context',
    els => els.map(e => +getComputedStyle(e).opacity));
  check('filtered-out nodes stay readable rather than vanishing',
    ctx.length > 0 && ctx.every(o => o >= 0.5), ctx.slice(0, 3).join(','));

  const cmLive = await page.$eval('.cm-mode:not([hidden]) .cm-live', e => e.textContent.trim());
  check('the filter result is announced in a live region', /node/.test(cmLive), cmLive.slice(0, 60));

  // An untracked pillar is offered honestly, not as a working filter.
  const disabled = await page.$$eval('.cm-pillar[disabled]', els => els.length);
  check('untracked pillars are disabled rather than hidden', disabled === 2, String(disabled));

  // List alternative.
  await page.click('.cm-mode:not([hidden]) [data-ctl="list"]');
  await new Promise(r => setTimeout(r, 300));
  const listShown = await page.$eval('.cm-mode:not([hidden]) .cm-listview', e => !e.hidden);
  const listRows = await page.$$eval('.cm-mode:not([hidden]) .cm-listview tbody tr', e => e.length);
  check('the list alternative opens and carries every node',
    listShown && listRows > 0, listRows + ' rows');
  await page.click('.cm-mode:not([hidden]) [data-ctl="list"]');
  await new Promise(r => setTimeout(r, 250));

  // Keyboard navigation between nodes.
  /* puppeteer's focus() refuses anything that is not an HTMLElement, so an SVG
     node has to be focused through the page. Worth asserting separately that it
     actually took focus — if it had not, arrow navigation would be untestable
     rather than merely awkward. */
  const svgFocused = await page.evaluate(() => {
    const n = document.querySelector('.cm-mode:not([hidden]) .cm-hexg');
    n.focus();
    return document.activeElement === n;
  });
  check('an SVG node can take keyboard focus', svgFocused);
  await page.keyboard.press('ArrowRight');
  await new Promise(r => setTimeout(r, 200));
  const moved = await page.evaluate(() => (document.activeElement.dataset || {}).node);
  check('arrow keys move between nodes', !!moved && moved !== 'input-axt', String(moved));

  // Timeline plays once and stops.
  await page.click('#cmPlay');
  await new Promise(r => setTimeout(r, 700));
  const playing = await page.$$eval('.cm-stage.is-playing', e => e.length);
  check('playback highlights one stage at a time', playing === 1, String(playing));
  await new Promise(r => setTimeout(r, 4200));
  const stillPlaying = await page.$$eval('.cm-stage.is-playing', e => e.length);
  const pressed = await page.$eval('#cmPlay', e => e.getAttribute('aria-pressed'));
  check('playback stops at the end rather than looping',
    stillPlaying === 0 && pressed === 'false', stillPlaying + '/' + pressed);

  /* ---- reduced motion is honoured ---- */
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await page.goto(base + '/', { waitUntil: 'networkidle0' });
  const rmTransitions = await page.$$eval('.cxco', els => els.map(e => getComputedStyle(e).transitionDuration));
  check('the chain explorer drops its transitions under reduced motion',
    rmTransitions.every(t => t === '0s'), [...new Set(rmTransitions)].join(','));
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }]);

  check('no uncaught errors during the whole run', errors.length === 0, errors.join(' | '));

  await browser.close();
  server.close();

  const failed = results.filter(r => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} interaction checks passed`);
  if (failed.length) process.exitCode = 1;
};

run().catch(e => { console.error(e); process.exit(1); });
