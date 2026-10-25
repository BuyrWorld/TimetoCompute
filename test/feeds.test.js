import test from 'node:test';
import assert from 'node:assert/strict';
import { feedItems, rssFeed, allFeeds } from '../src/feeds.js';
import { EVENTS, CORRECTIONS } from '../data/events.js';
import { COMPANIES } from '../data/companies.js';

const site = 'https://timetocompute.com';
const freshness = { companies: [{ id: 'iren', ticker: 'IREN', unreviewed: [
  { form: '8-K', filed: '2026-10-30', description: 'Results of operations', accession: '0001878848-26-000099', url: 'https://www.sec.gov/x.htm' }] }] };

test('the site feed carries every record change and correction, newest first, plus unreviewed filings', () => {
  const items = feedItems({ site, freshness });
  assert.equal(items.length, EVENTS.length + CORRECTIONS.length + 1);
  assert.equal(new Set(items.map(i => i.guid)).size, items.length, 'guids repeat');
  assert.equal(items[0].title, 'IREN filed an 8-K: Results of operations');
  for (let i = 1; i < items.length; i++) assert.ok(items[i - 1].date >= items[i].date, 'not newest first');
  for (const i of items) assert.match(i.link, /^https:\/\//, `${i.guid} has a relative link`);
});

test('a company feed holds only that company', () => {
  const items = feedItems({ site, freshness, companyId: 'coreweave' });
  assert.ok(items.length > 0);
  assert.ok(items.every(i => !i.guid.startsWith('t2c-filing-')), 'IREN\'s filing leaked into CoreWeave\'s feed');
  assert.ok(items.every(i => i.link.includes('/companies/coreweave/')), 'a CoreWeave item links elsewhere');
});

test('the feed is stable: built from records, not the clock, and escaped', () => {
  const one = rssFeed({ title: 'A & B', description: 'd', link: site, self: `${site}/feed.xml`, items: feedItems({ site }) });
  const two = rssFeed({ title: 'A & B', description: 'd', link: site, self: `${site}/feed.xml`, items: feedItems({ site }) });
  assert.equal(one, two);
  assert.match(one, /<title>A &amp; B<\/title>/);
  assert.ok(!/&(?!amp;|lt;|gt;|quot;|apos;)/.test(one), 'an unescaped ampersand');
});

test('there is one feed per tracked company, and the site feed', () => {
  const files = allFeeds({ site, freshness: null }).map(([f]) => f);
  assert.deepEqual(files, ['feed.xml', ...COMPANIES.map(c => `companies/${c.slug}/feed.xml`)]);
});
