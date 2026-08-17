# T2C — per-page titles and descriptions

Every title is under 60 characters, every description between 148 and 158.
Both limits are what Google actually renders, not what it accepts.

Your current homepage title is 84 characters and your description is 209.
Both are being cut, and in the description's case the cut lands mid-clause.

---

## Core pages

### `/` — Home
**Title** (52)
`Which AI data centres are actually delivering — T2C`

**Description** (156)
`Track AI infrastructure from secured power to customer acceptance and disclosed billing. 23 sites, 6 operators, every figure carrying its source document.`

*Why this over the current one:* the existing title front-loads the brand, which
nobody searches for yet. The question is the search intent. Brand goes last until
you have brand demand.

---

### `/chain/` — AI supply chain explorer
**Title** (49)
`AI supply chain explorer — 35 sourced links | T2C`

**Description** (152)
`Trace AI infrastructure from operator to site to customer. Every relationship carries the filing that evidences it, and says plainly where evidence stops.`

---

### `/chain-mapping/`
**⚠ Resolve this first — see the audit.** You have two chain pages competing
for the same query. Pick one canonical URL and 301 the other.

If `/chain-mapping/` survives as the interactive view:

**Title** (54)
`Interactive AI supply chain map — trace any node | T2C`

**Description** (150)
`Follow any dependency through the AI buildout, from raw inputs to billed revenue, with confirmed, ecosystem and inferred links shown separately.`

---

### `/companies/`
**Title** (47)
`Neocloud operators compared by delivery | T2C`

**Description** (155)
`IREN, CoreWeave, Nebius, TeraWulf, Keel and Applied Digital ranked by the furthest delivery stage the evidence supports — not by announced capacity.`

---

### `/sites/`
**Title** (44)
`23 AI data centre projects tracked | T2C`

**Description** (157)
`Every AI data centre site on file, with secured power, construction stage, energisation, customer acceptance and billing status shown against its source.`

---

### `/ai-news/`
**Title** (43)
`AI infrastructure news, filtered | T2C`

**Description** (153)
`Only the news that moves a delivery milestone. Filings, acceptances and capacity announcements from the operators building AI compute, dated and sourced.`

---

### `/catalysts/`
**Title** (46)
`Upcoming AI infrastructure catalysts | T2C`

**Description** (154)
`Guided windows, earnings dates and delivery milestones ahead for tracked AI data centre operators. Windows are shown as periods, never as false deadlines.`

---

### `/explainers/`
**Title** (45)
`AI infrastructure explained, plainly | T2C`

**Description** (149)
`What megawatts, customer acceptance, HBM and photonics actually mean, written for people who did not train as data centre engineers.`

---

### `/methodology/`
**Title** (41)
`How T2C sources every figure | T2C`

**Description** (156)
`The rules behind every number: primary documents only, unknown recorded as unknown, and acceptance never treated as proof that billing has commenced.`

---

## Per-company template

**Title** `{Company} delivery status and capacity | T2C` *(keep under 60)*

**Description**
`{Company}'s AI data centre sites, contracted megawatts and delivery stage, compiled from filings. Shows what is accepted, what is only announced.`

---

## Per-site template

**Title** `{Site name} — {stage} | T2C`

**Description**
`{Operator}'s {site} at {capacity} MW. Current stage: {stage}. Next gate: {gate}. Every milestone shown against the document that evidences it.`

---

## Rules for anything new

1. **Under 60 / under 158.** Not guidelines — the render limits.
2. **Front-load the distinctive noun.** "Neocloud operators compared" beats "T2C's comparison of neocloud operators".
3. **Brand last.** Until brand search volume exists, the pipe-T2C suffix is the only brand mention worth spending characters on.
4. **Never duplicate a description across pages.** Two pages with the same description tells Google they are the same page.
5. **No loading text in server HTML.** "Updating…", "Checking the feed…" and "Checking what changed…" are currently in your rendered markup and can surface in snippets. Render them client-side after mount, or ship the resolved state.
