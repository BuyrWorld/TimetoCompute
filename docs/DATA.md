# Data definitions and verification rules

Public version at `/methodology/`, generated from the same source. This is the
maintainer's copy. Audit cut-off: **15 August 2026**.

## The three distinctions

Conflating any of these produces a number that looks authoritative and means nothing.

**1. What is being measured** — `powerBasis`

| Basis | Meaning |
|---|---|
| `gross-utility` | Power at the utility connection, before conversion and cooling losses. The largest number a company can quote. |
| `critical-it` | Power available to IT equipment in the hall. The industry's comparable measure. |
| `gpu-load` | Accelerator draw specifically. |
| `not-applicable` | Not a power measurement (a contract value, a count). |

Aggregates are basis-restricted. `aggregate()` **throws** if asked to sum across bases.

**2. What kind of number it is** — `valueStatus`

| Status | Aggregatable | Meaning |
|---|---|---|
| `actual` | yes | Current operating figure. |
| `minimum` | yes | At least this much, from itemised components. Renders with `≥`. |
| `target` | **no** | A management goal for a future date. |
| `pipeline` | **no** | Identified opportunity, not secured. |
| `potential` | **no** | A theoretical "up to" ceiling. |

**3. How well evidenced it is** — `confidence`: `confirmed` / `reported` / `estimated` / `unknown`.
Only `confirmed` counts toward a sourced percentage, and only a **primary** source
(SEC filing, company IR, shareholder letter, regulator, utility) can support it.
News can discover an event; it can never confirm a capacity value.

## Project gates

Fourteen gates tracked independently, from `siteControl` to `revenueCommenced`.
A project is not "at a stage" — Keel's Panther Creek holds 350 MW of contracted firm
power and conditional zoning while environmental permits remain outstanding, and the
data centre itself is **not** marked under construction.

## Rules the build enforces

Run `npm test` or `npm run build` — both execute `runChecks()`.

1. `null` must carry `confidence: 'unknown'`; nothing else may be null.
2. `confirmed` requires a **primary** source, a `verifiedAt` and an `asOf`.
3. `verifiedAt` only where a source exists and was read. Never the render date.
4. A known value with no source must set `sourceRequired`, which renders visibly.
5. Aggregates never mix power bases; the function throws rather than summing.
6. Targets, pipeline and potential can never enter a current-capacity aggregate.
7. Contributors + missing + excluded must equal the company count on every KPI.
8. A `minimum` may not be flagged exhaustive.
9. Customer acceptance requires its own acceptance source.
10. A conditional maximum (`valueMaxBn`) must be flagged `conditional`.
11. Catalysts need a source; `guided-window` may not carry an exact date;
    `confirmed-date` must have one.
12. Comparison is capped at three tickers and de-duplicates.
13. Every source URL must parse and every cited source id must exist.

## Corrections made on 2026-08-15

| Company | Was | Now |
|---|---|---|
| CoreWeave | 3.5 GW pipeline, active blank | 4.2 GW contracted (11 Aug call), 1.5 GW active (30 Jun). 3.7→4.2 preserved in the ledger. |
| Nebius | 310 MW energised critical IT | Not disclosed. 310 MW is Finland's **planned** capacity when fully deployed. 5 GW recorded as a year-end target; 3.5 GW as the measured floor. |
| Keel | 2.2 GW secured | 648 MW secured + 1,513 MW pipeline. Contracted changed from numeric `0` to null with the label "No announced lease". |
| Applied Digital | 600 MW | 1,410 MW critical IT across five itemised campuses; 2.15 GW gross utility; 100 MW operational. |
| TeraWulf | Feb figures shown as current | 839 MW contracted minimum, 102 MW revenue-live, 336 MW building. Feb 2.2 GW / 642.5 MW retained as dated history. Abernathy disposal recorded. |
| IREN | 480 MW construction, "76,000+ GPUs" | 480 MW reclassified as a 2026 target; construction not disclosed. GPU claim removed. 260 MW marked as a **minimum**. |
| All | Bases summed together | Every figure carries a basis and status; aggregates are basis-restricted. |

## Genuine zero versus not disclosed

There is currently **no** genuine numeric zero in the capacity dataset. Keel has no
announced lease — recorded as not disclosed with that label, because a `0` would imply
a measured figure. The distinction is load-bearing: a null coerced to zero would
manufacture a 0% delivery rate for companies that simply have not published.

## The delivery ledger

`data/events.js`. **Never invent an event.** Fourteen entries, every one sourced.
The CoreWeave energisation event's `previousValue` of 1000 MW is derived from the
company's own "expanded by nearly 500 MWs" wording, not a separately published Q1
figure — that derivation is stated in the event's implication text rather than hidden.

## Outstanding verification

Every capacity figure in the dataset is now `confirmed` against a primary source. What
remains unavailable is **third-party market data**, not company data:

- Analyst price targets, per-firm attribution and target horizons — provider plan.
- Daily price history, so no event-reaction study and no performance chart — provider plan.

Company figures that would benefit from a further source: IREN's company-wide
construction total and energised critical IT (currently not disclosed rather than
estimated), and Nebius's current energised MW.
