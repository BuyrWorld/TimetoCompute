# T2C — Time to Compute

AI infrastructure delivery intelligence. One question:

> How long does it take for secured power to become accepted, invoicing compute?

Live at **https://timetocompute.com**

---

## Quick start

```bash
npm test        # data integrity rules (node:test, no dependencies)
npm run build   # validate data, generate dist/
npm run dev     # build, then serve dist/ on http://localhost:4321
npm run verify  # test + build + post-build audit — run before pushing
```

There are **no runtime dependencies**. Everything runs on Node 20+ standard library.

`npm run dev` serves the static output only; `/api/*` returns 503 locally because
those are Vercel functions. That is deliberate — it is the quickest way to confirm
the page still renders when the feeds are down.

To exercise the API routes locally, use `vercel dev` with `FINNHUB_KEY` and
`SEC_UA` set in `.env.local` (never committed).

## Architecture

```
data/           structured records — the single source of truth
  schema.js       metric definitions, stages, confidence levels
  companies.js    company records; every figure carries its provenance
  projects.js     site-level projects and customer contracts
  events.js       the delivery ledger + the public corrections log
src/
  lib/compute.js  aggregation, conversion, stage derivation
  lib/validate.js the data integrity rules, run by tests AND by the build
  lib/format.js   all formatting and shared terminology
  ui.js           render helpers used at build time
  app.js          browser runtime (feeds, tabs, calculator) — no build step
  styles.css      design tokens + components
api/            Vercel serverless functions (quote, news, filings)
build.js        generates dist/ from data/ — pages, sitemap, robots, favicon
scripts/audit.js post-build checks: links, metadata, a11y, secret scan
test/           node:test suites
```

**Data flows one way:** `data/` → `src/lib/compute.js` → `src/ui.js` → `dist/`.
No figure is typed into a template. The homepage, the capacity table and each
company page all read the same records, so they cannot drift apart.

The build **fails** if `src/lib/validate.js` finds a problem, so a record that
breaks a promise the site makes to a reader cannot reach production.

## Deployment

Vercel, zero-config apart from `vercel.json`:

- `buildCommand: npm run build`
- `outputDirectory: dist`
- `api/` stays at the repo root and is picked up as serverless functions

Pushing to `main` deploys to production. Required environment variables, set in
the Vercel project (never in code):

| Variable | Used by | Notes |
|---|---|---|
| `FINNHUB_KEY` | `/api/quote`, `/api/news` | free tier is sufficient |
| `SEC_UA` | `/api/filings` | SEC requires `"T2C your@email.com"` |

Keys are only ever read server-side. The audit scans `dist/` for leaked secrets on
every build.

## Adding or changing data

1. Edit the record in `data/`.
2. **Do not overwrite a value silently.** Append an event to `data/events.js` and,
   if the site previously displayed something different, a `CORRECTIONS` entry.
3. Run `npm run verify`.

A figure may only be marked `confirmed` if it has a linked primary document and a
`verifiedAt` date recording when a human actually read it. The build enforces this.

See [docs/DATA.md](docs/DATA.md) for the full definitions and verification rules.

## Current data status

Most inherited capacity figures are marked **`reported` / source required** — they
were compiled from filings, but the compile did not record which filing. They are
shown with that flag rather than presented as verified, and they are excluded from
"sourced" percentages. Attaching primary sources is the main outstanding data task.

CoreWeave is fully sourced to its
[Q2 2026 results](https://investors.coreweave.com/news/news-details/2026/CoreWeave-Reports-Strong-Second-Quarter-2026-Results/default.aspx).
