# Design system state after Phases 2–4

Measured, not asserted. Every figure here comes from a rendered page in a real
browser: contrast against the effective background, measure against a real `ch`,
lime coverage against actual pixels.

Companion to [DENSITY-PHASE3.md](DENSITY-PHASE3.md), which covers the density work.

## The squint test (Phase 4)

Each page was captured, blurred until type collapsed into grey blocks, and
judged on what still stood out.

**An automated blob count was written and then distrusted.** It reported eight
pages as "FLAT" — no single element standing out. Looking at the blurred images
showed that was wrong: on `/methodology/`, `/research/` and the rest, the page
heading plainly dominates. The metric was ranking peak brightness rather than
visual mass, so a small lime nav pill outranked a large white headline. The
classification below is by eye, which is what the test actually asks for.

| Page | Verdict |
|---|---|
| `/methodology/` | Heading dominates. Blocks group as the meaning groups. |
| `/research/` | Heading, then a clean vertical column of lime figures. Correct for a comparing page. |
| `/catalysts/` | Headline dominates. |
| `/` | Headline dominates; one filled lime action below it, which is the one primary action the system allows. |
| `/compare/` | Heading dominates. Sparse because the page was in its empty state. |
| `/companies/` | **Failed.** Fixed — see below. |

**Lime coverage is within budget everywhere.** The system allows roughly 5% of a
viewport; the highest measured was 2.09% before the fix and 1.64% after, on the
homepage.

### The one failure

`/companies/` put a filled lime "View company" button on every card — three
across the first viewport, six down the page. The system spends lime once, on
one primary action. Six equal lime blocks is the signal spent six times.

`.cta.small.primary` moved from filled lime to a lime outline that fills on
hover. Lime coverage fell 2.09% → 1.01%. The card keeps its internal hierarchy:
"View company" still outranks the ghost "Compare" beside it. Contrast is 16.2:1
and the 44px touch target is unchanged.

The lime proportion bars inside each card were left alone. They encode a figure,
so they are data, not decoration.

## Accessibility

4,846 text elements measured across 16 pages, against the effective background
(walking up the tree to the first opaque colour) with the correct WCAG floor per
element — 3:1 for large text, 4.5:1 for normal.

### Dark theme — clear

**0 failures** across 4,846 elements on 16 pages. All eleven originally found are
fixed. Three causes:

- `--faint` was used as body text in eleven places; it is a border token, and at
  #5C5C64 it is 3.0:1 on the page and 2.59:1 on a raised surface. All eleven text
  uses moved to `--dim`. `--faint` now has exactly two uses, both borders.
- `--bad` #D14545 → #FF6B78 (was 3.80:1 on a raised surface, now 6.3:1).
- `--unknown` #7A7A82 → #85878B (was 4.04:1, now 4.8:1).

**Why the old table looked fine.** Every ratio was recorded against `--bg`
#0B0B0C. Text sits on `--surface`, `--surface-2` and `--surface-3` as often as on
the page, and all three are lighter, so a ratio against `--bg` is the best case,
not the worst. `--bad` and `--unknown` were recorded as "marginal but passing"
and were, where actually painted, failures.

### Light theme — 102 failing classes, not fixed

The light theme is reachable: `src/app.js:70` sets `data-theme` and there is a
"Light theme" button. Measured the same way, it has **102 failing classes**
against 0 in dark. It was never finished.

| Cause | Count | Detail |
|---|---|---|
| Lime as text on white | 42 | `--brand` is `#D6FF00` in **both** theme blocks. Lime is 1.16:1 on white — effectively invisible. |
| `--warn` `#C98A00` on white | 25 | ~3.0:1. |
| `--ok` `#2E9B52` on white | 12 | ~3.9:1. |
| `--t2c-cyan` `#42D9FF` | 10 | Declared once in `chain.css:17`, no light value. |
| Dark ink on fixed-dark backgrounds | 8 | `--hero-bg` is `#08080A` in both themes, but `--ink` flips to `#0A0A0A`. Dark text on a dark panel, 1.00:1. |
| `#DDDDDD` literals on white | 3 | Non-adapting literals. |

The palette comment already records "lime is 1.16:1 on white, so light mode uses
green for live instead" — that adaptation was made for `--ok` and never extended
to `--brand`, which is the signal colour and appears as text everywhere.

**Not fixed here, deliberately.** Choosing a light-mode signal colour changes the
site's identity in that mode; it is a design decision, not a defect with one
correct answer. The dark-ink-on-dark-panel group is an unambiguous bug and could
be fixed independently of that choice.

### Contrast below floor — historical, now cleared

| Ratio | Element | Colour | Where |
|---|---|---|---|
| 2.59:1 | `.fldunit` "USD" | `#5c5c64` on `#1b1b1e` | `/lab/` |
| 2.91:1 | `.pp-chainlabel` "Materials" | `#5c5c64` on `#0e0e10` | profile |
| 2.91:1 | `.sfweight` "35%" | `#5c5c64` on `#0e0e10` | profile |
| 2.97:1 | `output` "60%" | `#5c5c64` on `#0b0b0c` | profile |
| 3.80:1 | `.stressdelta.is-down` | `#d14545` on `#1b1b1e` | `/lab/` |
| 4.04:1 | `.st.st-unknown` "Not modelled" | `#7a7a82` on `#1b1b1e` | `/lab/` |
| 4.27:1 | `.rvbasis.opinion` "An opinion — not a disclosure" | `#d14545` on `#0e0e10` | profile |
| 4.32:1 | `.nd` "Unavailable" | `#7a7a82` on `#141416` | `/companies/` |

A ninth, fixed separately: the footer disclosure. "T2C is not authorised or
regulated by the Financial Conduct Authority" sat at 3.52:1 — the regulatory
statement was among the least legible text on the site. `.footbase` moved to
`var(--dim)`, 5.85:1.

Three of the eight were markers the standing rules protect — `.st.st-unknown`
("Not modelled"), `.rvbasis.opinion` ("An opinion — not a disclosure") and `.nd`
("Unavailable"). They were *too quiet to meet the floor*, so raising them made
them louder, which is consistent with the rule rather than in tension with it.
Two others were figures — a "35%" and a "60%". A number the reader cannot read is
a number that is not published.

### Type size

189 distinct classes render below 12px, down to 8.5px on `/chain-mapping/`.
Source links (`.src`) and status badges (`.st`) are 10.5px. The system says small
print takes body size at a dimmer colour, never a smaller size, *because those
lines are the evidence*. This remains the largest single piece of drift on the
site.

### Touch targets

33 distinct interactive classes render under the 44px minimum, the worst at 12px:

| Height | Element | Where |
|---|---|---|
| 12px | `a.press` | `/chain-mapping/` |
| 12px | `a` | `/intelligence/` |
| 15px | `a.projlink` | profile |
| 15px | `a.cu-modelsrc` | `/chain/` |
| 16px | `a.src` | profile |
| 17px | `a.snapname` | `/companies/` |

`a.src` is a source link — the evidence — at a 16px touch target. Reaching the
document behind a figure is the site's core action on a phone.

### Focus states

Intact, with one exception. `.palfield input` (`mission.css:510`) sets
`outline: none` with no replacement; the command palette input has only a caret.
`.rvfield` does the same but restores focus with `:focus-within`, and `.cm-hexg`
restores a 2.4px brand halo on `:focus-visible` — those are replacements, not
removals.

### Colour alone

No status, stage or confidence level was found relying on colour alone. Each
carries a label or a glyph as well.

## Open, in priority order

1. Light theme: 102 failing classes, chiefly lime used as text on white. Needs a light-mode signal colour decided.
2. Evidence set at 10.5px — source links and status badges below body size.
3. 33 touch targets under 44px, including source links.
4. `.palfield input` has no visible focus state.
5. Two spacing scales compete (Phase 2); `--ink` is pure `#FFFFFF`.
6. Eight border radius values where the system allows two.
7. `.prose` declared twice, at 72ch and 78ch.
