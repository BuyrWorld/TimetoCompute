import test from 'node:test';
import assert from 'node:assert/strict';
import { runChecks, CHECKS } from '../scripts/health.mjs';

/* A fake site: every check passes unless a path is overridden. */
const GOOD = {
  '/': '<div id="cxTrack"></div><button id="cxHeat">',
  '/news/': '<ol id="nhStories">', '/models/': '<select id="mpCountry">',
  '/catalysts/': '"T2C_EARNINGS_SNAPSHOT":{"asOf":"2026-10-25"', '/companies/iren/': '<section class="cohero">',
  '/feed.xml': '<rss><item></item></rss>', '/sitemap.xml': '<urlset><loc>https://x/models/</loc>',
  '/freshness.json': '{"companies":[{"id":"iren"}]}',
  '/api/news?symbols=NVDA': '{"items":[{"headline":"x"}]}', '/api/quote?symbols=NVDA': '{"quotes":{"NVDA":{"price":210}}}',
  '/api/catalysts?symbols=IREN': '{"events":[]}', '/api/filings?symbols=IREN': '{"items":[{"form":"8-K"}]}',
  '/api/digest?url=x': '{"ok":false,"reason":"not-configured"}'
};
const site = 'https://t2c.test';
const fake = (over = {}) => async url => {
  const path = url.slice(site.length);
  const v = path in over ? over[path] : GOOD[path];
  if (v instanceof Error) throw v;
  const [status, body] = Array.isArray(v) ? v : [200, v];
  return { status, text: async () => body };
};
const by = rs => Object.fromEntries(rs.map(r => [r.name, r]));

test('a healthy site passes every check', async () => {
  const rs = await runChecks({ site, get: fake() });
  assert.equal(rs.length, CHECKS.length);
  assert.deepEqual(rs.filter(r => r.level !== 'ok').map(r => r.name), []);
});

test('a 200 page missing what it exists for still fails', async () => {
  const r = by(await runChecks({ site, get: fake({ '/': '<html>oops</html>' }) }));
  assert.equal(r['Homepage chain'].level, 'fail');
  assert.match(r['Homepage chain'].problem, /supply chain/);
});

test('a missing build-time snapshot is caught, not shown as healthy', async () => {
  const r = by(await runChecks({ site, get: fake({ '/catalysts/': '"T2C_EARNINGS_SNAPSHOT":null', '/freshness.json': [404, 'nope'] }) }));
  assert.equal(r['Catalysts earnings snapshot'].level, 'fail');
  assert.equal(r['Freshness report'].level, 'fail');
});

test('a rate-limited provider is a warning, a broken route is a failure', async () => {
  const r = by(await runChecks({ site, get: fake({
    '/api/news?symbols=NVDA': '{"items":[],"reason":"rate-limited"}',
    '/api/quote?symbols=NVDA': [500, 'boom'],
    '/api/filings?symbols=IREN': new Error('ECONNRESET')
  }) }));
  assert.equal(r['News API'].level, 'warn');
  assert.equal(r['Quote API'].level, 'fail');
  assert.equal(r['Filings API'].level, 'fail');
  assert.match(r['Filings API'].problem, /unreachable/);
});

test('missing share moves only warn: the heat map is optional by design', async () => {
  const r = by(await runChecks({ site, get: fake({ '/': '<div id="cxTrack"></div>' }) }));
  assert.equal(r['Homepage chain'].level, 'ok');
  assert.equal(r['Homepage share moves'].level, 'warn');
});
