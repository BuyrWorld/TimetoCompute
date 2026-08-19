# T2C — comprehensive chain build

Eight milestones. Work through them in order. Each is a separate Claude Code
session — do not run two at once, and do not skip ahead. Milestones 1–3 are the
foundation; everything visual depends on them.

**The rule that governs the whole build:** every node in the chain gets a
coverage state, and that state is honest.

| State | Meaning | Shown as |
|---|---|---|
| `sourced` | A primary document names this and T2C holds it | Solid, full colour |
| `structural` | Genuinely part of the chain; T2C has no supplier record | Solid outline, muted, labelled |
| `unknown` | T2C cannot yet confirm the shape of this link | Dashed, labelled |

This replaces the current binary tracked / not-tracked. A structural node is
present and correct — it is not a gap. That distinction is what lets the chain
be comprehensive today and better sourced next month.

---

## Milestone 1 · Canonical chain model

The root cause of everything you flagged. Three views currently disagree
because three views each define the chain separately.

```
The supply chain is defined in three different places and they
disagree with each other. Fix the model before any UI work.

Use the buildout-analyst subagent, read-only, to survey first:

  1. Find every place the chain is defined — the homepage hexagon
     stages, the homepage "what happens at each stage" list, and the
     chain-mapping graph. Report each one's full node list.

  2. Produce a diff. Which nodes appear in one and not the others.
     I already know liquid cooling and grid interconnection are in the
     chain map but absent from the homepage chain, and that the
     chain-map sidebar says POWER + COOLING is untracked while the
     graph contains four power and cooling nodes. Find the rest.

  3. Recommend a single canonical stage list covering the whole
     buildout, atoms to end users. Use its ten-stage domain map. For
     each stage, list the node types that belong in it.

Report and STOP. Do not edit.
```

**Gate 1 — you approve the canonical stage list.**

```
Now build it.

Create a single source of truth for the chain — one data file
defining every stage, every node, and every dependency edge.

Schema per node:
  id, label, stage, description (plain English, one line)
  coverage: sourced | structural | unknown
  suppliers: [] — empty is valid and means structural
  sources: [] — primary documents, empty if not sourced
  upstream: [node ids]
  downstream: [node ids]
  pillar: photonics | power-cooling | hbm-packaging | compute | facility | null

Then refactor all three views to render from this file. No view may
define a node itself. Delete every hardcoded chain list.

Load the editorial-voice skill before writing any node description.

Verification before you commit: assert that the homepage chain and the
chain map render from the same source and produce consistent node
counts. If they cannot, tell me why rather than working around it.

Commit as "Single canonical chain model". Don't push.
```

---

## Milestone 2 · Full chain coverage

```
Use the buildout-analyst subagent to complete the chain.

Against its ten-stage domain map, identify every node type missing
from the canonical model. I expect gaps around:
  - land, zoning and environmental permitting
  - grid interconnection queue position
  - transformers and high-voltage switchgear
  - construction and fit-out labour
  - cooling supply chain beyond liquid cooling
  - network fabric and switch silicon
  - server and rack integration
  - the compute buyers, and what they contract for
  - end applications — training, inference, agents

For each missing node produce a research brief in its standard
format: what it is, why its absence misleads, where it is normally
disclosed, and what fields the record needs. No figures.

Then add every node to the canonical model with coverage: structural.
A structural node is complete and correct — it carries a real
description and real edges. It simply has no supplier record yet.

Also resolve the contradiction I already know about: the chain-map
sidebar claims POWER + COOLING and HBM + PACKAGING are untracked
while the graph contains nodes in both. Either the label is wrong or
the nodes are. Tell me which before changing it.

Commit as "Complete chain coverage". Don't push.
```

**Gate 2 — check the new nodes read correctly before anything renders them.**

---

## Milestone 3 · Phased site records

The Lake Mariner problem. Not a display bug.

```
Site records cannot represent a phased build, and Lake Mariner proves
it: the path-to-billing shows "Being built: In progress" positioned
before "Switched on: Complete", which is incoherent to a reader.

The reality is 102 MW energised and billing, plus 336 MW under
construction across CB-4 and CB-5. Two phases at different stages,
forced onto one track.

Extend the site schema so a site holds one or more phases. Each phase
carries its own name, capacity, measurement basis, gate states and
sources. Site-level totals are computed from phases, never entered.

Then use the source-auditor subagent, read-only, to check every one of
the 23 sites for the same problem — any site whose gate sequence is
non-monotonic is a phased build being misrepresented. Report them all
before you migrate anything.

Also resolve this: the homepage says Lake Mariner is "5 of 5 gates
confirmed" while the site page shows 7 gates with 3 marked Implied.
Two gate counts for one site. Which is correct?

Report first. STOP.
```

**Gate 3 — approve the migration, then:**

```
Migrate the affected sites to phases, starting with Lake Mariner.

Rules:
  - No figure changes during migration. This is restructuring only.
  - Every phase keeps the source that evidenced it.
  - Site totals recompute; if a recomputed total differs from the
    current published total, stop and tell me rather than silently
    changing a number.

Re-run source-auditor afterwards to confirm no source was orphaned.
Commit as "Phased site records". Don't push.
```

---

## Milestone 4 · Path to billing rebuild

```
Rebuild the path-to-billing component now that sites have phases.

Use the ui-architect subagent for structure:
  - Each phase renders as its own track, labelled with its name and
    capacity
  - Sequential integrity is enforced: within a phase, no gate may show
    complete while an earlier gate shows in progress. If the data says
    otherwise, render an explicit conflict marker — never silently
    reorder
  - Gate states stay visible: Complete, In progress, Implied, and
    no-evidence are four distinct states, not three

Then use the visual-designer subagent for treatment:
  - The connector into a gate carries the state of the transition, and
    every connector is coloured. A grey connector between two lime
    gates is the bug I was shown — no connector may be left unstyled
  - Implied and Complete must be distinguishable without colour alone
  - Multiple phase tracks read as siblings, aligned, same treatment

Neither agent changes copy. Load editorial-voice for any new label.

Commit separately per agent. Don't push.
```

---

## Milestone 5 · Homepage chain section

```
Use the homepage-architect subagent on the homepage chain section.

The current version shows seven hexagons, four marked "not tracked by
T2C" in orange. To a first-time visitor that says T2C covers 43% of
its own subject. It also omits power, cooling, grid, construction and
networking entirely.

Now that the canonical model is complete, rework it:

  - Render the full chain, not a seven-stage abbreviation
  - Use the three coverage states. Structural nodes are present and
    solid, not dashed and orange
  - Reframe the coverage line. The current framing is an apology. The
    accurate framing is that T2C tracks the delivery end in sourced
    detail and maps the rest structurally — that is a stated scope,
    not a shortfall
  - If the full chain will not fit the homepage legibly, that is the
    finding: recommend showing the stage groups here and the full node
    graph on the chain page, and say so rather than compressing until
    it is unreadable

Load editorial-voice for the reframing copy. Report before editing.
```

---

## Milestone 6 · The four homepage cards

```
Use the homepage-architect subagent on the "AI buildout today"
section — the four numbered cards.

Card 1, "Who is delivering?", renders segmented lime bars against
WULF, APLD and IREN. There is no key anywhere on the page explaining
what a segment is, gaps appear mid-bar with no way to tell which gate
is missing, and a segmented meter reads as signal strength, implying
a quality ranking. The caption explicitly says the ranking is by
evidenced stage and not by merit. The graphic contradicts the caption.

Decide per card whether it earns homepage space:
  1. Who is delivering — fix the bar with a visible key, or cut the
     bar and show the stage word alone
  2. Next big catalyst — keep or move to /catalysts/
  3. Promise vs reality — this is the strongest of the four; consider
     promoting it
  4. Why should I care — three lens tabs on a homepage is a lot of
     interaction for a first-time visitor. Assess.

Then use the visual-designer subagent on whatever survives.

Report the per-card decision before editing anything.
```

---

## Milestone 7 · Chain map completeness

```
Use the buildout-analyst subagent, read-only, on the chain-mapping
page against the now-complete canonical model.

  - Confirm every canonical node renders
  - Confirm every dependency edge renders, including the ones crossing
    non-adjacent stages
  - Confirm the pillar filters match the node set they claim to filter
  - Flag any node with no upstream and no downstream — an orphan is
    either a missing edge or a node that does not belong

Report and STOP.

Then, after I approve, use the delight-engineer subagent on the same
page. The highest-value interaction here is tracing a dependency: tap
or hover any node and its full upstream and downstream path lights
while everything else dims. Nothing may animate in response to a share
price or a company milestone.
```

---

## Milestone 8 · Finish

```
Final pass, in this order.

1. Use the visual-designer subagent across every page changed in
   milestones 4 to 7. Type scale, spacing rhythm, density by task.
   Report system drift even where you do not fix it.

2. Use the mobile-first subagent on the same pages. The path-to-
   billing with multiple phase tracks is the hard case — a horizontal
   multi-track timeline does not survive 390px. Have it decide between
   vertical stacking or a phase selector, and say which and why before
   implementing.

3. Use the source-auditor subagent across the whole site. This is the
   verification pass: confirm no source link, confidence badge,
   coverage label or "not disclosed" marker was lost across eight
   milestones of restructuring.

4. Use the fca-guard subagent on the homepage and any page where the
   coverage reframing changed the copy.

Report all four. Don't push until I have read them.
```

---

## Notes

**Do not reorder the milestones.** 5 and 6 are the ones you will want to do
first because they are the visible ones. Both will need redoing if the model
changes underneath them.

**The single highest-value item is Milestone 3.** A phased-build schema is
what lets T2C describe reality accurately, and reality in this industry is
phased. Every operator brings capacity online in blocks.

**Milestone 2 will produce a long list.** Add every node structurally, then
source them over time. A structurally complete chain with honest coverage
labels is a stronger position than a short chain that claims full sourcing.
