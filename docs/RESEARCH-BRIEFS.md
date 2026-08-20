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

**The file has two parts, and they are different in kind.** Briefs 1–4 below are
*fields missing from records that already exist* — a contract with no structure
type, a customer with no credit field. The section after them, "Sourcing the
structural nodes", covers *records that do not exist yet*: 25 chain nodes that are
complete and correct as structure, and carry no supplier record.

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

---

# Sourcing the structural nodes

Raised 20 Aug 2026, after Milestone 2 took the chain from 18 nodes to 43.

**These 25 nodes are not gaps.** Each is `coverage: structural` — a real product
class with a real description and real edges, missing only a supplier record. The
chain is structurally complete without them being sourced, and a structural node
must never be rendered as an absence or an error.

So each brief below answers one question: **what document would move this node
from `structural` to `sourced`?** Not what the value is. Find the document, then
record the value against it.

The four briefs above are different in kind — they are fields missing from records
that already exist. These are records that do not exist yet.

**Priority means one thing here:** whether a reader can currently draw a wrong
conclusion from the node standing unsourced. Not how interesting the subject is,
and not how hard the sourcing would be.

---

## Stage 1 · Raw materials

**`ref-rare-earths` — Rare earth magnets**
- *Misleads:* the path from materials to a data centre looks as though it runs
  only through chips. Magnets reach a site through generating plant and pumps,
  which is a quieter route and easy to miss entirely.
- *Disclosed in:* mining and magnet-maker annual reports; USGS mineral commodity
  summaries; export-control notices.
- *Record needs:* named producers with their step in the chain — mining,
  separation, alloying, magnet manufacture. Those four are frequently different
  companies in different countries, and collapsing them hides where the
  concentration actually sits.
- *Priority:* nice to have.

**`ref-helium` — Helium**
- *Misleads:* nothing on the page suggests a semiconductor input can be short for
  reasons that have nothing to do with semiconductors.
- *Disclosed in:* industrial gas supplier reporting; process specifications from
  epitaxy and deposition tool vendors.
- *Record needs:* suppliers, and the extraction source behind them, since helium
  is recovered as a by-product and its supply answers to the gas market.
- *Priority:* nice to have.

**`ref-ultrapure-water` — Ultrapure water**
- *Misleads:* a reader who has seen the site's water coverage may fold this into
  facility cooling water. They are different inputs against different measures —
  one contamination limits, one a permit.
- *Disclosed in:* fab water treatment vendor disclosure; semiconductor
  manufacturer environmental filings.
- *Record needs:* treatment suppliers and the fabs they serve. Keep water volumes
  out of it: those belong to brief 3, on the facility side.
- *Priority:* nice to have.

**`ref-dielectric-fluid` — Dielectric fluid**
- *Misleads:* immersion cooling reads as a tank decision when the fluid decides as
  much, and two-phase fluids carry regulatory exposure the tank does not.
- *Disclosed in:* fluid manufacturer product briefs; chemical regulatory filings
  and restriction notices covering fluorinated fluids.
- *Record needs:* fluid makers, single-phase against two-phase, and any
  restriction or phase-out applying to a named fluid family.
- *Priority:* useful.

## Stage 2 · Specialty processes

**`ref-test-burn-in` — Test and burn-in**
- *Misleads:* this is the step immediately after the one the site names as the
  binding accelerator constraint. Unsourced, it reads as a formality rather than
  a second capacity pool that can hold parts back.
- *Disclosed in:* outsourced assembly and test annual reports; automated test
  equipment vendor product briefs; packaging capacity commentary in earnings
  calls.
- *Record needs:* test houses and equipment makers, kept apart. The company that
  owns the capacity and the company that sells the machines are rarely the same,
  and conflating them would overstate how quickly capacity can be added.
- *Priority:* critical path.

**`ref-epitaxy` — Epitaxy**
- *Misleads:* the node feeds both optics and power devices, so a constraint here
  reaches two stages at once. Unsourced, neither path shows it.
- *Disclosed in:* growth tool vendor product briefs; compound semiconductor
  foundry disclosure.
- *Record needs:* tool makers and the foundries running them, with the material
  system stated — the equipment for one is not the equipment for another.
- *Priority:* useful.

## Stage 3 · Photonics and interconnect

**`ref-optical-modulator` — Optical modulator**
- *Misleads:* T2C holds seven photonics supplier records, so this stage looks well
  covered. The discrete modulator co-packaged designs depend on is a different
  product from a different supplier set, and an architecture shift moves demand
  onto suppliers the site cannot currently see.
- *Disclosed in:* silicon photonics vendor product briefs; co-packaged optics
  reference designs published by switch silicon vendors.
- *Record needs:* modulator makers, and whether each supplies discrete parts or
  integrated engines.
- *Priority:* useful.

**`ref-optical-dsp` — Optical DSP and drivers**
- *Misleads:* an existing supplier record already ties a named company's signal
  processing to the modules it enables, but no node exists for the function
  itself. The part carrying a growing share of a module's cost and power is
  visible only indirectly.
- *Disclosed in:* DSP and retimer vendor product briefs. One existing record in
  `data/suppliers.js` could attach here once the node is sourced.
- *Record needs:* makers, and the signalling rate each part is specified for,
  since that decides whether a link survives its reach.
- *Priority:* useful.

**`ref-optical-circuit-switch` — Optical circuit switching**
- *Misleads:* unsourced, it invites comparison with switch silicon on bandwidth,
  which is not what it competes on. It changes topology.
- *Disclosed in:* vendor product briefs; operator infrastructure papers describing
  deployment.
- *Record needs:* makers, switching mechanism, and port count. The last bounds the
  topologies it can build.
- *Priority:* nice to have.

## Stage 4 · Compute silicon and systems

**`ref-host-cpu` — Host CPU**
- *Misleads:* rack shortages get attributed to the accelerator almost
  automatically. A tray needs a host processor too, from a separate market with
  separate constraints.
- *Disclosed in:* server processor vendor annual reports; rack integrator bills of
  materials where published.
- *Record needs:* processor designers, and the trays they are specified into.
- *Priority:* useful.

**`ref-scale-up-fabric` — Scale-up fabric**
- *Misleads:* the network fabric node is scale-out, between racks. Without this
  sourced, a bottleneck inside the rack reads as a switch silicon problem, which
  points at the wrong supplier entirely.
- *Disclosed in:* accelerator vendor system architecture briefs; rack-scale system
  documentation describing the intra-pod interconnect.
- *Record needs:* interconnect designers, and the domain size each fabric
  supports — that decides how large a single coherent machine can be.
- *Priority:* useful.

## Stage 5 · Power

**`ref-interconnection-queue` — Interconnection queue**
- *Misleads:* the sharpest one on the page. Announced capacity is routinely read
  as buildable capacity. A queue position is neither secured power nor a date, and
  two sites announcing the same figure can be years apart.
- *Disclosed in:* grid operator queue filings, which are public and searchable per
  project; large-load interconnection tariffs; site disclosure describing queue or
  study status.
- *Record needs:* per site — the queue the request sits in, the study stage
  reached, and any network upgrade obligation the study returned. **Never a
  predicted energisation date.** The studies do not produce one, and inferring it
  would be the invention this model exists to prevent.
- *Priority:* critical path.

**`ref-behind-the-meter-generation` — Behind-the-meter generation**
- *Misleads:* every path to power on the map runs through the grid, so the site
  understates how much announced capacity intends to bypass the queue.
- *Disclosed in:* air permit applications for on-site generation; utility
  large-load tariff filings; operator disclosure of generation strategy.
- *Record needs:* per site — generation type, permit status, fuel supply
  arrangement. Permit status is the load-bearing field: on-site generation trades
  the interconnection study for an air permit, and neither is quick.
- *Priority:* critical path.

**`ref-demand-response` — Curtailment and demand response**
- *Misleads:* contracted megawatts read as always available. Curtailment terms
  make some of them interruptible, which is a different product.
- *Disclosed in:* interconnection agreement terms where excerpted; utility tariff
  filings; demand-response programme enrolment disclosure.
- *Record needs:* per site — whether the connection carries curtailment
  obligations, and whether the site is enrolled in a demand-response programme.
  Firm and interruptible must never be summed into one capacity figure.
- *Priority:* critical path.

## Stage 6 · Cooling and thermal

**`ref-air-cooling` — Air cooling**
- *Misleads:* three of the four cooling nodes are liquid, which makes liquid look
  universal. Deployed fleet capacity and anything below the density threshold is
  still air-cooled.
- *Disclosed in:* air handling vendor product briefs; hall design descriptions in
  site disclosure.
- *Record needs:* makers, and the rack density each approach is specified to. The
  density figure is what makes air and liquid comparable at all.
- *Priority:* useful.

**`ref-cdu` — Coolant distribution units**
- *Misleads:* a real product with its own lead time reads as an accessory to the
  cold plates, so its capacity does not appear as a constraint of its own.
- *Disclosed in:* vendor product briefs and datasheets; open compute working group
  materials.
- *Record needs:* makers and unit capacity, with the basis stated. A unit rated
  for heat rejected is not describing the same thing as one rated for flow.
- *Priority:* useful.

**`ref-heat-rejection-plant` — Heat rejection plant**
- *Misleads:* every cooling path on the map ends here, and unsourced it looks like
  a terminus rather than long-lead equipment that can set a schedule the way a
  transformer does.
- *Disclosed in:* chiller and cooling tower vendor briefs; mechanical
  specifications in construction filings; environmental permits where evaporative
  plant is used.
- *Record needs:* makers, plant type, and whether the approach consumes water. The
  water question connects to brief 3 and should be recorded once, not twice.
- *Priority:* useful.

## Stage 7 · Facility and construction

**`ref-land-permitting` — Land and permitting**
- *Misleads:* projects stall and die here, before construction starts, and the
  site currently shows nothing between an announcement and a build.
- *Disclosed in:* zoning board filings and minutes; environmental impact
  statements; county and municipal permit applications. Local and unglamorous, and
  among the most reliably public material in the whole chain.
- *Record needs:* per site — land control, zoning status, environmental review
  stage, and whether objection proceedings are open. This is often a process
  rather than a vendor, so the record may name jurisdictions rather than
  companies.
- *Priority:* critical path.

**`ref-construction-labour` — Construction and fit-out labour**
- *Misleads:* a site can have concrete poured and equipment delivered and still
  wait on licensed electricians. Unsourced, delays here get attributed to
  materials or to chips.
- *Disclosed in:* contractor risk-factor language on skilled trades availability;
  regional labour market reporting; construction trade press.
- *Record needs:* the trades a site depends on, and regional availability of them.
  Resist a single "labour" figure — the binding trade is usually specific.
- *Priority:* useful.

**`ref-commissioning` — Commissioning**
- *Misleads:* the site tracks energisation and acceptance as gates but has nothing
  on the step that proves a hall between them. Slippage here looks like
  construction slippage, which points at the wrong cause.
- *Disclosed in:* commissioning agent reports; integrated systems testing
  schedules referenced in delivery-date language; trade press on commissioning
  timelines.
- *Record needs:* per site — commissioning start, integrated systems testing
  completion, and the agent where named. Keep it distinct from the acceptance gate
  already tracked: commissioning is the operator proving the hall, acceptance is
  the customer agreeing.
- *Priority:* critical path.

## Stage 9 · Compute buyers

**`ref-buyer-enterprise` — Enterprise buyers**
- *Misleads:* five named customers exist, all of them very large. Demand looks
  more concentrated than it is.
- *Disclosed in:* operator disclosure describing enterprise counterparties;
  earnings commentary separating enterprise from hyperscaler bookings.
- *Record needs:* buyers and their contract shape. Contract structure and credit
  are already briefs 1 and 2 — this brief is about who exists, those two are about
  what is known of each.
- *Priority:* useful.

**`ref-buyer-government` — Public-sector buyers**
- *Misleads:* public procurement runs on appropriation cycles and tender rules, so
  both timing and credit behave unlike any commercial buyer on the page.
- *Disclosed in:* public procurement records and tender awards; national programme
  documents. Unusually well disclosed compared with commercial contracts.
- *Record needs:* the programme, the awarding body, and the procurement mechanism.
- *Priority:* useful.

**`ref-buyer-ai-native` — AI-native buyers**
- *Misleads:* counterparty credit is the least examined risk in the sector and it
  is sharpest here. A contract is worth what the counterparty can pay for its full
  term.
- *Disclosed in:* funding disclosure tied to compute commitments; operator
  customer disclosure; reporting on compute-backed financing.
- *Record needs:* buyers, contract term, and what the commitment is funded
  against. **Never infer creditworthiness from a valuation or a funding round** —
  that is exactly the inference brief 2 exists to prevent.
- *Priority:* useful.

## Stage 10 · End applications

**`ref-training-workload` — Training**
- *Misleads:* training and inference buy capacity in different shapes, and
  applying one's economics to the other is a named error this site exists to
  avoid. Neither is sourced, so the page cannot yet show which a given contract is
  for.
- *Disclosed in:* model developer disclosure of run scale; published benchmark
  results; operator commentary on reserved against on-demand mix.
- *Record needs:* per contract where disclosed — whether capacity is reserved for
  training. **Never inferred from the customer's identity.** A frontier lab buys
  inference capacity too, and guessing the workload from the buyer would be the
  easiest invention available on this stage.
- *Priority:* useful.

**`ref-inference-serving` — Inference serving**
- *Misleads:* as above, in the other direction. Inference demand varies by the
  hour and is often bought on demand, so a utilisation assumption carried over
  from training is wrong both ways.
- *Disclosed in:* provider inference pricing and product pages; published
  benchmark results; operator commentary on capacity allocation.
- *Record needs:* per contract where disclosed — whether capacity is on-demand or
  reserved. Same prohibition as above: not inferred from who the buyer is.
- *Priority:* useful.
