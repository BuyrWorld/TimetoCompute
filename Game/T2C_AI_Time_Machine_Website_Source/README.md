# T2C — The AI Time Machine

An evidence-first historical decision game for TimeToCompute. Players enter an
AI-infrastructure timeline with only information that was public at the stated
cutoff, choose one of three physical theses, lock the choice, and then reveal
what became knowable later.

## Included

- Five campaigns: AI Ignition, Memory Wall, Power Crisis, Photonics Shift, and
  Race to Revenue
- 34 finite chapters backed by the supplied campaign, event, company, and
  source-ledger data
- Five campaign artworks, six transparent infrastructure objects, the gameplay
  reference art, and the complete SVG icon sprite
- Title, campaign selection, prologue, briefing, evidence drawer, decision,
  confirmation, time jump, outcome, debrief, chapter-complete, and recap screens
- Keyboard-accessible dialogs and choices, reduced-motion support, responsive
  layouts, local progress saving, and user-triggered sound
- A fail-closed historical-price integration boundary

## Run locally

Requirements: Node.js 22.13 or newer and a Linux/macOS shell.

```bash
npm ci
npm run dev
```

Build the production bundle with:

```bash
npm run build
```

## Put it on TimeToCompute

This is a self-contained Vinext/React app. The fastest options are:

1. Deploy the project as its own app and link to it from TimeToCompute.
2. Mount the route under a subdomain such as `game.timetocompute.com`.
3. Copy `app/time-machine-game.tsx`, `app/data/`,
   `app/verified-outcomes.ts`, the game styles from `app/globals.css`, and
   `public/time-machine/` into an existing React/Next/Vinext codebase.

The game has no required backend for the educational loop. Progress is stored
locally in the browser. If account-level progress is desired later, replace the
local-storage adapter with the website's authenticated persistence layer.

## Historical market outcomes

No price value is estimated or fabricated. Until verified adjusted-close data
is supplied, each outcome says **Market result awaiting verification** while
still revealing the physical chain, later evidence, and debrief.

The only price-data integration point is:

```text
app/verified-outcomes.ts
```

Populate `VERIFIED_OUTCOMES` from TimeToCompute's licensed provider after
applying its exchange-calendar and corporate-action policy. Each record is
keyed by event ID and choice ID and contains verified entry/exit dates, prices,
return, ending value, and provenance. Do not calculate results from unlicensed
or unadjusted data in the UI.

## Content editing

- Campaign metadata: `app/data/campaigns.json`
- All chapter copy and choices: `app/data/events.json`
- Primary and later sources: `app/data/source-ledger.json`
- Company/ticker metadata: `app/data/companies.json`
- Runtime and screens: `app/time-machine-game.tsx`
- Visual system and responsive rules: `app/globals.css`
- Images and icon sprite: `public/time-machine/assets/`

## Important production notes

- Keep every knowledge cutoff immutable. Never expose sources published after a
  chapter's cutoff before the player commits.
- Open primary-source links in a new tab and retain their publisher/date labels.
- The fictional capital mechanic is educational and must remain clearly labelled
  as such; it is not investment advice.
- Preserve the fail-closed state whenever a verified outcome is missing or fails
  schema/provenance validation.
- The complete storyboard, source ledger, prompt pack, schemas, and implementation
  plan are supplied in the companion Claude Pack archive.

## Validation

```bash
npm run build
npm test
```

The production build validates the ESM Worker entry and hosting manifest.
