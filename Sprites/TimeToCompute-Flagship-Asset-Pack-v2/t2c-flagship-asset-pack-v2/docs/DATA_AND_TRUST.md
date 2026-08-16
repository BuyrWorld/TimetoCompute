# Data, suppliers, prices and evidence

## Supplier relationship taxonomy

Every supplier row must state why the company appears:

```ts
type SupplierRelationship =
  | 'direct-manufacturer'
  | 'material-supplier'
  | 'production-equipment'
  | 'contract-manufacturer'
  | 'technology-enabler'
  | 'integrator'
  | 'customer'
  | 'ecosystem'
  | 'inferred-exposure';
```

An `ecosystem` or `inferred-exposure` row must not visually imply a confirmed production award.

Each relationship requires:

- concise role description;
- source IDs;
- evidence date;
- confidence;
- first seen and last verified;
- product/generation scope where relevant.

## Market quotes

Share prices are dynamic enrichment, not authored page content.

Create one server-side provider adapter:

```ts
type MarketQuote = {
  symbol: string;
  exchange: string;
  currency: string;
  price: number | null;
  change: number | null;
  changePercent: number | null;
  asOf: string | null;
  marketState: 'pre' | 'open' | 'after' | 'closed' | 'unknown';
  delayMinutes: number | null;
  status: 'live' | 'delayed' | 'stale' | 'unavailable';
};
```

Requirements:

- Fetch on the server; never expose provider secrets.
- Batch symbols in one request where possible.
- Cache according to provider rights and rate limits.
- Display exchange, currency, live/delayed state and `asOf`.
- Show skeleton, unavailable and stale states.
- A quote failure must not block an explainer page.
- Treat primary listings and currencies explicitly.
- Do not scrape finance websites in production.

## Explainer content model

Each stage and component includes:

- canonical name and slug;
- one-sentence definition;
- one plain-English translation;
- significance statement;
- inputs and outputs;
- how-it-works steps;
- upstream and downstream links;
- component children;
- supplier relationships;
- glossary IDs;
- evidence IDs;
- related signal IDs;
- last reviewed date and reviewer.

Use the bracket translation once per section after first technical use. Subsequent occurrences become dotted-underlined glossary triggers.

## AI News signal model

A signal is not merely an article:

```ts
type NewsSignal = {
  id: string;
  title: string;
  status: 'draft' | 'reviewed' | 'published' | 'corrected';
  happened: string;
  matters: string;
  next: string | null;
  materiality: 'low' | 'medium' | 'high';
  confidence: 'low' | 'medium' | 'high';
  stageIds: string[];
  companyIds: string[];
  projectIds: string[];
  sourceIds: string[];
  firstSeen: string;
  lastUpdated: string;
  groupedArticleCount: number;
};
```

Repeated coverage of one event may group into one signal, but corrections and contradictory evidence remain visible.

## Financial values

Every value must include:

- company and reporting period;
- unit and currency;
- value or honest null;
- whether reported, calculated or estimated;
- source document and location;
- calculation formula when calculated;
- last updated timestamp.

Never silently mix quarterly and year-to-date cash flows. Never present market capitalisation as a filing value. Never treat contracted capacity as recognised revenue.

## Evidence drawer

Every material claim should open a consistent drawer containing:

- exact claim;
- source title, publisher and date;
- primary/secondary classification;
- supporting excerpt within licensing limits;
- relationship type;
- confidence rationale;
- last verification;
- correction/report-error action.

