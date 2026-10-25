# TimeToCompute — AI Infrastructure Chain Upgrade
## Claude Code implementation brief

You are working on the existing TimeToCompute website (timetocompute.com).

Your task is to upgrade the existing **Chain** page so it becomes a genuinely useful interactive map of the AI compute value chain, while preserving the existing visual identity and making the page feel more like an intelligence product than a static infographic.

DO NOT redesign the entire site.
DO NOT replace the existing T2C visual identity.
DO NOT turn the page into a generic AI-generated dashboard.
Work from the existing implementation and extend it carefully.

---

## 1. Existing visual direction

The current page already has:
- dark / near-black background
- T2C lime / acid-green accent
- horizontal chain of vertical stage cards
- numbered stages
- hexagonal stage illustrations
- company cards inside each stage
- compact investor-focused design
- top navigation: Chain / News / Models / Catalysts / Companies

Preserve this language.

The upgraded chain should feel:
- institutional but exciting
- dense with information without becoming cluttered
- understandable within ~10 seconds
- useful to investors researching AI infrastructure dependencies
- clearly related to the existing T2C product

Avoid:
- huge gradients
- glassmorphism everywhere
- oversized rounded cards
- excessive animations
- chatbot-style UI
- long explanatory paragraphs
- generic SaaS styling

---


# 2A. Production stage artwork — mandatory

Before changing any stage artwork, inspect the existing repository asset pack:

`Sprites/TimeToCompute-Flagship-Asset-Pack-v2/t2c-flagship-asset-pack-v2/`

The existing quality bar is the detailed transparent 3D cutout system used by assets such as:
- `stage-materials-*`
- `stage-wafer-*`
- `stage-photonics-*`
- `stage-chips-hbm-*`
- `stage-power-cooling-*`
- `stage-server-rack-*`
- `stage-ai-factory-*`

Do not replace these with flat SVG icons, generic line illustrations, emojis or newly invented hexagons.

This upgrade package includes three production-grade additions:
- Stage 5: `assets/responsive/stage-servers-racks-networking-*`
- Stage 8: `assets/responsive/stage-datacentre-owners-*`
- Stage 11: `assets/responsive/stage-models-platforms-*`

Integration rules:
- keep the existing stage frame/hex treatment separate from the raster cutout;
- use the 384 WebP for normal cards/nodes;
- use 192 WebP for compact/mobile;
- use 768 WebP for large cards/detail views;
- use 1280 PNG only for high-density/large fallback;
- render in a 1:1 box with `object-fit: contain`;
- never stretch or crop the asset;
- preserve alpha transparency;
- reuse existing high-quality repository artwork for stages that already have a suitable asset.


# 2. Core change: upgrade from 9 stages to 12 stages

Use the following value-chain structure.

## Stage 1 — Raw materials
Subtitle:
"the mined and refined inputs everything else starts with"

Suggested companies:
- Freeport-McMoRan — FCX
- MP Materials — MP
- Rio Tinto — RIO
- Albemarle — ALB
- Lynas Rare Earths — optional / non-US ticker handling if supported

Relevant material tags:
- copper
- rare earths
- lithium
- aluminium
- specialty metals

---

## Stage 2 — Semiconductor equipment & fabrication
Subtitle:
"the fabs and tools that turn materials into advanced semiconductor components"

Suggested companies:
- TSMC — TSM
- ASML — ASML
- Applied Materials — AMAT
- Lam Research — LRCX
- KLA — KLAC
- Amkor — AMKR

Important:
TSMC is fabrication.
ASML / Applied / Lam / KLA are semiconductor equipment.
Amkor is packaging/testing.

Keep them together at this abstraction level, but allow future subcategory metadata.

---

## Stage 3 — Photonics & interconnect
Subtitle:
"moving enormous amounts of data between chips, racks and facilities"

Suggested companies:
- Lumentum — LITE
- Coherent — COHR
- Fabrinet — FN
- Marvell — MRVL
- Broadcom — AVGO
- Credo — CRDO
- Corning — GLW
- Ciena — CIEN

This stage should visibly communicate:
OPTICS / DSP / CABLES / INTERCONNECT

---

## Stage 4 — Compute silicon & memory
Subtitle:
"accelerators, CPUs and memory that perform AI workloads"

Suggested companies:
- NVIDIA — NVDA
- AMD — AMD
- Micron — MU
- SK hynix — use private/non-US display style
- Samsung Electronics — use private/non-US display style
- Intel — INTC
- Arm — ARM

Also support optional chip-program metadata:
- Google TPU
- AWS Trainium
- Microsoft Maia
- Meta MTIA

Do not present custom chips as normal public-company cards unless tied to the parent company.

---

## Stage 5 — Servers, racks & networking
Subtitle:
"assembling chips into clusters and connecting them into one AI system"

This is a NEW stage.

Suggested companies:
- Supermicro — SMCI
- Dell Technologies — DELL
- Hewlett Packard Enterprise — HPE
- Arista Networks — ANET
- Cisco — CSCO
- Celestica — CLS
- NVIDIA networking — NVDA

This stage is important.
It represents:
- servers
- racks
- switches
- Ethernet / InfiniBand
- cluster fabric
- rack-scale integration

Arista should be prominent.

---

## Stage 6 — Power & cooling
Subtitle:
"bringing electricity into the site and removing the heat"

Suggested companies:
- GE Vernova — GEV
- Eaton — ETN
- Constellation Energy — CEG
- Bloom Energy — BE
- Vertiv — VRT
- nVent — NVT
- Modine — MOD
- Schneider Electric — SU.PA or non-US display style
- ABB — ABB
- Siemens Energy — ENR.DE / non-US style
- Trane Technologies — TT
- Cummins — CMI
- Caterpillar — CAT

Support tags:
POWER
UPS
SWITCHGEAR
TRANSFORMERS
GENERATORS
LIQUID COOLING
THERMAL

---

## Stage 7 — Facility & construction
Subtitle:
"designing, building and commissioning the physical data-centre campus"

Suggested companies:
- Quanta Services — PWR
- EMCOR — EME
- Comfort Systems USA — FIX
- Bechtel — private
- Jacobs — J
- AECOM — ACM
- Fluor — FLR

Allow private companies to render without a ticker.

---

## Stage 8 — Data-centre owners & developers
Subtitle:
"owning the land, buildings, substations and long-lived infrastructure"

This is a NEW stage.

Suggested companies:
- Digital Realty — DLR
- Equinix — EQIX
- QTS — private
- Vantage Data Centers — private
- CyrusOne — private
- DataBank — private

This stage should remain visually separate from compute operators.

Reason:
owning/developing the physical data-centre asset is economically different from operating GPU compute.

---

## Stage 9 — GPU clouds & compute operators
Subtitle:
"turning physical infrastructure and accelerators into rentable compute"

Suggested companies:
- IREN — IREN
- CoreWeave — CRWV
- Nebius — NBIS
- TeraWulf — WULF
- Applied Digital — APLD
- Crusoe — private
- Lambda — private
- Fluidstack — private

Make IREN, CoreWeave and Nebius easy to spot.

---

## Stage 10 — Compute buyers
Subtitle:
"the organisations contracting and consuming large blocks of AI capacity"

Suggested organisations:
- Microsoft — MSFT
- Meta — META
- Google — GOOGL
- Amazon — AMZN
- Oracle — ORCL
- OpenAI — private
- Anthropic — private
- xAI — private

Optional future category labels:
HYPERSCALER
AI LAB
ENTERPRISE

---

## Stage 11 — Models & AI platforms
Subtitle:
"the intelligence layer trained and served on the underlying compute"

This is a NEW stage.

Suggested models/platforms:
- GPT
- Claude
- Gemini
- Llama
- Grok
- Mistral
- DeepSeek

These are NOT necessarily equities.

Model cards should therefore support:
- parent organisation
- model/platform name
- logo/icon
- optional model family metadata

Examples:
GPT → OpenAI
Claude → Anthropic
Gemini → Google
Llama → Meta
Grok → xAI

---

## Stage 12 — End applications
Subtitle:
"where compute becomes software, automation and real-world economic value"

Suggested examples:
- ChatGPT
- Microsoft Copilot
- GitHub Copilot
- Claude
- Gemini
- Perplexity
- Cursor
- Salesforce Agentforce
- Adobe Firefly
- autonomous systems
- robotics
- drug discovery
- industrial AI

Do not make this look like an app-store grid.
Keep the same chain visual language.

---

# 3. Critical interaction: dependency highlighting

The major upgrade is interactivity.

When the user clicks a company or organisation:
1. Highlight the selected entity.
2. Dim unrelated cards.
3. Highlight known upstream suppliers / dependencies.
4. Highlight downstream customers / consumers / applications.
5. Highlight the connecting chain line between relevant stages.
6. Show a compact detail drawer or popover.

Example:

Selecting IREN could highlight:
- NVIDIA
- Dell / Supermicro if relationship data exists
- power/cooling infrastructure where verified
- IREN
- Microsoft
- relevant AI workloads/end consumers where verified

IMPORTANT:
Do NOT invent dependencies.
Relationships must be marked with a confidence/source model.

Relationship schema should support:
- verified
- reported
- inferred
- ecosystem
- unknown

Only "verified" and "reported" should be shown as definite relationships in the UI.

---

# 4. Data architecture

Do NOT hard-code the page as repeated JSX.

Build a data-driven model.

Recommended TypeScript interfaces:

```ts
type StageId =
  | "raw-materials"
  | "semiconductor-fabrication"
  | "photonics-interconnect"
  | "compute-silicon-memory"
  | "servers-racks-networking"
  | "power-cooling"
  | "facility-construction"
  | "datacentre-owners"
  | "compute-operators"
  | "compute-buyers"
  | "models-platforms"
  | "applications";

type EntityType =
  | "public-company"
  | "private-company"
  | "organisation"
  | "model"
  | "application"
  | "technology";

interface ChainStage {
  id: StageId;
  index: number;
  title: string;
  subtitle: string;
  icon?: string;
  accent?: "lime" | "cyan" | "amber";
}

interface ChainEntity {
  id: string;
  name: string;
  ticker?: string;
  stageId: StageId;
  entityType: EntityType;
  logo?: string;
  tags?: string[];
  parentId?: string;
  description?: string;
  url?: string;
}

type RelationshipConfidence =
  | "verified"
  | "reported"
  | "inferred"
  | "ecosystem";

interface ChainRelationship {
  id: string;
  sourceId: string;
  targetId: string;
  relationship:
    | "supplies"
    | "manufactures"
    | "connects"
    | "powers"
    | "builds"
    | "hosts"
    | "operates"
    | "buys-compute-from"
    | "trains-on"
    | "serves"
    | "owns"
    | "partners-with";
  confidence: RelationshipConfidence;
  sourceUrl?: string;
  sourceLabel?: string;
  updatedAt?: string;
}
```

Keep the actual data in a separate file, e.g.

`src/data/computeChain.ts`

or whatever structure matches the repo.

---

# 5. Relationship / dependency mode

Add a small control near the Chain title/navigation area:

DEFAULT:
[ Chain ]

Optional toggles:
[ Explore ]
[ Dependencies ]

Do not overcomplicate the nav.

Alternative:
A small "Dependencies" toggle/button inside the page.

When active:
- cards become selectable
- subtle connecting routes appear
- selected paths become bright
- unrelated cards opacity ~25–35%
- stage headers remain readable

Desktop:
horizontal dependency paths

Mobile:
do not attempt giant SVG spaghetti.
Instead:
- selecting an entity filters stages
- show relevant upstream/downstream cards
- use directional arrows between stage sections
- optionally show a compact dependency list

---

# 6. Detail panel

On entity click, show a compact side drawer or floating panel.

Suggested contents:

NAME
TICKER / PRIVATE / MODEL

One-line description

Role in chain

Tags

UPSTREAM
- selected verified dependencies

DOWNSTREAM
- selected verified customers / consumers

CATALYSTS
- optional links into the site's existing Catalysts section

NEWS
- optional links into site's existing News data if architecture allows

UPDATED
date

SOURCES
source links where available

CTA:
"Open company"
if a T2C company page already exists.

Do not build an entire research terminal inside the drawer.
Keep it fast.

---

# 7. Investor intelligence overlays

Build the architecture so these can be layered onto entities later:

- stock price
- market cap
- AI revenue exposure
- MW live
- MW under construction
- GPU count
- contracted capacity
- uncontracted capacity
- major customers
- capex
- expected online date
- lead time
- bottleneck risk

For now, implement at least one lightweight metadata presentation if this data already exists elsewhere in the T2C codebase.

REUSE EXISTING DATA WHERE POSSIBLE.

Do not duplicate market-data logic.

---

# 8. Bottleneck mode

If feasible without bloating scope, add a small visual status dot/tag per stage:

LOW
MEDIUM
HIGH

or

NORMAL
TIGHT
BOTTLENECK

Do NOT hard-code fake live values.

If no backend/data source exists yet:
- create the schema
- use `"status": "unknown"` by default
- hide unknown status from production UI

Architecture example:

```ts
type BottleneckStatus = "normal" | "tight" | "critical" | "unknown";

interface StageStatus {
  stageId: StageId;
  status: BottleneckStatus;
  reason?: string;
  updatedAt?: string;
  sourceUrl?: string;
}
```

---

# 9. Visual specification

Match existing T2C design.

## Colours
Use existing CSS variables/tokens if available.

Reference:
- background: near-black
- card: dark charcoal
- primary accent: T2C lime
- secondary accent: cyan
- tertiary accent: amber

Do not introduce random new colours.

## Cards
Company cards:
- compact
- dark
- subtle border
- ticker right aligned
- hover elevation/border only
- selected state stronger border/glow
- ticker remains subdued

Private company:
replace ticker with:
`PRIVATE`

Model/application:
small type label instead of ticker:
`MODEL`
`APP`
etc.

## Stage cards
Maintain:
- stage number
- image/hex illustration
- title
- subtitle
- entity list

But avoid making the page dramatically taller than current.

Consider:
- showing 5–7 primary entities
- "+ N more" expandable row
where a stage has many names

This will keep the horizontal chain readable.

---

# 10. Horizontal navigation / responsiveness

12 columns will not fit on a normal screen.

The page MUST therefore support intentional horizontal exploration.

Desktop:
- horizontal scroll / drag
- stage snapping if appropriate
- sticky top nav
- subtle previous/next indicators
- mouse wheel + Shift behaviour should remain natural
- trackpad horizontal scroll should work
- optional mini progress rail

Do not shrink columns until text becomes unreadable.

Minimum comfortable card width:
approximately current design.

Mobile:
- use horizontally swipeable stages OR
- stacked stage sections with sticky stage index

Prefer whichever matches the existing app architecture and performs best.

---

# 11. Search integration

The current site shows Ctrl+K.

If the command/search system is already implemented:
add chain entities to it.

Searching:
`IREN`
`Arista`
`NVIDIA`
`Claude`
etc.

should allow:
- navigate to Chain
- auto-scroll to entity
- briefly highlight it

Do not build a second search system.

---

# 12. URL state / deep linking

Support URLs such as:

`/chain?entity=iren`

or use the existing routing convention.

When loaded:
- scroll selected entity into view
- activate it
- highlight its dependencies

This makes chain entities linkable from News, Catalysts and Companies pages.

---

# 13. Accessibility

Ensure:
- keyboard-selectable entity cards
- visible focus state
- Escape closes detail drawer
- correct button semantics
- aria labels for icon-only controls
- no colour-only dependency meaning
- reduced-motion support

---

# 14. Performance

Avoid:
- huge graph libraries
- WebGL
- expensive physics layout
- excessive SVG paths rendered continuously

The chain is structured, not arbitrary.

Use:
- CSS
- normal DOM
- lightweight SVG overlays only if necessary

Memoise relationship calculations where useful.

---

# 15. Assets

Use the existing site's stage illustration style.

The provided package contains SVG placeholder/icon assets for the 3 new structural stages:
- servers-racks-networking.svg
- datacentre-owners.svg
- models-platforms.svg

If the existing site uses raster/generated hex artwork instead:
use these SVGs as composition/reference only and adapt them to match the site's existing stage visual component.

DO NOT mix a noticeably different illustration style into the existing chain.

---

# 16. Data accuracy rules

This is very important.

The chain should distinguish:
A) company belongs in this layer
from
B) company has a verified commercial relationship with another entity

Do not imply supplier/customer relationships merely because two companies appear in adjacent stages.

Relationship highlighting must come ONLY from the relationship dataset.

Every relationship should support a source URL.

If no relationship source exists:
do not draw the connection as factual.

---

# 17. First-pass relationship seeds

Only add these where they can be verified from existing repository data or trusted public sources already used by the site.

Safe structural relationships can include parent/model mapping:
- OpenAI -> GPT
- Anthropic -> Claude
- Google -> Gemini
- Meta -> Llama
- xAI -> Grok

These are parent/platform relationships, not infrastructure contracts.

For infrastructure contracts:
inspect existing T2C datasets/news/company pages before inserting.

Reuse existing verified relationships first.

---

# 18. Preserve existing functionality

Before editing:
1. inspect the repo structure
2. identify the current Chain page/component
3. identify current company/market data sources
4. identify existing card, tooltip, search and navigation components
5. identify styling tokens
6. identify current image asset conventions

Then implement using the existing system.

Do NOT:
- replace working components unnecessarily
- introduce a new state library unless already used
- change unrelated pages
- rename routes without need
- break server/client boundaries
- duplicate existing company datasets

---

# 19. Implementation sequence

Please perform the work, not just describe it.

### Step 1
Inspect the repo and report the relevant files briefly.

### Step 2
Refactor the Chain into a data-driven architecture if it is not already.

### Step 3
Implement the 12-stage chain.

### Step 4
Add the new stage assets / visuals in the existing style.

### Step 5
Implement entity selection + dependency highlighting.

### Step 6
Implement detail drawer/panel.

### Step 7
Add responsive horizontal navigation.

### Step 8
Integrate Chain entities with existing search if feasible.

### Step 9
Add deep-linking.

### Step 10
Run:
- typecheck
- lint
- tests if present
- production build

Fix all errors introduced by the change.

### Step 11
Visually inspect the resulting page at common desktop and mobile widths.

Fix:
- overflow
- clipped titles
- unreadable stage widths
- bad scroll behaviour
- excessive page height
- broken dependency overlays
- mobile interaction issues

---

# 20. Success criteria

The finished Chain should answer:

1. Where does a company sit in the AI infrastructure stack?
2. What sits upstream of it?
3. Who consumes what it provides?
4. Which parts of the stack are potential bottlenecks?
5. What companies can an investor research at each stage?
6. How does raw material eventually become an AI application?

A new visitor should understand the AI compute supply chain immediately.

An experienced investor should be able to use it to discover dependencies they want to research.

---

# 21. Final output

When done, provide:

1. files changed
2. brief explanation of architecture
3. any relationship data intentionally omitted because it could not be verified
4. build/typecheck/test result
5. any recommended next iteration

Do not leave TODO placeholders for core functionality.
Implement the strongest production-ready version possible within the existing codebase.
