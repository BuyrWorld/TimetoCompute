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
      if (p === '/api/news') {
        // A reachable image, so the card's own onerror handler does not remove it.
        const realArt = `http://${req.headers.host}/Logo/logo-header.png`;
        res.writeHead(200, { 'content-type': 'application/json' });
        return res.end(JSON.stringify({
          count: 3,
          items: [
            {
              headline: 'A story with its own artwork', url: 'https://example.com/a',
              source: 'Benzinga', datetime: Math.floor(Date.now() / 1000) - 3600,
              image: realArt, symbols: ['IREN']
            },
            {
              headline: 'A Yahoo story with the house placeholder', url: 'https://example.com/b',
              source: 'Yahoo', datetime: Math.floor(Date.now() / 1000) - 7200,
              image: 'https://s.yimg.com/rz/stage/p/yahoo_finance_en-US_h_p_finance_2.png',
              symbols: ['CRWV', 'NBIS']
            },
            {
              headline: 'A story with no image at all', url: 'https://example.com/c',
              source: 'SeekingAlpha', datetime: Math.floor(Date.now() / 1000) - 86400,
              image: null, symbols: ['WULF']
            }
          ]
        }));
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

  /* ---- editorial homepage ---- */
  await page.goto(base + '/', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 300));

  const h1s = await page.$$eval('h1', els => els.map(e => e.textContent.trim()));
  check('the homepage has exactly one h1 and it is the story', h1s.length === 1 && h1s[0].length > 15,
    h1s.join(' | '));

  // The headline is selectable HTML, never part of the bitmap.
  const selectable = await page.evaluate(() => {
    const h = document.querySelector('.fl-h1');
    return h && getComputedStyle(h).userSelect !== 'none' && h.textContent.trim().length > 0;
  });
  check('the headline is selectable text, not baked into the image', selectable);

  /* ---- the supply chain ---- */
  const chain = await page.$$eval('.cn-node', els => els.map(e => ({
    implied: e.classList.contains('is-implied'),
    evidenced: e.classList.contains('is-evidenced'),
    gap: e.classList.contains('is-gap'),
    label: (e.querySelector('.cn-label') || {}).textContent,
    count: (e.querySelector('.cn-count') || {}).textContent,
    sub: (e.querySelector('.cn-sub') || {}).textContent,
    link: !!e.querySelector('a.cn-hit'),
    href: (e.querySelector('a.cn-hit') || {}).getAttribute
      ? e.querySelector('a.cn-hit').getAttribute('href') : null,
    records: !!e.querySelector('a.cn-records'),
    what: !!e.querySelector('.cn-what'),
    // An implied stage must READ as lit, not merely be classed as such.
    dim: parseFloat(getComputedStyle(e.querySelector('.cn-asset')).opacity)
  })));
  const untracked = chain.filter(c => !c.evidenced);
  /* Derived from the model. These were 7/3/4 literals, which pinned the page to a
     stale fact the moment photonics gained supplier records and the evidenced
     count went from three to four. */
  const model = chainState();
  const wantEvidenced = model.filter(s => s.happened === 'evidenced').length;
  const wantImplied = model.filter(s => s.happened === 'implied').length;
  check('the chain shows every stage', chain.length === model.length,
    `${chain.length} of ${model.length}`);
  check(`${wantEvidenced} stages are evidenced`,
    chain.filter(c => c.evidenced).length === wantEvidenced, `${chain.filter(c => c.evidenced).length}`);
  check('the upstream stages are lit as implied, not drawn as unknown',
    chain.filter(c => c.implied).length === wantImplied && chain.filter(c => c.gap).length === 0,
    `implied ${chain.filter(c => c.implied).length}, gap ${chain.filter(c => c.gap).length}`);
  check('an implied stage is visibly illuminated rather than greyed out',
    chain.filter(c => c.implied).every(c => c.dim > 0.5),
    chain.filter(c => c.implied).map(c => c.dim).join(', '));
  check('every stage states its state in words, not colour alone',
    chain.every(c => (c.count || '').trim().length > 2), chain.map(c => c.count).join(' | '));
  check('an implied stage says both that it happened and that T2C does not track it',
    chain.filter(c => c.implied).every(c =>
      /happened/i.test(c.count || '') && /not tracked/i.test(c.sub || '')),
    chain.filter(c => c.implied).map(c => `${c.count}/${c.sub}`).join(' | '));
  /* Every stage now leads somewhere real: its explainer. An untracked stage
     still offers no RECORDS link, because it has none — but "nowhere honest to
     go" was only ever true of records, never of an explanation. */
  check('every stage is a real link to its explainer',
    chain.length === 7 && chain.every(c => c.link && /^\/explainers\//.test(c.href || '')),
    chain.map(c => c.href).join(' '));
  check('every stage offers a "What is this?" affordance', chain.every(c => c.what));
  check('an untracked stage offers no records link it cannot honour',
    untracked.every(c => !c.records));
  check('a tracked stage offers its records as a separate action',
    chain.filter(c => c.evidenced).every(c => c.records));

  // The explainer a node opens actually loads, and names the stage.
  const target = chain[0].href;
  await page.goto(new URL(target, page.url()).href, { waitUntil: 'networkidle0' });
  const landed = await page.$eval('.ex-h1', el => el.textContent.trim()).catch(() => null);
  const simple = await page.$$eval('.ex-simple', els => els.length);
  check('a chain node opens a real explainer with one plain-English translation',
    !!landed && simple === 1, `${landed} · ${simple} translation(s)`);
  await page.goBack({ waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 300));

  const guide = await page.$$eval('.cn-guideitem', els => els.map(e => ({
    name: (e.querySelector('.cn-guidename') || {}).textContent,
    plain: ((e.querySelector('.cn-guideplain') || {}).textContent || '').trim(),
    role: ((e.querySelector('.cn-guiderole') || {}).textContent || '').trim()
  })));
  check('the front page explains what happens at all seven stages',
    guide.length === 7 && guide.every(g => g.plain.length > 40 && g.role.length > 20),
    `${guide.length} explained`);

  const cutoutFit = await page.$eval('.cn-asset', el => getComputedStyle(el).objectFit);
  check('stage cutouts are contained, never stretched', cutoutFit === 'contain', cutoutFit);

  /* why-this-matters drawer: focus trapped, Escape closes, focus restored */
  await page.click('#whyBtn');
  await new Promise(r => setTimeout(r, 250));
  const drawerOpen = await page.$eval('#whyDrawer', el => el.open);
  check('the why-this-matters drawer opens', drawerOpen);

  const drawerHeads = await page.$$eval('#whyDrawer h3', els => els.map(e => e.textContent.trim()));
  check('the drawer uses the fixed section order',
    drawerHeads.join('|') === 'What happened|Why it matters|What changed|What happens next|What could block it|View the evidence',
    drawerHeads.join(' | '));

  const focusInside = await page.evaluate(() => document.querySelector('#whyDrawer').contains(document.activeElement));
  check('focus moves into the drawer', focusInside);

  await page.keyboard.press('Escape');
  await new Promise(r => setTimeout(r, 250));
  const drawerClosed = await page.$eval('#whyDrawer', el => !el.open);
  const focusBack = await page.evaluate(() => document.activeElement.id);
  check('Escape closes the drawer and returns focus to its trigger',
    drawerClosed && focusBack === 'whyBtn', `closed=${drawerClosed} focus=${focusBack}`);

  /* delivery rail — on the site page, where the delivery record is */
  await page.goto(base + '/sites/iren-horizon-1/', { waitUntil: 'networkidle0' });
  const railSteps = await page.$$eval('.ed-railstep', els => els.length);
  check('the delivery rail shows all seven stages', railSteps === 7, `${railSteps}`);

  const railLabels = await page.$$eval('.ed-railstep', els => els.map(e => ({
    simple: (e.querySelector('.ed-railsimple') || {}).textContent,
    detailed: (e.querySelector('.ed-raildetail') || {}).textContent,
    state: (e.querySelector('.ed-railstate') || {}).textContent
  })));
  check('every stage carries both label layers and a worded status',
    railLabels.length === 7 && railLabels.every(l => l.simple && l.detailed && l.state.trim().length > 2),
    railLabels.map(l => `${l.simple}/${l.detailed}`).join(', '));

  const railBtn = await page.$('.ed-railbtn[aria-controls]');
  if (railBtn) {
    const before = await page.$eval('.ed-railev', el => el.hidden);
    await railBtn.click();
    await new Promise(r => setTimeout(r, 150));
    const after = await page.$eval('.ed-railev', el => el.hidden);
    check('an evidenced stage opens its sources', before === true && after === false);
  }

  await page.goto(base + '/', { waitUntil: 'networkidle0' });

  /* audience lens: explanation only */
  const factsBefore = await page.$$eval('.ed-prval', els => els.map(e => e.textContent.trim()));
  await page.click('.ed-lenstab[data-lens="power"]');
  await new Promise(r => setTimeout(r, 200));
  const panelShown = await page.$eval('#lens-panel-power', el => !el.hidden);
  const investmentsHidden = await page.$eval('#lens-panel-investments', el => el.hidden);
  const factsAfter = await page.$$eval('.ed-prval', els => els.map(e => e.textContent.trim()));
  check('selecting a lens swaps the explanation', panelShown && investmentsHidden);
  check('selecting a lens changes no research figure',
    factsBefore.join('|') === factsAfter.join('|'), `${factsBefore.join(',')} → ${factsAfter.join(',')}`);

  const lensRoving = await page.evaluate(() => {
    const tabs = [...document.querySelectorAll('.ed-lenstab')];
    return tabs.filter(t => t.getAttribute('tabindex') === '0').length;
  });
  check('the lens tablist has exactly one tab stop', lensRoving === 1, `${lensRoving}`);

  /* explainer: no autoplay, steps advance on demand */
  const nextHidden = await page.$eval('#explNext', el => el.hidden);
  const startVisible = await page.$eval('#explStart', el => !el.hidden);
  check('the explainer does not autoplay', nextHidden && startVisible);

  await page.click('#explStart');
  await new Promise(r => setTimeout(r, 200));
  const status1 = await page.$eval('#explStatus', el => el.textContent);
  check('starting the explainer announces the first step', /step 1 of 5/i.test(status1), status1.slice(0, 50));

  await page.click('#explNext');
  await new Promise(r => setTimeout(r, 200));
  const status2 = await page.$eval('#explStatus', el => el.textContent);
  check('the explainer advances one step at a time', /step 2 of 5/i.test(status2), status2.slice(0, 50));

  /* promise vs reality is never subtracted */
  const promiseBlock = await page.$eval('.ed-card:nth-child(3)', el => el.textContent);
  check('promise and reality carry the not-subtracted caveat',
    /not subtracted/i.test(promiseBlock));
  check('promise and reality state their bases and dates',
    /as of/i.test(promiseBlock) && /(gross utility|critical it)/i.test(promiseBlock));

  /* every illustration is disclosed */
  const illos = await page.$$eval('img.ed-img', els => els.length);
  const discs = await page.$$eval('.ed-disclosure', els => els.length);
  check('every illustration carries a disclosure', discs >= illos, `${illos} images, ${discs} disclosures`);

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

  /* ---- news feed ---- */
  await page.goto(base + '/news/', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 400));

  const cards = await page.$$eval('.newscard', els => els.length);
  check('the news feed renders a card per story', cards === 3, `${cards}`);

  const imgs = await page.$$eval('.newscard', els => els.map(e => {
    const i = e.querySelector('.newsimg');
    return i ? { src: i.getAttribute('src'), brand: i.classList.contains('is-brand'), alt: i.getAttribute('alt') } : null;
  }));

  check('a story with its own artwork keeps it',
    imgs[0] && /\/Logo\/logo-header\.png$/.test(imgs[0].src) && !imgs[0].brand,
    JSON.stringify(imgs[0]));

  check('a publisher house placeholder is replaced by the local mark',
    imgs[1] && imgs[1].src === '/assets/news-yahoo.png' && imgs[1].brand,
    JSON.stringify(imgs[1]));
  check('the replacement mark names its publisher for screen readers',
    imgs[1] && /yahoo/i.test(imgs[1].alt || ''), imgs[1] && imgs[1].alt);

  check('a story with no image and no known mark shows no picture',
    imgs[2] === null, JSON.stringify(imgs[2]));

  const brandFit = await page.$eval('.newsimg.is-brand', el => {
    const cs = getComputedStyle(el);
    return { fit: cs.objectFit, bg: cs.backgroundColor };
  });
  check('the mark is contained rather than cropped', brandFit.fit === 'contain', JSON.stringify(brandFit));

  const external = await page.$$eval('.newscard img', els =>
    els.map(e => e.getAttribute('src')).filter(s => /^https?:/.test(s)).length);
  check('only genuine story artwork is fetched from an external host', external === 1, `${external}`);

  await page.select('#newsCompany', 'IREN');
  await new Promise(r => setTimeout(r, 200));
  const filtered = await page.$$eval('.newscard', els => els.length);
  check('the news company filter narrows the feed', filtered === 1, `${filtered}`);

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

  /* ---- rail steps reveal evidence rather than doing nothing ---- */
  await page.goto(base + '/sites/iren-horizon-1/', { waitUntil: 'networkidle0' });
  const pressable = await page.$$('.ed-railbtn[aria-controls]');
  const firstPanelHidden = await page.$eval('.ed-railev', el => el.hidden);
  await pressable[0].click();
  await new Promise(r => setTimeout(r, 120));
  const afterPanel = await page.$eval('.ed-railev', el => el.hidden);
  check('an evidenced path stage opens its sources',
    firstPanelHidden === true && afterPanel === false);

  const inertAffordance = await page.evaluate(() =>
    // A stage with no sources must not look pressable.
    [...document.querySelectorAll('.ed-railstep')].every(li =>
      li.querySelector('.ed-railbtn[aria-controls]') || !li.querySelector('button')));
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

  /* The calculator once rendered as an empty strip because the quote renderer
     claims every [data-price] element on the page and replaced its contents.
     Assert it actually has its controls, not just its markup. */
  const calc = await page.evaluate(() => {
    const r = document.querySelector('.revcalc');
    if (!r) return null;
    return {
      height: Math.round(r.getBoundingClientRect().height),
      inputs: r.querySelectorAll('input').length,
      revenue: (r.querySelector('[data-out="revenue"]') || {}).textContent
    };
  });
  check('the revenue calculator renders its controls, not an empty strip',
    calc && calc.height > 300 && calc.inputs === 4, JSON.stringify(calc));
  check('the calculator computes a run-rate from the page defaults',
    calc && /\$[\d.]+(m|bn)/.test(calc.revenue || ''), calc && calc.revenue);

  // Changing the multiple must move enterprise value and nothing above it.
  const beforeMult = await page.evaluate(() => ({
    rev: document.querySelector('[data-out="revenue"]').textContent,
    ev: document.querySelector('[data-out="ev"]').textContent
  }));
  await page.evaluate(() => {
    const m = document.querySelector('.revcalc input[id$="-mult"]');
    m.value = '12';
    m.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await new Promise(r => setTimeout(r, 150));
  const afterMult = await page.evaluate(() => ({
    rev: document.querySelector('[data-out="revenue"]').textContent,
    ev: document.querySelector('[data-out="ev"]').textContent
  }));
  check('the multiple moves enterprise value but not revenue',
    afterMult.rev === beforeMult.rev && afterMult.ev !== beforeMult.ev,
    `${beforeMult.ev} → ${afterMult.ev}`);

  // Capacity presets change what is being modelled, and only offer critical-IT
  // measures — pricing gross utility power at a per-MW contract rate would value
  // megawatts that cannot be sold as compute.
  const presets = await page.$$eval('.rvpreset', els =>
    els.map(e => ({ label: e.textContent, mw: Number(e.getAttribute('data-mw')) })));
  check('the calculator offers more than one capacity basis', presets.length > 1,
    presets.map(p => p.mw + 'MW').join(', '));
  check('presets are ordered smallest first', presets.every((p, i) => i === 0 || p.mw >= presets[i - 1].mw));
  const secured = await page.$eval('.rvpresetnote', el => el.textContent);
  check('the page says why secured power is excluded', /gross power/i.test(secured));

  const evBefore = await page.$eval('[data-out="ev"]', el => el.textContent);
  await page.click('.rvpreset:last-child');
  await new Promise(r => setTimeout(r, 150));
  const evAfter = await page.$eval('[data-out="ev"]', el => el.textContent);
  const mwNow = await page.$eval('.revcalc input[id$="-mw"]', el => Number(el.value));
  check('selecting a larger capacity basis remodels the answer',
    evAfter !== evBefore && mwNow === presets[presets.length - 1].mw, `${evBefore} → ${evAfter}`);

  // A share count turns the per-share line on.
  await page.evaluate(() => {
    const s = document.querySelector('.revcalc input[id$="-shares"]');
    s.value = '250';
    s.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await new Promise(r => setTimeout(r, 150));
  const perShare = await page.$eval('[data-out="pershare"]', el => el.textContent);
  check('supplying a share count produces a per-share figure', /^\$[\d.]+$/.test(perShare), perShare);

  const caveat = await page.$eval('[data-out="caveat"]', el => el.textContent);
  check('the per-share figure is qualified as enterprise, not equity, value',
    /net debt/i.test(caveat), caveat.slice(0, 60));

  /* ---- estimates are marked, and can be switched off ---- */
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

  /* ---- returning-user summary and the map's new home ---- */
  await page.goto(base + '/', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 300));

  // First visit: says so rather than manufacturing a return state.
  const firstVisit = await page.$eval('#returnHead', el => el.textContent.trim());
  check('a first visit says so instead of faking a return state',
    /welcome/i.test(firstVisit), firstVisit);

  // Now pretend the last visit predates the whole ledger.
  await page.evaluate(() => {
    localStorage.setItem('t2c-last-visit', '2020-01-01T00:00:00.000Z');
    sessionStorage.removeItem('t2c-session-since');
  });
  await page.reload({ waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 300));
  const ret = await page.evaluate(() => ({
    head: document.getElementById('returnHead').textContent.trim(),
    sub: document.getElementById('returnSub').textContent.trim()
  }));
  check('a returning reader is told how many records changed',
    /\d+ verified changes? while you were away/i.test(ret.head), ret.head);
  check('the summary splits forward, back and evidence-only',
    /moved forward .* moved back .* changed evidence only/i.test(ret.sub), ret.sub);

  // Caught up: a last visit after the newest record.
  await page.evaluate(() => {
    localStorage.setItem('t2c-last-visit', '2099-01-01T00:00:00.000Z');
    sessionStorage.removeItem('t2c-session-since');
  });
  await page.reload({ waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 300));
  const caught = await page.$eval('#returnHead', el => el.textContent.trim());
  check('a reader with nothing new sees the caught-up state', /caught up/i.test(caught), caught);

  /* ---- the map now lives on the Sites explorer ---- */
  await page.goto(base + '/sites/', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 300));
  const zoomBefore = await page.$eval('#mapImg', el => getComputedStyle(el).transform);
  await page.click('#mapIn');
  await new Promise(r => setTimeout(r, 320));
  const zoomAfter = await page.$eval('#mapImg', el => getComputedStyle(el).transform);
  check('the map zoom control works on its new route', zoomBefore !== zoomAfter, `${zoomBefore} -> ${zoomAfter}`);

  const hotHref = await page.$eval('#mapView .hot', el => el.getAttribute('href'));
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle0' }),
    page.click('#mapView .hot')
  ]);
  check('a map hotspot still opens its site', page.url().endsWith(hotHref), page.url());

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

  // The header's watchlist action is the route into it from anywhere.
  await page.goto(base + '/', { waitUntil: 'networkidle0' });
  const watchHref = await page.$eval('.watchbtn-nav', el => el.getAttribute('href'));
  check('the header offers a watchlist destination',
    watchHref === '/companies/?filter=watching', watchHref);

  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle0' }),
    page.click('.watchbtn-nav')
  ]);
  const viaHeader = await page.$$eval('#companyGrid .snap', els => els.filter(e => !e.hidden).length);
  check('the header watchlist action lands on the watched companies', viaHeader === 1, `${viaHeader}`);

  /* ---- signal progress reaches a real anchor ---- */
  await page.goto(base + '/intelligence/?view=today', { waitUntil: 'networkidle0' });
  const todayOnly = await page.$$eval('#signalAll .sig', els => els.filter(e => !e.hidden).length);
  const totalSignals = await page.$$eval('#signalAll .sig', els => els.length);
  check('?view=today narrows the ledger to the finite daily set',
    todayOnly > 0 && todayOnly < totalSignals, `${todayOnly} of ${totalSignals}`);

  // Ledger rows still carry an id, so any /intelligence/#<signal> link lands on
  // the row it names rather than the top of the page.
  const anchorTarget = await page.$eval('#signalAll .sig[id]', el => el.id);
  await page.goto(base + '/intelligence/#' + anchorTarget, { waitUntil: 'networkidle0' });
  const anchorExists = await page.evaluate(id => !!document.getElementById(id), anchorTarget);
  check('a signal anchor lands on the row it names', anchorExists, anchorTarget);

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
  for (const [route, expect] of [['/catalysts/', '/catalysts/'],
    ['/explainers/', '/explainers/']]) {
    await page.goto(base + route, { waitUntil: 'networkidle0' });
    const current = await page.$$eval('[aria-current="page"]', els =>
      els.filter(e => e.classList.contains('navlink')).map(e => e.getAttribute('href')));
    check(`${route} marks itself current in the nav`,
      current.length === 1 && current[0] === expect, current.join(', '));
  }

  // A route demoted to the utility menu still says where you are.
  for (const route of ['/sites/', '/intelligence/', '/news/']) {
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

  const rmChain = await page.$$eval('.cn-node .cn-art',
    els => els.map(e => getComputedStyle(e).animationName));
  check('the chain pulse stops under reduced motion',
    rmChain.every(n => n === 'none'), rmChain.join(','));
  // The chain must still be fully readable with no motion at all.
  const rmLit = await page.$$eval('.cn-node .cn-asset',
    els => els.map(e => +getComputedStyle(e).opacity));
  check('every stage stays legible with motion disabled',
    rmLit.length === 7 && rmLit.every(o => o > 0.7), rmLit.join(','));

  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }]);
  await page.goto(base + '/', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 300));

  /* ---- the chain pulse sweeps one node at a time ---- */
  const sweep = await page.evaluate(async () => {
    const arts = [...document.querySelectorAll('.cn-node .cn-art')];
    const bright = () => arts.map(a => {
      const m = getComputedStyle(a).filter.match(/brightness\(([\d.]+)\)/);
      return m ? parseFloat(m[1]) : 1;
    });
    const first = {}, order = [];
    let maxLit = 0, last = null;
    const t0 = performance.now();
    while (performance.now() - t0 < 7400) {
      const b = bright();
      const lit = b.filter(x => x > 1.06).length;
      if (lit > maxLit) maxLit = lit;
      b.forEach((v, i) => { if (v > 1.06 && first[i] === undefined) first[i] = Math.round(performance.now() - t0); });
      if (lit) {
        const peak = b.indexOf(Math.max(...b));
        if (peak !== last) { order.push(peak); last = peak; }
      }
      await new Promise(r => requestAnimationFrame(r));
    }
    return { first, order, maxLit, count: arts.length };
  });

  check('only one chain node is highlighted at a time',
    sweep.maxLit === 1, `${sweep.maxLit} lit simultaneously`);
  check('every chain node is reached by the pulse',
    Object.keys(sweep.first).length === sweep.count,
    `${Object.keys(sweep.first).length} of ${sweep.count}`);

  // The order the pulse visits nodes must be left to right, wrapping once.
  const wrapped = sweep.order.join(',');
  const forward = sweep.order.every((n, i) =>
    i === 0 || n === (sweep.order[i - 1] + 1) % sweep.count);
  check('the pulse travels left to right, in delivery order', forward, wrapped);

  check('no uncaught errors during the whole run', errors.length === 0, errors.join(' | '));

  await browser.close();
  server.close();

  const failed = results.filter(r => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} interaction checks passed`);
  if (failed.length) process.exitCode = 1;
};

run().catch(e => { console.error(e); process.exit(1); });
