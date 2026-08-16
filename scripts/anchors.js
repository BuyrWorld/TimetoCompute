/**
 * Fragment and heading audit.
 *
 * A link to `/research/#ledger` is only useful if that route has exactly one
 * element with that id. This checks three things the HTML validator does not:
 *
 *   1. Every internal `#fragment` link resolves to an id on the page it names.
 *   2. No page declares the same id twice — a duplicate makes the anchor
 *      ambiguous and the first one silently wins.
 *   3. No page repeats a visible heading, which reads as a broken page even
 *      when the anchors happen to work.
 *
 *   node scripts/anchors.js
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const OUT = path.join(ROOT, 'dist');

const walk = (dir, acc = []) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, acc); else acc.push(p);
  }
  return acc;
};

const files = walk(OUT).filter(f => f.endsWith('.html'));
const rel = f => '/' + path.relative(OUT, f).split(path.sep).join('/').replace(/index\.html$/, '');

const idsOf = html => [...html.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]);
const pages = new Map();
for (const f of files) pages.set(rel(f), fs.readFileSync(f, 'utf8'));

const problems = [];

for (const [route, html] of pages) {
  /* 1. duplicate ids */
  const ids = idsOf(html);
  const seen = new Map();
  for (const id of ids) seen.set(id, (seen.get(id) || 0) + 1);
  for (const [id, n] of seen) {
    if (n > 1) problems.push(`${route}: id "${id}" declared ${n} times — the anchor is ambiguous`);
  }

  /* 2. duplicate visible headings.
        A heading inside a <dialog> is that dialog's accessible name and is never
        on screen at the same time as the page behind it, so repeating the story
        headline there is correct rather than duplicated. */
  const visible = html.replace(/<dialog[\s\S]*?<\/dialog>/g, '');
  const heads = [...visible.matchAll(/<h([12])[^>]*>([\s\S]*?)<\/h\1>/g)]
    .map(m => m[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  const headSeen = new Map();
  for (const h of heads) headSeen.set(h, (headSeen.get(h) || 0) + 1);
  for (const [h, n] of headSeen) {
    if (n > 1) problems.push(`${route}: heading "${h}" appears ${n} times`);
  }

  /* 3. fragment links resolve */
  for (const m of html.matchAll(/href="([^"]*#[^"]+)"/g)) {
    const href = m[1];
    if (/^https?:/.test(href)) continue;
    const [target, frag] = href.split('#');
    if (!frag) continue;
    /* An SVG sprite reference is `file.svg#symbol-id`, not a page anchor. The id
       lives inside the sprite, so resolving it against a built route would
       always fail. Its existence is checked by test/chainmap.test.js against the
       sprite file itself, which is where the symbol actually is. */
    if (/\.svg$/i.test(target)) continue;

    const routeKey = target === '' ? route
      : target.endsWith('/') ? target
        : target + '/';
    const page = pages.get(routeKey);
    if (!page) {
      problems.push(`${route}: link ${href} points at a route that was not built`);
      continue;
    }
    if (!idsOf(page).includes(frag)) {
      problems.push(`${route}: link ${href} — "${frag}" does not exist on ${routeKey}`);
    }
  }
}

console.log(`checked ${pages.size} pages`);
if (problems.length) {
  console.log(`\n${problems.length} problem(s):`);
  for (const p of problems) console.log('  ✗ ' + p);
  process.exitCode = 1;
} else {
  console.log('✓ every fragment resolves, no duplicate ids, no repeated headings');
}
