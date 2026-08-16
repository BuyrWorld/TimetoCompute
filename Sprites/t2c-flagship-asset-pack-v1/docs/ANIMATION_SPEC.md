# Animation Specification

## Principles

- Motion explains direction, change or completion.
- No more than one continuous high-salience animation above the fold.
- Pausing Live mode pauses non-essential loops.
- Focus mode removes all ambient motion except the selected path.
- Reduced motion removes travel and breathing, retaining colour/state changes.

## Timings

| Interaction | Duration | Easing |
|---|---:|---|
| Hover/focus response | 140ms | `cubic-bezier(.2,.8,.2,1)` |
| Drawer/card transition | 240ms | `cubic-bezier(.2,.8,.2,1)` |
| Graph path selection | 320ms | `cubic-bezier(.2,.8,.2,1)` |
| New-signal entry | 380ms | `cubic-bezier(.2,.8,.2,1)` |
| Completion ring | 900ms | `cubic-bezier(.2,.8,.2,1)` |
| Ambient chain travel | 5.4s loop | linear |
| Optical pulse | 2.8s loop | linear |

## Implementation

- Animate SVG transforms, opacity and stroke dash offsets.
- Do not animate width, height, top or left.
- Never animate the raster PNG itself beyond a subtle wrapper transform or filter.
- Use `requestAnimationFrame` only when the graph library requires it.
- Pause animations in background tabs through the Page Visibility API if a graph engine is used.
- Under reduced motion, selected paths appear immediately and static dots show direction.

## Live and Focus modes

- **Live:** selected data flow can travel; new nodes pulse once; operational dots remain quiet.
- **Focus:** unrelated nodes dim to 25–35% opacity; active route is static or moves once after selection.
- Store the user’s mode preference locally.
