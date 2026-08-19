# Phase 3 — density by task

Classification of every page by the reader's task, and the verified effect of
the ten density commits. Written after the fact against a re-measured baseline,
because three of the commit messages quote figures taken on the wrong basis.

## How measure is measured

`ch` is the advance width of "0" in the element's own font. The first probe
approximated it as `0.5 × font-size`, which over-reports measure by roughly 20%
on Archivo. Every figure in this file uses a real `ch`, obtained by measuring a
`width:1ch` span inside each paragraph.

**Corrections to commit messages.** These commits quote a pre-change figure taken
with the 0.5em approximation against a post-change figure taken with a real `ch`,
which overstates the improvement:

| Commit | Says | Actually |
|---|---|---|
| `79ce0d7` ledger row | methodology max 172ch → 71ch | 150ch → 71ch |
| `79ce0d7` ledger row | research max 172ch → 68ch, 17 over → 0 | 150ch → 68ch, 16 over → 0 |
| `4ecb878` profile notes | median 72ch → 70ch, 19 over → 12 | 78ch → 70ch, 22 over → 12 |
| `d8df109` return note | home max 105ch → 72ch | 105ch → 82ch |

The direction and the substance hold in every case. The paragraph counts and the
classification below are unaffected.

## Classification

The system asks for tight rows where the reader compares and a capped measure
where the reader reads. Pages that genuinely do both are listed separately —
per the brief, that is a structural question, not something to split the
difference on.

### COMPARING — the eye moves down a column

| Page | Row height | Verdict |
|---|---|---|
| `/chain/` | 39px | Already correct. 36–40px is the target. |
| `/methodology/` tables | 43px | Correct. |
| `/compare/` | — | Correct. No prose over measure at all. |
| `/companies/` | — | Correct. |
| `/sites/` | — | Card grid, figures in mono, scanning vertically. Correct. |
| `/chain-mapping/` | — | A map, not a table. Correct. |

No row heights were changed. Every comparing surface was already inside the
system's range — this was the phase's most useful negative result.

### READING — the eye needs a return line

`/methodology/`, `/explainers/` and each explainer, `/what-is/*`, `/intelligence/`,
`/ai-news/`, `/news/`, `/terms/`, `/privacy/`, `/contact/`, site records.

Every one of these had at least one prose component with no measure cap.

### BOTH — referred to `ui-architect`, not resolved here

| Page | Why |
|---|---|
| `/companies/<x>/` | 6,389 characters of prose beside 20 table rows and 54 figures. Regions were treated separately — prose capped, table untouched — which is correct per region. Whether one page should carry both jobs is a structural question. |
| `/research/` | 4,143 characters of prose above a 33-row table with 59 column figures and a sideways scroll. Same shape. |
| `/lab/` | An answer card in prose above a 4-row table at a 107px row height. |
| `/` | Already open from the homepage-architect audit. Not touched beyond one measure cap. |

None of these were compromised toward a middle density.

## Verified before and after

Measure is median / max / count over 70ch. Baseline is commit `4d36f8b`.

| Page | Before | After |
|---|---|---|
| home | 41 / 105 / 3 | 41 / 82 / 2 |
| companies index | 70 / 72 / 2 | unchanged |
| company profile | 78 / 174 / 22 | 68 / 78 / 5 |
| sites index | 49 / 187 / 2 | 49 / 74 / 1 |
| site record | 74 / 108 / 3 | unchanged |
| compare | 56 / 56 / 0 | unchanged |
| chain map | 88 / 175 / 3 | 68 / 88 / 1 |
| chain | 68 / 155 / 3 | 68 / 90 / 2 |
| methodology | 71 / 150 / 57 | 71 / 71 / 47 |
| explainers index | 44 / 70 / 0 | unchanged |
| explainer | 78 / 92 / 8 | unchanged |
| what-is | 78 / 92 / 6 | unchanged |
| ai news | 44 / 162 / 2 | 44 / 82 / 1 |
| catalysts | 72 / 117 / 9 | 72 / 82 / 6 |
| intelligence | 141 / 147 / 20 | 68 / 74 / 1 |
| research | 127 / 150 / 16 | 68 / 68 / 0 |
| lab | 74 / 147 / 5 | 68 / 147 / 4 |
| news | 44 / 162 / 2 | 44 / 82 / 1 |
| terms | 71 / 71 / 4 | unchanged |

The widest line on the site fell from 187ch to 147ch, and that remaining 147ch is
`.warnnote`, left uncapped deliberately.

`/explainer/`, `/what-is/` and site records show unchanged because their wide
paragraphs sit at 92ch and 108ch under pre-existing caps of 78–92ch. Those caps
are drift — they are above the 70ch limit — but they are decisions someone made,
not omissions, and moving them changes reading pages that were not otherwise in
scope. Listed as drift below.

## Declined — belongs to another agent, or deliberately not done

- **`.warnnote` at 147ch** (`shell.css:346`) sets `max-width: none` on purpose so
  a caution banner spans the full column. Capping it narrows the banner and makes
  a warning less prominent. Not done.
- **`/methodology/`'s 47 remaining paragraphs over 70ch** sit at 71ch under
  existing 70–74ch caps. At target; churn without benefit.
- **The 12-control chain-mapping header** — `ui-architect`, still open.
- **Homepage restructure** — `homepage-architect`, still open.

## System drift found, and not fixed

1. **Source links and status badges are set at 10.5px** (`styles.css:208`, `:215`).
   The system says small print takes body size at a dimmer colour, never a
   smaller size, *because those lines are the evidence*. This is the largest
   single piece of drift on the site and it works against the one rule that
   matters most here. Not changed in this phase: it is a site-wide type change
   affecting every page, and a global change of that size riding inside a
   per-page density commit is precisely the failure of the Phase 2 spacing
   incident. It needs its own gate.
2. **The type scale is not three sizes plus one mono.** Pages render between 14
   and 27 distinct sizes; the company profile renders 27. Declared body is 15px,
   but most text on the site renders at 10.5–13px.
3. **`.prose` is declared twice** with different measures — `profile.css:11` at
   72ch and `styles.css:381` at 78ch.
4. **Measure caps take 20 distinct values** from 42ch to 92ch across ~50
   declarations. `--measure` now exists; these should collapse onto it.
5. **Border radii: at least eight distinct values** — 2px, 3px, 4px, 6px, 8px,
   12px, 999px, 50%, plus `--radius`, `--m-radius`, `--m-radius-sm`,
   `--ed-radius`. The system allows two.
6. **Two spacing scales still compete** — carried over from Phase 2.
7. **`.palfield input` sets `outline: none`** (`mission.css:510`) with no
   replacement rule. `.rvfield` does the same but restores focus with
   `:focus-within`. The palette input has only a caret.
8. **`.ex-suppliers` rows run to 165px** on explainer pages. Each row stacks a
   name, ticker, coverage, role badge, description and grade — a record, not a
   scan column, on a reading page. Judged correct, recorded because it is the
   tallest row on the site.

## Accessibility

- No confidence badge, source link, "not disclosed" marker, evidence count or
  methodology note changed size, colour, weight or contrast in any of the ten
  commits. Only line length changed.
- Focus states intact everywhere except item 7 above. `.cm-hexg` sets
  `outline: none` but restores a 2.4px brand halo on `:focus-visible`, which is a
  replacement, not a removal.
- Two contrast problems remain open from Phase 2 and are unchanged: `--ink` is
  pure `#FFFFFF`, and `--bad` `#D14545` sits at 4.4:1 against `#0B0B0C`, below the
  4.5 floor for body text.
