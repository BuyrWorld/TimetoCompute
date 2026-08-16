# TimeToCompute Mission Control Design System

## Product character

Formula 1 timing screen × institutional infrastructure underwriting × restrained strategy-game feedback.

The interface must feel fast, alive and rewarding without becoming noisy, crypto-like or childish. It is designed around three information depths:

1. **Glance:** one number, one status and one sentence.
2. **Scan:** concise explanation, confidence and source summary.
3. **Investigate:** timeline, dependencies, methodology and original evidence.

## Core tokens

```css
:root {
  --t2c-bg: #050706;
  --t2c-panel: #0a0f0c;
  --t2c-panel-raised: #0e1511;
  --t2c-border: rgba(211, 255, 224, 0.15);
  --t2c-border-active: rgba(199, 255, 61, 0.72);
  --t2c-lime: #c7ff3d;
  --t2c-lime-soft: rgba(199, 255, 61, 0.14);
  --t2c-white: #f5f7f5;
  --t2c-muted: #98a29b;
  --t2c-amber: #f2b84b;
  --t2c-coral: #ff6b61;
  --t2c-radius-sm: 8px;
  --t2c-radius-md: 12px;
  --t2c-radius-lg: 16px;
  --t2c-shadow-panel: 0 18px 55px rgba(0, 0, 0, 0.34);
  --t2c-glow-hover: 0 0 0 1px rgba(199, 255, 61, 0.28), 0 0 18px rgba(199, 255, 61, 0.10);
  --t2c-glow-press: 0 0 0 1px rgba(199, 255, 61, 0.95), 0 0 14px rgba(199, 255, 61, 0.60), 0 0 38px rgba(199, 255, 61, 0.24);
}
```

## Typography

- Headings and UI labels: Archivo or the closest existing project font.
- Data, timestamps, evidence labels and compact metrics: IBM Plex Mono.
- Large metrics use tabular numerals.
- Do not use the monospaced face for long paragraphs.
- Base body size: 16px desktop, never below 14px for meaningful information.

## Layout

- Desktop content width: approximately 1600px with 28–32px outer gutters.
- Use an eight-point spacing system.
- Panels use 12–16px corner radii, subtle borders and deep black shadows.
- Limit each screen to three dominant focal regions.
- Avoid long tables on the first view; reveal detail progressively.
- Preserve scroll position when returning from a detail page.

## Motion and glow

- Hover: 160–200ms border and shadow transition.
- Press: scale to `0.985`, apply the stronger lime bloom, then return to `1` over approximately 340ms.
- Selected state: retain a subtle inner lime border, not a permanent large glow.
- Newly changed evidence may pulse once; nothing should pulse indefinitely.
- Movement is confined to the site map or a user-started replay.
- `prefers-reduced-motion: reduce` removes scaling, travelling highlights and map motion while retaining a static selected border.

## Accessibility and attention design

- One unmistakable primary action per section.
- Minimum interactive target: 44×44px.
- Every icon has a label or accessible name.
- Use `:focus-visible` with a high-contrast lime outline.
- Keyboard activation must trigger the same pressed feedback as pointer activation.
- Never rely on colour alone: pair status colours with labels and icons.
- Provide a persistent Live / Focus toggle.
- Focus mode pauses decorative motion, hides secondary metrics and leaves the investigation context intact.
- Avoid infinite scrolling on the Today page. Show a finite number of signals and an explicit caught-up state.

## Responsive behaviour

- Desktop: match the reference hierarchy closely.
- Tablet: hero and “Since last visit” stack; map remains full-width; watchlist becomes a horizontal snap row.
- Mobile: single column; compact sticky header; primary metrics first; map uses a fixed aspect ratio; all cards remain tappable.
- Do not shrink the desktop layout until text becomes unreadable.

## Avoid

- Moving stock ticker.
- Neon wash across the entire screen.
- Generic admin-dashboard grids.
- Blurry glassmorphism.
- Fake production data.
- Decorative controls that do nothing.
- Delayed navigation purely to finish an animation.
- Lime on every border; lime is reserved for progress, selection and action.

