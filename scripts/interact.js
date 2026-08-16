/**
 * Interaction QA. Drives the built site in a real browser and asserts the things
 * only a running page can prove: that the filters filter, that the Lab recomputes,
 * that a saved call survives a reload, that keyboard focus reaches the controls,
 * and that a legacy hash still lands on its route.
 *
 *   node scripts/interact.js
 */
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
  check('legacy #odds lands on the Lab in odds mode',
    page.url().includes('/lab/') && page.url().includes('#odds'), page.url());

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

  /* ---- the Lab recomputes ---- */
  await page.goto(base + '/lab/?company=terawulf', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 400));
  const selected = await page.$eval('#labCompany', el => el.value);
  check('a Lab deep link selects the requested company', selected === 'terawulf', selected);

  const firstAnswer = await page.$eval('#labResults', el => el.textContent.slice(0, 400));
  await page.$eval('#labShift', el => { el.value = '6'; el.dispatchEvent(new Event('input', { bubbles: true })); });
  await new Promise(r => setTimeout(r, 500));
  const shifted = await page.$eval('#labResults', el => el.textContent.slice(0, 400));
  check('moving the delivery slider recomputes the model', firstAnswer !== shifted);

  const shiftLabel = await page.$eval('#labShiftOut', el => el.textContent);
  check('the slider states its own value in words', /later|earlier|schedule/.test(shiftLabel), shiftLabel);

  const whatRows = await page.$$eval('#labWhat tbody tr', els => els.length);
  check('the model shows every tranche it is standing on', whatRows > 0, `${whatRows} rows`);

  const noZeroClaim = await page.$eval('#labWhat', el => el.textContent);
  check('undated capacity is named rather than silently dropped',
    !/\bMW with no date\b/.test(noZeroClaim) || /no delivery date on record/.test(noZeroClaim));

  /* ---- mode switching ---- */
  await page.click('.mode[data-lab="odds"]');
  await new Promise(r => setTimeout(r, 200));
  const oddsVisible = await page.$eval('#odds', el => !el.hidden);
  const resultsHidden = await page.$eval('#labResults', el => el.hidden);
  check('switching to Market odds swaps the panel', oddsVisible && resultsHidden);

  /* ---- a call survives a reload ---- */
  await page.goto(base + '/companies/iren/', { waitUntil: 'networkidle0' });
  await page.type('#callWhy-IREN', 'Horizon 2 needs the transformer delivery to hold.');
  await page.click('.callform button[type="submit"]');
  await new Promise(r => setTimeout(r, 200));
  const saved = await page.$eval('#callList-IREN', el => el.textContent);
  check('a call appears immediately after saving', /transformer delivery/.test(saved));

  await page.reload({ waitUntil: 'networkidle0' });
  const persisted = await page.$eval('#callList-IREN', el => el.textContent);
  check('the call survives a reload', /transformer delivery/.test(persisted));

  const posted = [];
  page.on('request', r => { if (r.method() !== 'GET') posted.push(r.url()); });
  await page.click('.callform button[type="submit"]');
  await new Promise(r => setTimeout(r, 300));
  check('saving a call sends no request anywhere', posted.length === 0, posted.join(', '));

  await page.click('.calldel');
  await new Promise(r => setTimeout(r, 150));

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
  const ladder = await page.$$eval('.ladder .lstep', els => els.length);
  check('the site page renders its status ladder', ladder === 7, `${ladder} steps`);

  /* ---- path steps reveal evidence rather than doing nothing ---- */
  await page.goto(base + '/sites/iren-horizon-1/', { waitUntil: 'networkidle0' });
  const pressable = await page.$$('.pstep-btn');
  const firstPanelHidden = await page.$eval('.pstepev', el => el.hidden);
  await pressable[0].click();
  await new Promise(r => setTimeout(r, 120));
  const afterPanel = await page.$eval('.pstepev', el => el.hidden);
  check('an evidenced path stage opens its sources',
    firstPanelHidden === true && afterPanel === false);

  const inertAffordance = await page.evaluate(() =>
    // A stage with no sources must not look pressable.
    [...document.querySelectorAll('.pstep')].every(li =>
      li.querySelector('.pstep-btn') || !li.querySelector('button')));
  check('a stage with no evidence offers no pressable control', inertAffordance);

  /* ---- company page: score, path, x-ray ---- */
  await page.goto(base + '/companies/iren/', { waitUntil: 'networkidle0' });
  const scoreShown = await page.$eval('.scoreval', el => el.textContent.trim());
  check('a scored company shows its number', /^\d+$/.test(scoreShown), scoreShown);

  const factorSamples = await page.$$eval('.sfactor .sfdetail', els =>
    els.map(e => e.textContent.trim()).filter(Boolean));
  check('every score factor prints the sample behind it',
    factorSamples.length === 4, factorSamples.join(' | '));

  const coPathSteps = await page.$$eval('#path .pstep', els => els.length);
  check('the company path shows all seven stages', coPathSteps === 7, `${coPathSteps}`);

  await page.click('#path .pstep-btn');
  await new Promise(r => setTimeout(r, 150));
  const coEvidence = await page.$eval('#path .pstepev', el => !el.hidden);
  check('a company path stage opens its evidence', coEvidence);

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

  /* ---- Mission Control homepage ---- */
  await page.goto(base + '/', { waitUntil: 'networkidle0' });

  const headline = await page.$eval('h1.tshead', el => el.textContent.trim());
  check('the homepage leads with a real figure from the ledger',
    /\d/.test(headline) && headline.length > 6, headline);

  // First visit: nothing to compare against, and the panel must say that rather
  // than printing a row of zeros.
  const firstVisit = await page.evaluate(() => ({
    listHidden: document.getElementById('sinceList').hidden,
    empty: document.getElementById('sinceEmpty').textContent.trim(),
    when: document.getElementById('sinceWhen').textContent.trim()
  }));
  check('a first visit says so instead of showing zeros',
    firstVisit.listHidden && /first visit/i.test(firstVisit.when), JSON.stringify(firstVisit));

  // Now pretend the last visit predates the whole ledger and reload.
  await page.evaluate(() => {
    localStorage.setItem('t2c-last-visit', '2020-01-01T00:00:00.000Z');
    sessionStorage.removeItem('t2c-session-since');
  });
  await page.reload({ waitUntil: 'networkidle0' });
  const sinceRows = await page.$$eval('#sinceList .srow', els =>
    els.filter(e => !e.hidden).map(e => ({
      cat: e.getAttribute('data-cat'),
      n: Number(e.querySelector('[data-count]').textContent)
    })));
  check('since-last-visit counts real categories from the reader\'s own timestamp',
    sinceRows.length > 0 && sinceRows.every(r => r.n > 0),
    sinceRows.map(r => `${r.cat}:${r.n}`).join(' '));

  const sinceHref = await page.$eval('#sinceList .srow:not([hidden]) .srowlink', el => el.getAttribute('href'));
  check('a since-last-visit row routes to the matching filter',
    /\/intelligence\/\?change=/.test(sinceHref), sinceHref);

  // The comparison point must not move while the reader is still in the session.
  const beforeNav = await page.evaluate(() => sessionStorage.getItem('t2c-session-since'));
  await page.goto(base + '/companies/', { waitUntil: 'networkidle0' });
  await page.goto(base + '/', { waitUntil: 'networkidle0' });
  const afterNav = await page.evaluate(() => sessionStorage.getItem('t2c-session-since'));
  const stillCounts = await page.$$eval('#sinceList .srow', els => els.filter(e => !e.hidden).length);
  check('the comparison window survives moving between pages',
    beforeNav === afterNav && stillCounts === sinceRows.length,
    `${beforeNav} → ${afterNav}, ${stillCounts} rows`);

  /* ---- watchlist ---- */
  const allRows = await page.$$eval('#watchList .wrow', els => els.filter(e => !e.hidden).length);
  check('an empty watchlist shows everything tracked rather than an empty box', allRows > 1, `${allRows}`);

  await page.click('#watchList .wrow [data-watch]');
  await new Promise(r => setTimeout(r, 200));
  const afterWatch = await page.$$eval('#watchList .wrow', els => els.filter(e => !e.hidden).length);
  const pressed = await page.$eval('#watchList .wrow [data-watch]', el => el.getAttribute('aria-pressed'));
  check('watching a company narrows the list immediately',
    afterWatch === 1 && pressed === 'true', `${afterWatch} shown, pressed=${pressed}`);

  await page.reload({ waitUntil: 'networkidle0' });
  const persistedWatch = await page.$$eval('#watchList .wrow', els => els.filter(e => !e.hidden).length);
  check('the watchlist survives a reload', persistedWatch === 1, `${persistedWatch}`);

  const watchPosts = [];
  page.on('request', r => { if (r.method() !== 'GET') watchPosts.push(r.url()); });
  await page.click('#watchList .wrow:not([hidden]) [data-watch]');
  await new Promise(r => setTimeout(r, 200));
  check('watching sends no request anywhere', watchPosts.length === 0, watchPosts.join(', '));

  /* ---- map ---- */
  const zoomBefore = await page.$eval('#mapImg', el => getComputedStyle(el).transform);
  await page.click('#mapIn');
  await new Promise(r => setTimeout(r, 320));
  const zoomAfter = await page.$eval('#mapImg', el => getComputedStyle(el).transform);
  check('the map zoom control actually zooms', zoomBefore !== zoomAfter, `${zoomBefore} → ${zoomAfter}`);

  await page.click('#mapReset');
  await new Promise(r => setTimeout(r, 320));
  // The untouched map computes to "none"; after a reset it is the identity
  // matrix. Both mean scale 1, so compare the meaning rather than the string.
  const zoomReset = await page.$eval('#mapImg', el => getComputedStyle(el).transform);
  const isIdentity = zoomReset === 'none' || /^matrix\(1,\s*0,\s*0,\s*1,\s*0,\s*0\)$/.test(zoomReset);
  check('the map recentre control restores the view', isIdentity, zoomReset);

  const hotHref = await page.$eval('#mapView .hot', el => el.getAttribute('href'));
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle0' }),
    page.click('#mapView .hot')
  ]);
  check('a map hotspot opens its site and not the Sites explorer',
    page.url().endsWith(hotHref), `${page.url()} vs ${hotHref}`);

  await page.goto(base + '/', { waitUntil: 'networkidle0' });
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle0' }),
    page.click('#mapView .mapsurface')
  ]);
  check('the map surface opens the Sites explorer', page.url().endsWith('/sites/'), page.url());

  /* ---- signal progress ---- */
  await page.goto(base + '/', { waitUntil: 'networkidle0' });
  const progText = await page.$eval('#progCount', el => el.textContent.trim());
  check('signal progress states a finite reviewed count',
    /\d+\s+signals?\s+·\s+(\d+ reviewed|all reviewed)/.test(progText), progText);

  const nodeHref = await page.$eval('.pnodebtn', el => el.getAttribute('href'));
  check('a progress node opens its own signal', /\/intelligence\/#/.test(nodeHref), nodeHref);

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

  await page.goto(base + '/', { waitUntil: 'networkidle0' });
  const homeWatched = await page.$$eval('#watchList .wrow', els => els.filter(e => !e.hidden).length);
  check('starring on a company page shows up on the homepage', homeWatched === 1, `${homeWatched}`);

  /* ---- signal progress reaches a real anchor ---- */
  await page.goto(base + '/intelligence/?view=today', { waitUntil: 'networkidle0' });
  const todayOnly = await page.$$eval('#signalAll .sig', els => els.filter(e => !e.hidden).length);
  const totalSignals = await page.$$eval('#signalAll .sig', els => els.length);
  check('?view=today narrows the ledger to the finite daily set',
    todayOnly > 0 && todayOnly < totalSignals, `${todayOnly} of ${totalSignals}`);

  await page.goto(base + '/', { waitUntil: 'networkidle0' });
  const nodeTarget = await page.$eval('.pnodebtn', el => el.getAttribute('href'));
  await page.goto(base + nodeTarget, { waitUntil: 'networkidle0' });
  const anchorId = nodeTarget.split('#')[1];
  const anchorExists = await page.evaluate(id => !!document.getElementById(id), anchorId);
  check('a progress node lands on the signal it names', anchorExists, nodeTarget);

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
    const el = document.querySelector('.modebtn.press');
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

  /* ---- Live / Focus persists and pauses motion ---- */
  await page.click('.modebtn[data-mode="focus"]');
  await new Promise(r => setTimeout(r, 150));
  const focusOn = await page.evaluate(() => document.documentElement.getAttribute('data-mode'));
  check('Focus mode applies immediately', focusOn === 'focus', String(focusOn));

  const secondaryHidden = await page.evaluate(() => {
    const el = document.querySelector('.secondary');
    return !el || getComputedStyle(el).display === 'none';
  });
  check('Focus mode hides secondary metrics', secondaryHidden);

  await page.goto(base + '/companies/', { waitUntil: 'networkidle0' });
  const focusPersisted = await page.evaluate(() => document.documentElement.getAttribute('data-mode'));
  check('the mode preference persists across pages', focusPersisted === 'focus', String(focusPersisted));

  await page.goto(base + '/', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 400));
  const pausedA = await page.evaluate(() => {
    const cv = document.getElementById('flow');
    return cv ? cv.toDataURL().length : 0;
  });
  await new Promise(r => setTimeout(r, 500));
  const pausedB = await page.evaluate(() => {
    const cv = document.getElementById('flow');
    return cv ? cv.toDataURL().length : 0;
  });
  check('Focus mode pauses decorative motion', pausedA === pausedB, `${pausedA} vs ${pausedB}`);

  await page.click('.modebtn[data-mode="live"]');
  await new Promise(r => setTimeout(r, 150));
  const backLive = await page.evaluate(() => document.documentElement.getAttribute('data-mode'));
  check('switching back to Live restores the mode', backLive === 'live', String(backLive));

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
  for (const [route, expect] of [['/sites/', '/sites/'], ['/intelligence/', '/intelligence/']]) {
    await page.goto(base + route, { waitUntil: 'networkidle0' });
    const current = await page.$$eval('[aria-current="page"]', els =>
      els.filter(e => e.classList.contains('navlink')).map(e => e.getAttribute('href')));
    check(`${route} marks itself current in the nav`,
      current.length === 1 && current[0] === expect, current.join(', '));
  }

  /* ---- reduced motion is honoured ---- */
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await page.goto(base + '/', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 400));
  const framesA = await page.evaluate(() => {
    const cv = document.getElementById('flow');
    return cv ? cv.toDataURL().length : 0;
  });
  await new Promise(r => setTimeout(r, 600));
  const framesB = await page.evaluate(() => {
    const cv = document.getElementById('flow');
    return cv ? cv.toDataURL().length : 0;
  });
  check('the hero animation stops under reduced motion', framesA === framesB, `${framesA} vs ${framesB}`);

  check('no uncaught errors during the whole run', errors.length === 0, errors.join(' | '));

  await browser.close();
  server.close();

  const failed = results.filter(r => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} interaction checks passed`);
  if (failed.length) process.exitCode = 1;
};

run().catch(e => { console.error(e); process.exit(1); });
