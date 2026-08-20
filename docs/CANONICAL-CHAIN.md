# Canonical chain model

Milestone 1 of the chain build. **Complete.** This document was written as a
spec, and is now a record — building it disproved two of its own claims, and both
corrections are kept below rather than quietly edited out.

Input: the `buildout-analyst` survey of 19 Aug 2026, which found the chain defined
in **five** places rather than the three the brief assumed.

---

## 1 · The axis split

Three axes. They describe different things and attach to different objects.

| Axis | Describes | Attaches to | Values |
|---|---|---|---|
| **Stage** | what kind of thing this is | a node | 1–10 |
| **Commercial maturity** | how far one delivery has progressed | a **record** | `capacity` → `recognised` |
| **Coverage** | how well T2C knows this link | a node | `sourced` / `structural` / `unknown` |

A product class has no commercial stage. "HBM stack" is never "accepted"; a
specific operator's site is. So `accepted` and `revenue` left the chain: they are
commercial states, and the homepage entries reporting them are marked
`axis: 'commercial'` with no chain position.

`recognised` won the naming conflict. `src/lib/chain.js` and
`src/lib/chainmap.js` ran the identical
`COMPANIES.filter(c => isKnown(getMeasure(c, 'revenueLiveMw')))` under two
variable names and two ids.

### Correction 1 — a stage is a domain, not a position in a queue

The spec assumed "atoms to end users" meant stage numbers rise along every edge.
Four edges run backward against it:

```
ref-power-semis       (5 power)   -> ref-rack-integration (4 compute)
ref-cooling-direct    (6 cooling) -> ref-rack-integration (4 compute)
ref-cooling-immersion (6 cooling) -> ref-rack-integration (4 compute)
ref-cooling-rear-door (6 cooling) -> ref-rack-integration (4 compute)
```

Not a numbering mistake. Power and cooling are not a later step than compute —
they are parallel tracks that converge on the rack, built by different industries
on different lead times. **Stage answers what kind of thing something is; the
edges carry the flow.** A `flow` field groups the ten into three tracks
(`silicon`, `site`, `demand`) so a view can lay them out without inferring order
from the numbers.

A test pins those four as *expected*. A test asserting numbers always rise would
be wrong rather than failing.

### Correction 2 — column is not derivable from stage

The spec said the stage list would replace the map's five columns. It cannot.
Five nodes prove it:

| Node | Column says | Stage says |
|---|---|---|
| `ref-transformers` | components | 5 power |
| `ref-power-semis` | components | 5 power |
| `ref-switch-silicon` | systems | 3 photonics |
| `ref-network-fabric` | systems | 3 photonics |
| `ref-hbm-die` | inputs | 2 processes |

A transformer is a component by where it sits in the flow and a power thing by
what it is. Both true, neither recoverable from the other. The node carries both
and no mapping is attempted.

This does not reintroduce the problem the milestone exists to fix. A
*disagreement* is one fact asserted differently in two files. Two different facts
on one node in one file is a node with two attributes.

---

## 2 · Node schema

Two corrections to the schema in `t2c-build-plan.md`, both found by reading the
existing data rather than the plan.

**`suppliers` and `examples` are different fields and both survive.** The plan
listed `suppliers: []` only. Reference nodes already carry `examples: [...]` —
companies named *without* asserting they supply anyone T2C tracks. Collapsing
them would manufacture supplier relationships no document supports.

**The plan's `description (plain English, one line)` is thinner than what
exists.** Reference nodes carry five content fields — `simple`, `technical`,
`whyItMatters`, `inputs`, `outputs`. Adopting the plan literally would delete
four.

**`pillar` is required with no default.** Four silent defaults were found, one
more than the survey reported: the `node()` factory defaulted every node to
`photonics`, and operators, customers and the withheld-counterparties node were
each stamped `power-cooling`. Filtering by POWER + COOLING returned 20 nodes when
8 are power or cooling.

---

## 3 · Coverage states

| State | Meaning | Shown as |
|---|---|---|
| `sourced` | A primary document names this and T2C holds it | Solid, full colour |
| `structural` | Genuinely part of the chain; no supplier record | Solid outline, muted, labelled |
| `unknown` | T2C cannot yet confirm the shape of this link | Dashed, labelled |

**A `structural` node is present and correct. It is not a gap.**

---

## 4 · The ten stages

Node types are product classes, never companies. `BUNDLED` means one node covers
several types that may want splitting; `GAP` means nothing exists anywhere.

| # | Stage | Has | Gaps |
|---|---|---|---|
| 1 | Raw materials | InP/GaAs substrate, silicon wafer, copper, electrical steel | rare earths, helium, ultrapure water, refrigerants |
| 2 | Specialty processes | litho/etch/deposition (BUNDLED), advanced packaging (BUNDLED), wafer growth (BUNDLED) | epitaxy, test and burn-in |
| 3 | Photonics | CW lasers, EMLs, pluggable vs CPO, fibre, copper DAC, switch silicon | modulators/DSPs/retimers as types, optical circuit switching |
| 4 | Compute | accelerators (BUNDLED), HBM stacks, rack integration (BUNDLED), network fabric | CPUs |
| 5 | Power | grid interconnection, transformers, power semiconductors | behind-the-meter generation, curtailment |
| 6 | Cooling | **direct-to-chip, immersion, rear-door — split in `27e553d`** | air cooling, water metrics, heat reuse |
| 7 | Facility | shell/fit-out (BUNDLED) | land and permitting, commissioning |
| 8 | Operators | `operator-*` nodes | powered-shell vs full-stack as a node distinction |
| 9 | Buyers | `customer-*` plus `customer-withheld` | buyer categories, contract types |
| 10 | End applications | — | everything; rarely disclosed per contract |

Stage 6 was one node, `ref-liquid-cooling`, which is the error the
buildout-analyst's own list names as *"liquid cooled used as one thing"*. Split
before Milestones 2–3 hang records off it. Two of the three carry fewer than the
usual three-or-four examples because the four companies on the old node were
redistributed and **none was invented** — that is research brief 4.

---

## 5 · Derived views

**No view defines the chain any more.**

| View | Was | Is |
|---|---|---|
| Homepage hexagons | `STAGES`, own definition | `CHAIN_VIEW`, a declared compression |
| Homepage "what happens at each stage" | same object | same, second renderer |
| `/chain/` hexagon track | same object again | same, third renderer |
| `/chain/` corridors | `CORRIDORS`, own array | the one taxonomy |
| Map pillars | `PILLARS`, own array | `MAP_PILLARS`, filtered from it |
| Map columns | `COLUMNS` | unchanged — an independent axis, per correction 2 |

The homepage compression, with the canonical stages each hexagon covers:

```
materials [1]   wafers [2]   chips [2,4]   photonics [3]   factory [5,6,7,8]
accepted  → commercial rung 'accepted'      (no chain position)
revenue   → commercial rung 'recognised'    (no chain position)
```

Groups overlap — `chips` draws on 2 and 4 — because compressing ten domains into
five hexagons is lossy by nature. A test asserts stages 1–8 are each covered.

---

## 6 · Three contradictions found, all about the same fact

Every one was **whether T2C tracks photonics**, and every one said no while seven
sourced photonics supplier records sat in `data/suppliers.js` — one of them the
AXT to Lumentum agreement, the only named company-to-company supply agreement on
the site.

| Where | Said | Fixed in |
|---|---|---|
| `CORRIDORS` on `/chain/` | `tracked: false`, rendered as a gap | `7fedb0a` |
| `src/lib/chain.js` header | "nothing at all about … photonics. Not thin data: none." | `182fdcf` |
| `STAGES` photonics entry | `tracked: false`, count "no sourced records yet" | `182fdcf` |

The homepage now reads **7 suppliers · 2 with a confirmed award**, and coverage
went 3 of 7 stages to 4 of 7. The count separates confirmed awards from
capability records, because four of the seven evidence only that a company makes
the part and nothing about who it sells to.

**Six more places were pinning those wrong answers in place rather than catching
them:** the coverage note's prose hardcoded the untracked list, two tests in
`shell.test.js`, one in `explainers.test.js`, `scripts/audit.js` and
`scripts/interact.js` all asserted "3 evidenced, 4 implied". The QA harness was
enforcing the bug. All now derive from `chainState()`.

---

## 7 · Naming

Two exports were both called `STAGE_BY_ID`, in different files, over disjoint id
spaces — chain stages in `data/explainers.js`, commercial rungs in
`data/chainmap.js`. Six imports, all correct, and nothing would have failed if
one had not been: a wrong import returns `undefined` and renders a stage with no
explainer, silently.

```
STAGE_BY_ID (explainers) -> EXPLAINER_BY_STAGE
STAGE_BY_ID (chainmap)   -> COMMERCIAL_STAGE_BY_ID
```

The same trap reappeared minutes later when the homepage compression moved into
the data layer: `STAGES` briefly meant the canonical ten in `data/chainstages.js`
and the homepage seven re-exported from `src/lib/chain.js`. Caught by reading,
not by a test — so the canonical list is now `CHAIN_STAGES` and there is a test.

---

## 8 · Decisions

| # | Decision | Outcome |
|---|---|---|
| 1 | `revenue` vs `recognised` | `recognised`. Closed by the axis split. |
| 2 | `hbm` vs `hbm-packaging` | `hbm-packaging`. Closed by the taxonomy merge. |
| 3 | One axis or two | **Three.** Approved, implemented. |
| 4 | A stage spanning columns: one node or several | **Several.** Canonical holds fine-grained nodes; views compress. |
| 6 | Is `pillar: 'power-cooling'` on operators intentional | **No — a bug.** Fixed. |
| 7 | Merge corridors and pillars | **Merged**, and it exposed a live contradiction. |
| 8 | Are the six commercial rungs authoritative | **Yes**, and the only home for that vocabulary. |
| 9 | Is stage 10 in scope | **In**, and honestly empty. |

**Still open — 5 · what `materials` may claim.** Its prose names gallium, indium,
rare earths, aluminium and concrete; none exist as nodes. The answer is to change
the model rather than the prose — those *are* inputs, and the node list is
incomplete. Adding them is Milestone 2's job ("add every node structurally, then
source them over time"), not a fix to make here.

---

## 9 · Verification

Run against the checklist in `t2c-build-plan.md`:

1. ✅ Homepage and map resolve every node through the same `stageOfNode`. The
   homepage covers canonical stages 1–8; the map draws nodes at 1–9. Stage 9 is
   buyers, which the homepage reports through the commercial tail rather than as
   a hexagon — correct per the axis split, not a mismatch.
2. ✅ No reference node carries a `commercialStage`.
3. ✅ Every node has an explicit `pillar`; no node inherits a default.
4. ✅ Every reference node declares a stage.
5. ✅ `suppliers` and `examples` are never merged in rendering.
6. ✅ 488 unit tests, audit, anchors, overflow, 171/171 interaction checks.

Tests went 461 → 488 across the milestone.
