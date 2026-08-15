# Data definitions and verification rules

The public version of this document is at `/methodology/`, generated from the same
source. This file is the maintainer's copy.

## The problem this model exists to solve

"Contracted" was doing two incompatible jobs in the old data:

- power a company has **contracted from** a utility or landlord — supply
- compute a customer has **contracted to buy** — demand

A company can hold gigawatts of the first with none of the second. Adding them
produced a meaningless total, and comparing companies on the combined figure
flattered whoever had secured the most electricity. They are now separate fields
in separate `family` groups, and `validate.js` fails the build if a total ever
mixes families.

## Fields

| Field | Family | Means |
|---|---|---|
| `securedPowerMw` | power | Grid capacity contracted from a utility, or a powered site secured from a landlord. An agreement about electricity. |
| `permittedPowerMw` | power | Planning, zoning and interconnection approvals granted. |
| `constructionMw` | power | Physical build under way. |
| `energisedCriticalItMw` | power | Critical IT load live and drawing power. Usually what a company calls "active" capacity. |
| `gpuReadyMw` | compute | Accelerators racked and fabric commissioned. Not applicable to powered-shell landlords. |
| `customerContractedMw` | customer | Compute a paying customer has committed to. Demand, not supply. |
| `customerAcceptedMw` | customer | Formally accepted against the contract's acceptance criteria. Starts the revenue clock. |
| `revenueLiveMw` | customer | Accepted and invoicing. The only figure corresponding to money arriving. |

## Every measure carries

`value`, `unit`, `definition`, `effectiveDate`, `source {title,url,publishedDate}`,
`verifiedAt`, `confidence`, optional `note`, and a derived `sourceRequired` flag.

## Confidence

| Level | Counts as verified | Means |
|---|---|---|
| `confirmed` | yes | Stated in a primary document, and the document is linked. |
| `reported` | no | Attributed to the company but read second-hand, or inherited without a recorded source. |
| `estimated` | no | Derived rather than disclosed. Never in a confirmed total. |
| `unknown` | no | Not published. Never zero. |

## The rules the build enforces

1. A `null` value must carry `confidence: 'unknown'`. Nothing else may be null.
2. A `confirmed` value must have both a source URL and a `verifiedAt`.
3. `verifiedAt` may only be set when there is a source that was actually read. It is
   never the render date — "checked today because the page loaded today" was the
   specific failure this replaced.
4. A known value with no source must set `sourceRequired`, which renders visibly.
5. Totals never mix measurement families.
6. Every headline KPI must reconcile to the sum of its underlying records.
7. Unknown values are excluded from totals and counted separately, so every total
   can state how many companies contributed.
8. Confirmed ledger events must have a source URL.

Run `npm test` or `npm run build` — both execute the same `runChecks()`.

## Genuine zero versus not disclosed

Keel reports **0** customer-contracted MW: it has signed no lease and says so. That
is stored as a real `0` and is `isKnown()`. Everything undisclosed is `null`. The
distinction is load-bearing — a `null` coerced to `0` would invent a 0% delivery
rate for companies that simply have not published a number.

## The delivery ledger

`data/events.js`. **Never invent an event.** History that was not recorded is
absent, not reconstructed. The ledger launched with three entries, all from
CoreWeave's Q2 2026 release, and an explicit empty state everywhere else.

One nuance worth knowing: the CoreWeave energisation event's `previousValue` of
1000 MW is derived from the company's own "expanded active power by nearly 500 MWs
to reach 1.5 GW" wording, not from a separately published Q1 figure. That derivation
is stated in the event's `implication` text on the page rather than hidden.

## Outstanding verification

Everything below needs a primary source attached, then promotion to `confirmed`:

| Company | Fields awaiting a source |
|---|---|
| IREN | secured power, construction, customer-contracted, customer-accepted |
| Nebius | secured power, energised |
| TeraWulf | secured power, customer-contracted, energised |
| Keel | secured power, construction, customer-contracted |
| Applied Digital | customer-contracted |

Contract records other than CoreWeave's backlog are likewise `reported`.
