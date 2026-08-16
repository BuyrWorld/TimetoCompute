# Component and Interaction Specification

## 1. Global header

- Maximum width container; no horizontal page overflow.
- Desktop labels: Today, Companies, Megaprojects, Catalysts, Explainers.
- Search remains available with existing `Ctrl/Cmd+K` behavior.
- Watchlist is a visible outcome-led action.
- At narrow widths, collapse destinations into an accessible disclosure menu; keep search and watchlist reachable.
- Do not use “Live” as the label for the full interface mode. Use Standard/Focus if the current feature remains.

## 2. LeadStoryHero

### Inputs

- latest eligible high-confidence signal
- affected company/project/customer
- plain-English title and consequence
- current verified gate and all relevant prior gates
- source confidence/type/URL
- up to three watched items

### Behavior

- Image is illustrative and darkened with CSS overlays.
- Headline remains HTML, never part of the bitmap.
- “Why this matters” opens a side drawer on desktop and bottom sheet on mobile.
- “View the evidence” opens the existing primary source or source record safely.
- Stage rail exposes the simple label, detailed label, status and evidence.
- If no eligible signal exists, show the latest dated verified change without manufacturing urgency.

## 3. InvestorWatchPanel

- Maximum three rows.
- Each row has title, state and one next action.
- Prefer future dated/guided items and unresolved commercial gates.
- Never infer a date from the visual design.

## 4. BuildoutTodayGrid

Desktop: four cards in a 12-column grid. Mobile: vertical cards with a clear reading order.

- DeliveryLeaders: three rows by default; “See all” expands or links.
- NextCatalyst: one event, exact/guided/unknown certainty visibly distinct.
- PromiseReality: compatible presentation with bases and caveat.
- AudienceLens: three tabs; no additional data fetch required unless already supported.

## 5. MegaprojectCard

- Image, operator, customer if disclosed, current stage, next gate and evidence state.
- Whole card may be clickable only if nested controls are avoided.
- Use generated image based on stage category, not as claimed site photography.
- Always include the illustrative disclosure in accessible supporting text.

## 6. ExplainerPreview

- Uses the supplied cutaway.
- Plays only after explicit user action.
- Prefer an accessible stepper or short scrollytelling sequence over autoplay video.
- Current step is announced to assistive technology.
- Reduced-motion users receive immediate state changes without animated travel paths.

## 7. ReturningUserSummary

- Reuse existing review/checkpoint behavior.
- Show finite progress and a terminal caught-up state.
- Watchlist/review data remains browser-local until a real account system exists; label that honestly.

## Motion language

Use motion only when it conveys state:

- evidence confirmed: one restrained lime pulse
- stage moved: marker moves between two adjacent stages
- card opened: 160–260 ms elevation/expand
- caught up: a single completion sweep

Do not use continuous ambient animations, counters with invented velocity, autoplay, streaks or random vehicles.

## Responsive behavior

### ≥1200 px

- Hero copy occupies roughly 40%; campus remains visible across the remaining canvas.
- Investor-watch panel can overlay the right side.

### 760–1199 px

- Hero copy over a stronger bottom/left gradient.
- Investor-watch panel moves below the lead story.
- Buildout cards become 2 × 2.

### <760 px

- Hero image uses 4:5/1:1 crop behavior but retains the same source asset.
- Copy sits below or on a solid gradient base, never over a visually busy area.
- One primary CTA; evidence CTA becomes a text link.
- Cards stack; tables use card/key-value presentation.
- No horizontal scrolling except explicitly labelled secondary research tables.

## Accessibility

- One H1.
- Every illustration disclosure remains available to screen readers.
- Stage completion is not expressed by color alone.
- All drawers/sheets trap and restore focus correctly.
- Minimum interactive target: 44 × 44 CSS pixels.
- Body text should not render below 16 px; metadata should not render below 12 px.
- Support 200% zoom and `prefers-reduced-motion`.
