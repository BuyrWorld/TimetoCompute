# Canonical chain model — specification

Milestone 1 of the chain build. This is the spec, not the implementation. No data
file is written and no view is refactored until it is signed off.

Input: the `buildout-analyst` survey of 19 Aug 2026, which found the chain defined
in **five** places rather than the three the brief assumed.

**Approved so far:** the axis split (§1). Everything in §7 is still open, and the
stage list in §4 is written under the provisional answers recorded there.

---

## 1 · The axis split — APPROVED

Three axes. They describe different things and attach to different objects.

| Axis | Describes | Attaches to | Values |
|---|---|---|---|
| **Stage** | where it sits, atoms → end users | a node (a product class) | 1–10, per the domain map |
| **Commercial maturity** | how far one delivery has progressed | a **record** (project / contract) | `capacity` → `qualified` → `ordered` → `shipping` → `accepted` → `recognised` |
| **Coverage** | how well T2C knows this link | a node | `sourced` / `structural` / `unknown` |

The load-bearing consequence: **a product class has no commercial stage.** "HBM
stack" is never "accepted". A specific operator's site is. Acceptance and revenue
are facts about deliveries, not positions in a supply chain.

### What this changes immediately

`STAGES` (`src/lib/chain.js:48-105`) currently ends with three hexagons that are
commercial states wearing chain-position clothing:

| id | label | actually |
|---|---|---|
| `factory` | AI Factory | a chain position (stage 7–8) — keep |
| `accepted` | Accepted | a commercial state — **leaves the chain** |
| `revenue` | Revenue | a commercial state — **leaves the chain** |

Consequently:

- **`recognised` wins over `revenue`.** Verified: `src/lib/chain.js:121` and
  `src/lib/chainmap.js:748` run the identical query —
  `COMPANIES.filter(c => isKnown(getMeasure(c, 'revenueLiveMw')))` — under two
  variable names and two ids. Only the commercial-ladder name survives.
- **`COMMERCIAL_STAGES` (`data/chainmap.js:209-240`) becomes the sole home of that
  vocabulary.** Nothing else may define an acceptance or revenue state.
- The chain map was already right: it keeps `commercialStage` separate from
  `column`. The homepage was the one conflating them.

---

## 2 · Node schema

Extends the schema in `t2c-build-plan.md` §Milestone 1 with two corrections found
while surveying the existing data.

```js
{
  id:          'wafer-silicon',        // stable, kebab, no 'ref-' prefix
  label:       'Silicon wafer',
  stage:       2,                      // 1–10, canonical
  pillar:      'hbm-packaging',        // or null — REQUIRED, never defaulted
  coverage:    'structural',           // sourced | structural | unknown

  suppliers:   [],                     // companies T2C holds a SOURCED record for
  examples:    ['Shin-Etsu Chemical'], // illustrative only — NOT asserted suppliers
  sources:     [],                     // primary documents; empty unless sourced

  upstream:    ['polysilicon'],
  downstream:  ['litho-tools'],

  simple:      '…',                    // existing field, carried forward
  technical:   '…',
  whyItMatters:'…',
  inputs:      '…',
  outputs:     '…'
}
```

### Correction 1 — `suppliers` and `examples` are not the same field

The build plan lists `suppliers: []` only. The existing reference nodes carry
`examples: [...]` (`data/chainreference.js:82`), which names companies *without*
asserting they supply anyone T2C tracks.

Collapsing the two would manufacture supplier relationships that no document
supports — the exact inference the standing rule forbids: *do not infer that a
company is a direct supplier merely because it operates in the same market.*
**Both fields survive, and the distinction must be visible in the UI.**

### Correction 2 — the plan's `description` field is thinner than what exists

The plan specifies `description (plain English, one line)`. Reference nodes today
carry five content fields: `simple`, `technical`, `whyItMatters`, `inputs`,
`outputs`. Adopting the plan's schema literally would delete four of them.
Nothing is deleted; all five carry forward.

### Removed from the node

- **No `commercialStage`.** Per §1, that belongs to records.
- **No `column`.** The chain map's five columns become a derived view (§5).
- **No `tracked` boolean.** Replaced by three-state `coverage`.

### `pillar` must be explicit

Verified defaults, all silent:

**Fixed in `a5e484a`.** Four silent defaults, one more than the survey found:

| Location | Was | Now |
|---|---|---|
| `chainmap.js:78` | `pillar: 'photonics'` factory default | `null` — a domain claim is never a safe default |
| `chainmap.js:277` | `'power-cooling'` on **every operator** | `null` |
| `chainmap.js:299` | `'power-cooling'` on **every customer** | `null` |
| `chainmap.js:331` | `'power-cooling'` on withheld counterparties | `null` |

Filtering by `power-cooling` returned **20** nodes when 8 are power or cooling.
Now 8. `photonics` and `hbm-packaging` are unchanged at 8 and 5.

Flipping the default silently dropped `photonics` from 8 to 6 mid-change, because
`interconnect-deployed` and `interconnect-copper` were riding it. `inputNodes`,
`componentNodes` and `interconnectNodes` now each declare `'photonics'`
explicitly. Verified across both architecture modes.

**This also settles the sidebar question.** The map says POWER + COOLING is "Not
tracked" while drawing eight power and cooling nodes, which looked like a
contradiction. It is not: all eight are reference tier, and `tracked: false` means
T2C holds no *sourced supplier record*, not that the nodes are absent. The data is
right; the wording is the problem. "Not tracked" reads as "not in the chain" when
it means "no supplier record" — a copy fix for `editorial-voice`, not a data fix.

---

## 3 · Coverage states

From `t2c-build-plan.md`. Restated because the stage list depends on it.

| State | Meaning | Shown as |
|---|---|---|
| `sourced` | A primary document names this and T2C holds it | Solid, full colour |
| `structural` | Genuinely part of the chain; T2C has no supplier record | Solid outline, muted, labelled |
| `unknown` | T2C cannot yet confirm the shape of this link | Dashed, labelled |

**A `structural` node is present and correct. It is not a gap**, and must never be
rendered as an absence or an error.

---

## 4 · The canonical stage list

Ten stages, keyed to the buildout-analyst domain map. Node types are **product
classes, never companies** — the rule `data/chainreference.js` already declares.

Status is against all five current definitions. `HAS` means a node exists;
`BUNDLED` means one node covers several types that may need splitting; `GAP`
means nothing anywhere.

### 1 · Raw materials and inputs
| Node type | Status | Current id |
|---|---|---|
| InP / GaAs substrate | HAS | `input-axt` ⚠ company-derived |
| Polysilicon / silicon wafer | HAS | `ref-silicon-wafer` |
| Refined copper | HAS | `ref-copper` |
| Grain-oriented electrical steel | HAS | `ref-electrical-steel` |
| Rare earths | GAP | — |
| Helium | GAP | — |
| Ultrapure water | GAP | — |
| Refrigerants / dielectric fluids | GAP | — |

### 2 · Specialty processes
| Node type | Status | Current id |
|---|---|---|
| Wafer growth / slicing | BUNDLED | `ref-silicon-wafer` |
| Epitaxy | GAP | — |
| Lithography / etch / deposition | BUNDLED (3 types, 1 node) | `ref-litho-tools` |
| Advanced packaging | BUNDLED (2.5D / hybrid bond / panel) | `ref-advanced-packaging` |
| Test and burn-in | GAP | — |

### 3 · Photonics and interconnect
| Node type | Status | Current id |
|---|---|---|
| CW lasers | HAS | `component-cw-laser` |
| EMLs | HAS | `component-eml` |
| Modulators / drivers / DSPs / retimers | GAP as node types | — |
| Pluggable vs co-packaged optics | HAS | `interconnect-deployed`, `interconnect-next` |
| Fibre | HAS | `component-optical-fibre` |
| Copper DAC / AEC | HAS | `interconnect-copper` |
| Switch silicon | HAS | `ref-switch-silicon` |
| Optical circuit switching | GAP | — |

### 4 · Compute silicon and systems
| Node type | Status | Current id |
|---|---|---|
| GPUs / custom accelerators | BUNDLED | `ref-accelerator` |
| CPUs | GAP | — |
| HBM stacks | HAS | `ref-hbm-stack` |
| Rack-scale systems | BUNDLED (no scale-up/scale-out split) | `ref-rack-integration` |
| Network fabric | HAS | `ref-network-fabric` |

### 5 · Power
| Node type | Status | Current id |
|---|---|---|
| Grid interconnection / queue position | HAS — chain map only | `ref-grid` |
| Transformers / switchgear | HAS | `ref-transformers` |
| Power semiconductors | HAS | `ref-power-semis` |
| Behind-the-meter generation, turbines, fuel cells | GAP | — |
| Curtailment / demand response | GAP | — |

Gross utility power vs critical IT load stays a **measure** on records, not a node.

### 6 · Cooling and thermal
| Node type | Status | Current id |
|---|---|---|
| Direct-to-chip cooling | HAS — split out | `ref-cooling-direct` |
| Immersion cooling | HAS — split out | `ref-cooling-immersion` |
| Rear-door heat exchangers | HAS — split out | `ref-cooling-rear-door` |
| Air cooling | GAP — absent even as a baseline | — |
| Water consumption vs withdrawal, heat reuse | GAP | — |

✅ **Done ahead of the rebuild.** `ref-liquid-cooling` was a single node covering
all three, which is the error the buildout-analyst's own list names as *"liquid
cooled used as one thing"*. Split in `27e553d`, because it was cheap before
Milestones 2–3 hang records off it and expensive after.

Two of the three carry fewer than the three-or-four examples every other
reference node has: the four companies on the old node were redistributed and
none was invented. Sourcing more is research brief 4.

### 7 · Facility and construction
| Node type | Status | Current id |
|---|---|---|
| Shell / powered shell / turnkey fit-out | BUNDLED | `ref-construction` |
| Land, zoning, permitting | GAP | — |
| Commissioning / integrated systems testing | GAP — in prose only | — |

### 8 · Operators
Evidenced `operator-*` nodes, one per tracked company. **No node-type distinction
between powered-shell and full-stack**, or between lease structures — that lives
in `data/companies.js`, outside the chain model. Given the standing rule that
per-megawatt figures must state the business model, this distinction should be
reachable from the chain, not only from the company record.

### 9 · Compute buyers
Evidenced `customer-*` nodes plus `customer-withheld`. No buyer-category
distinction (frontier lab / hyperscaler internal / enterprise / government), and
no reserved / on-demand / spot distinction.

### 10 · End applications
**GAP entirely.** Nothing models end use anywhere; the chain stops at a customer
accepting capacity. Provisionally in scope (§7, decision 9) — see the warning
recorded there.

---

## 5 · Derived views

**No view may define a node.** Each is a grouping declared once, over the
canonical list.

| View | Today | Becomes |
|---|---|---|
| Homepage hexagon row | `STAGES`, 7 items, own definition | a coarse grouping over stages 1–8 |
| Homepage "what happens at each stage" | same `STAGES` object | same grouping, second renderer |
| `/chain/` hexagon track | same `STAGES` again | same grouping, third renderer |
| Chain map columns | `COLUMNS`, 5, own definition | a grouping over stages 1–10 |
| Chain map pillars | `PILLARS`, 3 | one taxonomy — see decision 7 |
| `/chain/` corridors | `CORRIDORS`, 4 | merged into the same taxonomy |

The homepage's 7 hexagons cannot map onto the map's 5 columns: `wafers`, `chips`
and `photonics` each span 2–3 columns simultaneously. That is not a bug to
reconcile — it is why both must become groupings over a finer list rather than
two lists pretending to be the same one.

---

## 6 · What gets deleted

Nothing is deleted until its replacement renders. Then:

- `STAGES` and `chainState()` — `src/lib/chain.js:48-105`, `:118`
- `COLUMNS` — `data/chainmap.js:26-47`
- `REFERENCE_NODES` — `data/chainreference.js:77-276` (content migrates, shape changes)
- `CORRIDORS` — `src/lib/corridor.js:39-59`
- the `tracked` boolean everywhere, replaced by `coverage`

**Rename before deleting:** two unrelated exports are both called `STAGE_BY_ID` —
`data/explainers.js:400` (keyed by `STAGES` ids) and `data/chainmap.js:242` (keyed
by `COMMERCIAL_STAGES` ids). Disjoint id spaces, same name, two files. Today's
imports are correct; a future one will not be.

**Check before deleting:** `STAGE_EXPLAINERS` (`data/explainers.js:30-245`) has 7
entries whose `stageId` matches `STAGES` 1:1, and their URL slugs already differ
from their ids (`chips` → `chips-hbm`, `factory` → `ai-factory`). Those URLs are
live and must not break.

---

## 7 · Still open

The stage list above is written under the provisional answers in the right-hand
column. Each needs confirming or overriding.

| # | Decision | Provisional |
|---|---|---|
| 4 | A stage spanning 2–3 map columns: one node or several? | **Several.** Canonical holds fine-grained nodes; views compress. |
| 7 | Merge `CORRIDORS` (4) and `PILLARS` (3)? | **Merge.** One taxonomy; `hbm-packaging` beats `hbm` as the id. |
| 5 | What may `materials` claim? Its prose names gallium, indium, rare earths, aluminium and concrete; none exist as nodes. | **Change the model, not the prose.** Add them as `structural`. |
| 9 | Is stage 10 in scope? | **In, mostly `unknown`.** |
| ~~6~~ | ~~Is `pillar: 'power-cooling'` on operators/customers intentional?~~ | **Closed — it was a bug.** Fixed in `a5e484a`; see below. |

**On decision 9, a warning worth recording:** end-application mix is rarely
disclosed per contract. This will be the emptiest stage on the site, and the
temptation to infer "this capacity is for training" from a customer's identity
will be constant. That inference is precisely what the standing rules forbid.
Omitting the stage is also a claim — that the chain ends at revenue — which is
why the provisional answer is to include it and let it be honestly empty.

---

## 8 · Verification before Milestone 1 is committed

From the build plan, plus what the survey implies:

1. The homepage chain and the chain map render from the same source and produce
   consistent node counts. If they cannot, say why rather than working around it.
2. No file outside the canonical data file defines a chain node.
3. Every node has an explicit `pillar` — no node inherits a default.
4. `suppliers` and `examples` are never merged in rendering.
5. No node carries a `commercialStage`.
6. Every live URL under `/explainers/` and `/what-is/` still resolves.
7. `npm test`, audit, anchors, overflow, interact all pass.

Node descriptions are written in the build step, not here: the plan requires the
`editorial-voice` skill be loaded before any is drafted.
