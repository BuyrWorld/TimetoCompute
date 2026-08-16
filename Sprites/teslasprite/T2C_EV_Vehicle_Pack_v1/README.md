# T2C EV vehicle sprite pack

An unbranded white electric crossover rendered in eight directions for the Time to Compute datacentre hero animation.

## Files

- `t2c-ev-spritesheet-8-direction.png`: 1536 x 1024 RGBA sprite sheet.
- `sprites/*.png`: eight equal 384 x 512 RGBA cells for direct `<img>` use.
- `manifest.json`: direction order and sprite-sheet coordinates.

## Sprite-sheet order

The sheet is four columns by two rows:

1. North
2. North-east
3. East
4. South-east
5. South
6. South-west
7. West
8. North-west

## Recommended display scale

Start with a 64 x 85.33 CSS-pixel sprite cell when the datacentre image is displayed at approximately 1536 x 1024. The visible car will usually occupy around 25–55 pixels depending on its direction. Scale the entire sprite cell proportionally with the datacentre container.

```css
.campus-vehicle {
  width: clamp(48px, 4.17vw, 64px);
  aspect-ratio: 3 / 4;
  background-image: url('/images/vehicles/t2c-ev-spritesheet-8-direction.png');
  background-repeat: no-repeat;
  background-size: 400% 200%;
  pointer-events: none;
  will-change: transform;
}

.direction-n  { background-position: 0% 0%; }
.direction-ne { background-position: 33.333% 0%; }
.direction-e  { background-position: 66.667% 0%; }
.direction-se { background-position: 100% 0%; }
.direction-s  { background-position: 0% 100%; }
.direction-sw { background-position: 33.333% 100%; }
.direction-w  { background-position: 66.667% 100%; }
.direction-nw { background-position: 100% 100%; }
```

Use a CSS motion path or an absolutely positioned React component for movement. Change the direction class only at route turns. Keep the vehicle behind buildings when the route passes around the far side of the campus by changing its `z-index` at defined waypoints.

Respect `prefers-reduced-motion`: show one parked vehicle or disable the animation entirely.

## Usage note

The vehicle is an original, generic EV-style design and contains no manufacturer branding. The source artwork was generated for the T2C interface using the supplied vehicle and datacentre references.
