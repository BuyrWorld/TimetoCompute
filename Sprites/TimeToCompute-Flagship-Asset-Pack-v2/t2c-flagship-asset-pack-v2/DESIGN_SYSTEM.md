# T2C Flagship Design System

## Product character

**Formula 1 timing screen × institutional infrastructure intelligence × restrained strategy-game interactivity.**

The interface should feel fast and alive, but no animation or colour may exist without information value. The user should always know what changed, why it matters, the quality of the evidence and what happens next.

## Core colours

| Token | Value | Meaning |
|---|---:|---|
| Background | `#080B0C` | Main canvas |
| Raised background | `#0D1315` | Navigation and drawers |
| Panel | `#101719` | Cards and work areas |
| Border | `#2D393E` | Standard separation |
| Text | `#F5F7F7` | Primary content |
| Muted text | `#A8B3B7` | Explanations |
| Dim text | `#708087` | Metadata |
| T2C lime | `#B7FF35` | Completion, primary actions, confirmed progress |
| Photonics cyan | `#42D9FF` | Optical/data flow, active investigation |
| Risk amber | `#FFB547` | Bottlenecks and uncertainty |
| Critical red | `#FF625F` | Confirmed critical failure only |

Lime must not mean “stock price up.” It means completion, primary action or verified progress. Cyan represents information or optical flow. Amber represents risk, bottleneck or evidence requiring attention.

## Typography

- H1: Barlow Condensed 800, `clamp(54px, 6.1vw, 104px)`, line height `.9`.
- Page title: Barlow Condensed 800, 40–64px.
- Panel title: Barlow Condensed 700, 18–24px, tracked uppercase.
- Body: Inter 400, 15–18px, line height 1.45–1.6.
- Metadata: Inter 500, 12–13px.
- Never use body text below 12px on desktop or 14px on mobile.

## Density modes

### Simple

- Plain-English summary first.
- One highlighted supply-chain route.
- Evidence count and confidence visible.
- Secondary relationships collapsed.

### Expert

- Full relationship graph.
- Dates, products, stages and evidence classifications.
- Capacity, order and recognised-revenue distinctions.
- Filters and export controls visible.

Do not create two separate products. Both modes use the same data and components.

## Components

### Supply-chain node

- Vector frame from `assets/svg/stages/`.
- Transparent 3D asset centred with `object-fit: contain`.
- Stage label below the frame.
- Commercial state beneath the label.
- Hover lifts the complete node by no more than 5px.
- Selected state increases frame glow and dims unrelated branches.

### Evidence state

- Confirmed: solid lime or cyan edge plus evidence shield.
- Ecosystem: dotted neutral edge.
- Inferred exposure: faint dashed neutral edge and explicit “UNCONFIRMED” label.
- Risk: amber edge; red only for active confirmed failure.

### Cards

- One-pixel border, 10px radius.
- Minimal elevation; use border and surface contrast rather than glass effects.
- Card title explains purpose, not only category.
- Every signal follows: What happened → Why it matters → Evidence → What next.

## Motion hierarchy

Only one high-salience animation should run above the fold at once. Preferred hierarchy:

1. Active chain pulse.
2. Newly changed node.
3. User-triggered completion.
4. Quiet operational status.

Animations stop or become static under `prefers-reduced-motion`.

## Responsive behaviour

- Desktop: full horizontal chain, right-side reaction card.
- Tablet: reaction card moves below hero copy; chain remains horizontally scrollable.
- Mobile: show a focused stage or vertical chain reaction. Do not shrink the entire desktop graph into illegibility.
- Touch targets must be at least 44×44 CSS px.
- Evidence drawers become bottom sheets on mobile.

## Research integrity

Design must never imply:

- Announcement = installed capacity.
- Qualification = volume order.
- Order = shipment.
- Shipment = customer acceptance.
- Acceptance = recognised revenue.
- Ecosystem relationship = production award.

The visual state machine is part of the product’s credibility, not decoration.
