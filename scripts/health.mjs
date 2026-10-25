/**
 * Daily: is the live site actually working?
 *
 * Loads the key pages and API routes and checks each one for the thing that
 * proves it works, not just a 200: the chain on the homepage, a news item,
 * a price, the build-time snapshots that silently skip when a key or a
 * provider fails. Then keeps ONE GitHub issue labelled "health" in step:
 * opened or updated when something is broken, closed when all is well.
 *
 * A provider that is merely rate-limited is reported as a warning, not a
 * failure: the free market-data plan does that, and the site degrades
 * gracefully by design.
 *
 *   node scripts/health.mjs              check and print (exit 1 on failure)
 *   GITHUB_TOKEN + GITHUB_REPOSITORY     also keep the issue (Actions)
 *   SITE                                 defaults to https://timetocompute.com
 */

const has = (re, what) => (body) => re.test(body) ? null : `missing ${what}`;
const json = (test) => (body) => { let j; try { j = JSON.parse(body); } catch { return 'not JSON'; } return test(j); };
const rateLimited = j => /rate-limited|plan-restricted/.test(JSON.stringify(j).slice(0, 2000));

export const CHECKS = [
  { name: 'Homepage chain', path: '/', test: has(/id="cxTrack"/, 'the supply chain') },
  { name: 'Homepage share moves', path: '/', warnOnly: true, test: has(/id="cxHeat"/, 'the share-move snapshot (FINNHUB_KEY at build?)') },
  { name: 'News page', path: '/news/', test: has(/id="nhStories"/, 'the story list') },
  { name: 'Models page', path: '/models/', test: has(/id="mpCountry"/, 'the country picker') },
  { name: 'Catalysts earnings snapshot', path: '/catalysts/', test: has(/T2C_EARNINGS_SNAPSHOT":\{"asOf"/, 'the build-time earnings snapshot') },
  { name: 'Company page', path: '/companies/iren/', test: has(/class="cohero"/, 'the company hero') },
  { name: 'RSS feed', path: '/feed.xml', test: has(/<rss[\s\S]*<item>/, 'feed items') },
  { name: 'Sitemap', path: '/sitemap.xml', test: has(/<urlset[\s\S]*\/models\//, 'the sitemap entries') },
  { name: 'Freshness report', path: '/freshness.json', test: json(j => Array.isArray(j.companies) && j.companies.length ? null : 'no companies checked (SEC_UA at build?)') },
  { name: 'News API', path: '/api/news?symbols=NVDA', test: json(j => j.items?.length ? null : rateLimited(j) ? 'warn:rate-limited' : 'no stories') },
  { name: 'Quote API', path: '/api/quote?symbols=NVDA', test: json(j => j.quotes?.NVDA?.price > 0 ? null : rateLimited(j) ? 'warn:rate-limited' : 'no NVDA price') },
  { name: 'Earnings API', path: '/api/catalysts?symbols=IREN', test: json(j => Array.isArray(j.events) ? null : rateLimited(j) ? 'warn:rate-limited' : 'no events array') },
  { name: 'Filings API', path: '/api/filings?symbols=IREN', test: json(j => j.items?.length ? null : 'no filings') },
  // The digest route should answer — "not configured" until ANTHROPIC_API_KEY is set is fine.
  { name: 'Digest API', path: '/api/digest?url=x', okStatus: [200, 400], test: json(j => j.ok === false && j.reason ? null : 'unexpected answer') }
];

export async function runChecks({ site, get = fetch }) {
  const results = [];
  for (const c of CHECKS) {
    const t0 = Date.now();
    let status = 0, problem = null;
    try {
      const r = await get(`${site}${c.path}`, { headers: { 'Cache-Control': 'no-cache', 'User-Agent': 't2c-health' } });
      status = r.status;
      const body = await r.text();
      if (!(c.okStatus || [200]).includes(status)) problem = `HTTP ${status}`;
      else problem = c.test(body);
    } catch (e) { problem = `unreachable (${e.message})`; }
    const warn = problem && (problem.startsWith('warn:') || c.warnOnly);
    results.push({ name: c.name, path: c.path, status, ms: Date.now() - t0,
      level: !problem ? 'ok' : warn ? 'warn' : 'fail', problem: problem && problem.replace(/^warn:/, '') });
  }
  return results;
}

async function keepIssue(results) {
  const REPO = process.env.GITHUB_REPOSITORY, TOKEN = process.env.GITHUB_TOKEN, LABEL = 'health';
  const gh = async (path, opts = {}) => {
    const r = await fetch(`https://api.github.com/repos/${REPO}${path}`, { ...opts,
      headers: { Authorization: `Bearer ${TOKEN}`, Accept: 'application/vnd.github+json', 'User-Agent': 't2c-health' },
      body: opts.body ? JSON.stringify(opts.body) : undefined });
    if (!r.ok) throw new Error(`GitHub ${opts.method || 'GET'} ${path}: ${r.status} ${await r.text()}`);
    return r.status === 204 ? null : r.json();
  };
  const failing = results.filter(r => r.level === 'fail');
  const existing = (await gh(`/issues?state=open&labels=${LABEL}&per_page=5`)).find(i => !i.pull_request);
  if (!failing.length) {
    if (existing) {
      await gh(`/issues/${existing.number}/comments`, { method: 'POST', body: { body: 'Every check passes again — closing.' } });
      await gh(`/issues/${existing.number}`, { method: 'PATCH', body: { state: 'closed' } });
      console.log(`closed #${existing.number}`);
    }
    return;
  }
  const body = [
    `The daily health check found **${failing.length} problem${failing.length === 1 ? '' : 's'}** on the live site.`, '',
    '| Check | Page | Problem |', '|---|---|---|',
    ...results.filter(r => r.level !== 'ok').map(r => `| ${r.level === 'fail' ? '❌' : '⚠️'} ${r.name} | \`${r.path}\` | ${r.problem} |`), '',
    'Warnings (⚠️) are expected now and then: the free market-data plan rate-limits. This issue closes itself once every check passes.', '',
    `_Checked ${new Date().toISOString()}._`
  ].join('\n');
  const title = `Live site: ${failing.map(f => f.name).join(', ')} failing`;
  if (existing) { await gh(`/issues/${existing.number}`, { method: 'PATCH', body: { title, body } }); console.log(`updated #${existing.number}`); }
  else { const made = await gh('/issues', { method: 'POST', body: { title, body, labels: [LABEL] } }); console.log(`opened #${made.number}`); }
}

// Run directly (not when a test imports the checks).
if (process.argv[1]?.endsWith('health.mjs')) {
  const site = process.env.SITE || 'https://timetocompute.com';
  const results = await runChecks({ site });
  for (const r of results) console.log(`${r.level === 'ok' ? '✓' : r.level === 'warn' ? '!' : '✗'} ${r.name.padEnd(30)} ${String(r.status).padEnd(4)} ${r.ms}ms${r.problem ? '  ' + r.problem : ''}`);
  if (process.env.GITHUB_TOKEN && process.env.GITHUB_REPOSITORY) await keepIssue(results);
  if (results.some(r => r.level === 'fail')) process.exit(1);
}
