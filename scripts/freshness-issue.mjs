/**
 * Daily: turn the site's /freshness.json into a GitHub issue.
 *
 * Run by .github/workflows/daily-rebuild.yml after it triggers the rebuild.
 * Waits for the new build's freshness report (checkedAt after this run
 * started), then keeps ONE open issue labelled "freshness" in step with it:
 * opened or updated when filings are waiting to be reviewed, closed when the
 * record has caught up. GitHub emails the repository owner on each change.
 *
 *   GITHUB_TOKEN, GITHUB_REPOSITORY   provided by Actions
 *   SITE                              defaults to https://timetocompute.com
 */
const SITE = process.env.SITE || 'https://timetocompute.com';
const REPO = process.env.GITHUB_REPOSITORY;
const TOKEN = process.env.GITHUB_TOKEN;
const started = Date.now();
const LABEL = 'freshness';

const gh = async (path, opts = {}) => {
  const r = await fetch(`https://api.github.com/repos/${REPO}${path}`, {
    ...opts,
    headers: { Authorization: `Bearer ${TOKEN}`, Accept: 'application/vnd.github+json', 'User-Agent': 't2c-freshness', ...(opts.headers || {}) },
    body: opts.body ? JSON.stringify(opts.body) : undefined
  });
  if (!r.ok) throw new Error(`GitHub ${opts.method || 'GET'} ${path}: ${r.status} ${await r.text()}`);
  return r.status === 204 ? null : r.json();
};

// Wait up to 12 minutes for the rebuild triggered moments ago.
let report = null;
for (let i = 0; i < 48; i++) {
  try {
    const r = await fetch(`${SITE}/freshness.json?t=${Date.now()}`, { headers: { 'Cache-Control': 'no-cache' } });
    if (r.ok) {
      const j = await r.json();
      if (Date.parse(j.checkedAt) >= started - 60000) { report = j; break; }
    }
  } catch { /* keep waiting */ }
  await new Promise(r => setTimeout(r, 15000));
}
if (!report) {
  console.log('::error::No fresh /freshness.json appeared after the rebuild. Check the Vercel build log (SEC_UA may be missing).');
  process.exit(1);
}

const rows = report.companies.flatMap(c => c.unreviewed.map(u => ({ ...u, company: c.name, ticker: c.ticker, through: c.reviewedThrough })));
console.log(`${rows.length} filing(s) not yet reviewed`);

const open = await gh(`/issues?state=open&labels=${LABEL}&per_page=5`);
const existing = open.find(i => !i.pull_request);

if (!rows.length) {
  if (existing) {
    await gh(`/issues/${existing.number}/comments`, { method: 'POST', body: { body: 'All filings reviewed — closing.' } });
    await gh(`/issues/${existing.number}`, { method: 'PATCH', body: { state: 'closed' } });
    console.log(`closed #${existing.number}`);
  }
  process.exit(0);
}

const body = [
  `The daily EDGAR check found **${rows.length} filing${rows.length === 1 ? '' : 's'}** made after the date the record was last reviewed. The site's figures do not reflect them yet.`,
  '',
  '| Filed | Company | Form | What | Link |',
  '|---|---|---|---|---|',
  ...rows.sort((a, b) => b.filed.localeCompare(a.filed))
    .map(r => `| ${r.filed} | ${r.company} (${r.ticker}) | ${r.form} | ${r.description} | [EDGAR](${r.url}) |`),
  '',
  'To clear an entry: run `SEC_UA="T2C research you@example.com" npm run review -- <ticker>` for the sentences that can change the record, then update `data/companies.js`, `projects.js`, `events.js` and `sources.js`, then move the company\'s date in `data/review.js` forward. This issue closes itself once nothing is outstanding.',
  '',
  `_Checked ${report.checkedAt}._`
].join('\n');
const title = `${rows.length} new SEC filing${rows.length === 1 ? '' : 's'} to review`;

if (existing) {
  await gh(`/issues/${existing.number}`, { method: 'PATCH', body: { title, body } });
  console.log(`updated #${existing.number}`);
} else {
  const made = await gh('/issues', { method: 'POST', body: { title, body, labels: [LABEL] } });
  console.log(`opened #${made.number}`);
}
