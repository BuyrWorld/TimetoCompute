# Motion and interaction specification v2

Motion communicates data movement, selection, freshness and completion. It must not create a permanently animated dashboard.

## Durations

- Press: 90–120ms.
- Hover/focus transition: 140–180ms.
- Drawer/card expansion: 220–280ms.
- Selected-path reveal: 400–650ms.
- Chain-reaction playback: 1.8–3.2s for the complete path.
- Ambient optical pulse: 5–8s and only one principal pulse at a time.

## Homepage

- Hover/focus: frame brightens, image lifts 2px, description and CTA become prominent.
- Selection: one pulse travels to the selected node; unrelated nodes remain readable.
- No continuous bobbing of seven objects.
- Completion ring animates only when review progress changes.

## Explainers

- How-it-works steps reveal sequentially on explicit Play action.
- Glossary trigger opens a popover on click/tap and is keyboard reachable.
- Supplier quote freshness dot pulses only for a genuinely live quote.
- Asset cards do not spin or float.

## AI News

- Mark Reviewed causes a short check sweep and increments finite progress.
- Opening a signal may animate the affected-stage path once.
- New-since-last-visit indicators pulse twice, then stop.
- No ticker-tape auto-scroll.

## Financials

- KPI values count only after real data resolves and never on every revisit.
- Waterfall and balance bars draw once when entering the viewport.
- Compare-period changes crossfade; avoid layout jumps.
- Market price animation follows quote state and respects stale/unavailable status.

## Reduced motion

Under `prefers-reduced-motion: reduce`:

- disable pulses, path travel, counting and parallax;
- set transition duration to near zero;
- preserve state through colour, border, icon and text;
- never hide content that would otherwise arrive through animation.

Use `assets/animated/t2c-v2-motion.css` as the baseline or port the same behaviour into the repository's existing motion library.

