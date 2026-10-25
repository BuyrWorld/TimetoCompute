/**
 * RSS feeds: the whole record at /feed.xml, and one per tracked company at
 * /companies/<slug>/feed.xml. Alerts without accounts or email.
 *
 * Three kinds of item, each already on the site and each sourced:
 *   - a change to the record (data/events.js), linking its primary source;
 *   - a correction (data/events.js CORRECTIONS), because fixing a figure in
 *     public matters as much as adding one;
 *   - a filing the record has not caught up with yet (the build's freshness
 *     check), so a feed reader hears about a new 8-K the day after it lands.
 *
 * Built from records, not from the build clock, so an unchanged record gives
 * an unchanged feed and readers see no phantom updates.
 */
import { EVENTS, CORRECTIONS } from '../data/events.js';
import { COMPANIES, COMPANY_BY_ID } from '../data/companies.js';
import { SOURCE_BY_ID } from '../data/sources.js';

const xml = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]);
/** A record date (YYYY-MM-DD) as RFC 822, at noon UTC so no reader shifts it a day. */
const rfc822 = d => new Date(`${d}T12:00:00Z`).toUTCString();

export function feedItems({ site, freshness = null, companyId = null }) {
  const mine = x => !companyId || x.companyId === companyId;
  const coUrl = id => `${site}/companies/${COMPANY_BY_ID[id]?.slug || id}/`;
  const items = [];

  for (const e of EVENTS.filter(mine)) {
    const src = (e.sourceIds || []).map(id => SOURCE_BY_ID[id]).filter(Boolean)[0];
    items.push({
      guid: `t2c-event-${e.id}`, date: e.announcedAt, category: 'Record change',
      title: `${COMPANY_BY_ID[e.companyId]?.ticker || ''}: ${e.summary}`.replace(/^: /, ''),
      link: `${coUrl(e.companyId)}#record`,
      description: [e.implication, src ? `Source: ${src.title} (${src.publisher}) ${src.url}` : ''].filter(Boolean).join('\n\n')
    });
  }
  for (const c of CORRECTIONS.filter(mine)) {
    items.push({
      guid: `t2c-correction-${c.id}`, date: c.date, category: 'Correction',
      title: `Correction${c.companyId ? ` (${COMPANY_BY_ID[c.companyId]?.ticker})` : ''}: ${c.summary}`,
      link: c.companyId ? `${coUrl(c.companyId)}#record` : `${site}/`,
      description: c.change
    });
  }
  for (const co of freshness?.companies || []) {
    if (companyId && co.id !== companyId) continue;
    for (const u of co.unreviewed) {
      items.push({
        guid: `t2c-filing-${u.accession}`, date: u.filed, category: 'New filing, not yet reviewed',
        title: `${co.ticker} filed ${/^(8|S-|11|18)/.test(u.form) ? 'an' : 'a'} ${u.form}: ${u.description}`,
        link: u.url,
        description: `Not yet reflected in the figures on T2C. Read it on EDGAR: ${u.url}\n\nCompany page: ${coUrl(co.id)}`
      });
    }
  }
  // Newest first; on the same day a filing leads, then changes, then corrections.
  const rank = { 'New filing, not yet reviewed': 0, 'Record change': 1, Correction: 2 };
  return items.sort((a, b) => b.date.localeCompare(a.date) || rank[a.category] - rank[b.category] || a.guid.localeCompare(b.guid));
}

export function rssFeed({ title, description, link, self, items }) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>${xml(title)}</title>
  <link>${xml(link)}</link>
  <description>${xml(description)}</description>
  <language>en-gb</language>
  <atom:link href="${xml(self)}" rel="self" type="application/rss+xml" />
  ${items.length ? `<lastBuildDate>${rfc822(items[0].date)}</lastBuildDate>` : ''}
${items.map(i => `  <item>
    <title>${xml(i.title)}</title>
    <link>${xml(i.link)}</link>
    <guid isPermaLink="false">${xml(i.guid)}</guid>
    <pubDate>${rfc822(i.date)}</pubDate>
    <category>${xml(i.category)}</category>
    <description>${xml(i.description)}</description>
  </item>`).join('\n')}
</channel>
</rss>
`;
}

/** Every feed the build writes: [path, xml]. */
export function allFeeds({ site, freshness }) {
  const out = [['feed.xml', rssFeed({
    title: 'T2C — Time to Compute: the record', link: `${site}/`, self: `${site}/feed.xml`,
    description: 'Every change to the sourced record of AI data-centre capacity, every correction, and every new SEC filing not yet reviewed.',
    items: feedItems({ site, freshness })
  })]];
  for (const c of COMPANIES) {
    out.push([`companies/${c.slug}/feed.xml`, rssFeed({
      title: `${c.name} (${c.ticker}) on T2C`, link: `${site}/companies/${c.slug}/`, self: `${site}/companies/${c.slug}/feed.xml`,
      description: `Changes to ${c.name}'s sourced capacity record, corrections, and new SEC filings not yet reviewed.`,
      items: feedItems({ site, freshness, companyId: c.id })
    })]);
  }
  return out;
}
