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

### Contrast below floor — 8 remaining, was 11

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

**Fixed:** the footer disclosure. "T2C is not authorised or regulated by the
Financial Conduct Authority" sat at 3.52:1 — the regulatory statement was among
the least legible text on the site. `.footbase` moved to `var(--dim)`, 5.85:1.

**Two root causes, both needing their own gate:**

1. **`--faint` `#5C5C64` is being used as body and figure text.** The system's own
   palette says Faint is for "large text and borders only, never body copy". Four
   of the eight failures are this, and two of them are *figures* — a "35%" and a
   "60%". A number the reader cannot read is a number that is not published.
2. **`--bad` `#D14545` fails at body size.** Flagged in Phase 2 at 4.4:1 against
   the page background; on raised surfaces it drops to 3.80:1.

Three of the eight are markers the standing rules protect — `.st.st-unknown`
("Not modelled"), `.rvbasis.opinion` ("An opinion — not a disclosure") and `.nd`
("Unavailable"). They are currently *too quiet to meet the floor*, so raising
them makes them louder and is consistent with the rule, not in tension with it.

Not fixed here because both causes are tokens used site-wide, and a global colour
change riding inside a squint-test commit is the exact shape of the Phase 2
spacing incident.

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

1. `--faint` and `--bad` used as body text — 8 contrast failures, 2 of them figures.
2. Evidence set at 10.5px — source links and status badges below body size.
3. 33 touch targets under 44px, including source links.
4. `.palfield input` has no visible focus state.
5. Two spacing scales compete (Phase 2); `--ink` is pure `#FFFFFF`.
6. Eight border radius values where the system allows two.
7. `.prose` declared twice, at 72ch and 78ch.
