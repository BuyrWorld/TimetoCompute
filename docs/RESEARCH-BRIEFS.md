# Research briefs

Gaps identified by the `buildout-analyst` subagent that need **sourcing before
anything is built**. Each one is a field T2C does not yet hold, not a figure
waiting to be typed in.

**No numbers appear in this file, and none should be added to it.** A plausible
figure entered here would look exactly like a sourced one by the time it reached
a page, and nobody would be able to tell the difference. Fill a brief by finding
the document, then record the value against that document in `data/` — never the
other way round.

Raised 18 Aug 2026. Nothing here is scheduled; they are ordered by what a reader
could currently get wrong.

---

## 1 · Contract structure is not a field

**Chain stage** 8 · operators
**Priority** Critical path

### What is wrong today

`CONTRACTS` records in `data/projects.js` carry megawatts, term in years, value,
confidence and sources. They carry nothing about **what kind of agreement it
is**.

So every contract renders with equal apparent firmness once it clears
`customer-contracted`. A twenty-year take-or-pay commitment and a lease
terminable for convenience are displayed as the same grade of evidence, because
on the fields T2C holds, they are.

### What a reader could conclude wrongly

That contracted megawatts are comparable across operators. They are not
comparable if one operator's book is take-or-pay and another's is cancellable —
the same figure carries a different probability of ever becoming revenue.

### Where it is disclosed

- The operator's 10-K or 10-Q, in the commitments and contingencies notes
- The lease or master services agreement, where excerpted in an 8-K
- Occasionally described in an earnings call, though the filing is the record

### What the record should contain

- A structure type: take-or-pay / minimum-commitment / capacity-reservation /
  colocation
- Termination and cancellation terms, where disclosed
- The source citation for that classification specifically — not inherited from
  the contract's existing sources, which evidence the megawatts and the value

### How it would surface

One chip beside each contract, where the confidence badge already sits. No new
layout: the company page's contracts section already renders chips per row.

Where an operator has not disclosed the structure, the field stays empty and
reads **Not disclosed** — the same treatment every other undisclosed field gets.

---

## 2 · Counterparty credit quality is not structured

**Chain stage** 9 · compute buyers
**Priority** Useful

### What is wrong today

A credit descriptor appears only where the operator **withheld** the
counterparty's name — "Investment-grade hyperscaler", "High investment-grade
hyperscaler" in the Applied Digital rows. Named counterparties carry no
equivalent field.

So the one place a reader sees credit quality described is the place T2C knows
least about the buyer.

### What a reader could conclude wrongly

That counterparty risk is comparable across rows, or that the withheld
counterparties are the only ones whose credit is worth stating.

### Where it is disclosed

- Rating agency disclosure, where public
- The operator's own risk-factor language describing the counterparty
- The counterparty's own credit profile, where it files

### What the record should contain

- A per-contract or per-customer credit-quality field, with its own source
- Populated **only** where disclosed. Never inferred from a company's size or
  reputation — that is the exact inference this site exists not to make

---

## 3 · Water withdrawal, consumption and rights

**Chain stage** 6–7 · cooling and facility
**Priority** Nice to have

### What is wrong today

The only water-related content is "facility water" listed as an input to the
direct-to-chip and rear-door cooling nodes in `data/chainreference.js`. There is
no coverage of withdrawal against consumption, of water rights, or of permitting
in water-stressed regions.

### What a reader could conclude wrongly

That cooling technology is a cost and performance decision with no permitting
exposure of its own. It can gate a schedule the same way an interconnection
queue does.

### Where it is disclosed

- State and local water-rights permits
- Environmental impact statements
- Utility water service agreements
- The operator's own sustainability or water disclosure

### What the record should contain

- A water metric family keeping **withdrawal and consumption distinct** — they
  are different measurements and are routinely conflated, in the same way gross
  utility power and critical IT load are
- Basis, source and as-of date on each, per the existing measure convention

### Why it is last

No page currently implies anything false about water. This gap is worth filling
because the absence will eventually mislead, not because it does today.

---

## 4 · Example makers for the three cooling approaches

**Chain stage** 6 · cooling and thermal
**Priority** Useful

Raised 19 Aug 2026, when `ref-liquid-cooling` was split into
`ref-cooling-direct`, `ref-cooling-immersion` and `ref-cooling-rear-door`
(`27e553d`).

### What is wrong today

Every other reference node in `data/chainreference.js` carries three or four
example companies. Two of the three cooling nodes carry fewer, because the four
companies on the node before the split were redistributed and **none was added**.
Assigning a vendor to a specific cooling approach is a factual claim, and an
assistant's undated training data is the wrong source for one.

### What a reader could conclude wrongly

That immersion and rear-door cooling are served by a single supplier each, when
the thin list reflects what T2C has verified rather than how concentrated those
markets are. A one-name list reads as a market structure claim.

This is also why `src/lib/chainmap.js` now always renders the example **count**
rather than a bare company name on a reference node — a single name displayed as
the node's org is indistinguishable from an evidenced supplier record.

### Where it is disclosed

- Vendor product pages and datasheets, which state which approach a product implements
- OCP (Open Compute Project) cooling working-group materials and member lists
- Operator RFPs and construction filings naming a cooling vendor for a specific hall
- Trade-body membership lists for immersion and direct-to-chip specifically

### What the record should contain

- For each of the three nodes, example makers who demonstrably operate in **that
  approach**, not in liquid cooling generally — the whole point of the split
- Each name traceable to a document stating which approach it supplies
- No supplier relationship asserted to any tracked operator unless a document
  names both parties, per the standing rule that operating in the same market is
  not evidence of supply

### What would close it

Three or four verified example makers per node, matching the convention every
other reference node already follows.
