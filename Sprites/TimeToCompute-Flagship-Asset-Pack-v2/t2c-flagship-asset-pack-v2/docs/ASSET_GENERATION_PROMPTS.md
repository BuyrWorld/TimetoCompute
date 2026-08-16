# Asset Generation Record

The detailed raster objects were created with the built-in image-generation workflow. The approved homepage mockup was supplied as a **style reference only**, not an edit target.

All generation prompts followed this shared art direction:

> High-end isometric 3D industrial product render; graphite and gunmetal materials; crisp institutional technology aesthetic; controlled cyan, lime or amber stage accents; centred isolated object; no UI, text, logos or company branding.

Nine subjects were produced independently:

1. Critical-material crystal and metallic-mineral cluster.
2. Patterned semiconductor wafer.
3. AI accelerator package with four HBM stacks.
4. Advanced optical engine with cyan emitter and ports.
5. Isometric AI datacentre campus.
6. Customer-acceptance verification object.
7. Revenue-recognition instrument.
8. Liquid-cooled AI server rack.
9. Integrated power-and-cooling module.

Each initial cutout was inspected. The first results had a baked checkerboard, so a second background-extraction pass removed it and produced genuine alpha transparency. Image metadata was then checked to confirm `srgba` channels and `opaque=false` before responsive derivatives were built.

If future assets are added, repeat the same process and do not accept a visible checkerboard as transparency.
