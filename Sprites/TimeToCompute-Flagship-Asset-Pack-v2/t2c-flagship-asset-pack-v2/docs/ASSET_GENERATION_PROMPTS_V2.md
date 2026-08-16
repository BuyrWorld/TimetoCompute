# Raster-generation record

Mode: built-in image generation, followed by alpha validation and deterministic background cleanup where the generator returned a baked checkerboard.

Style references:

- `assets/raster/stage-photonics-master-1254.png`
- `assets/raster/stage-wafer-master-1536x1024.png`
- `assets/raster/stage-chips-hbm-master-1254.png`
- approved page mockups in `reference-mockups/v2/`

## Shared cutout constraints

All six Photonics prompts required:

- one technically distinct object;
- premium dark graphite/metal/ceramic 3D rendering;
- restrained cyan optical light and selective warm metal highlights;
- square canvas;
- visual-mass centring with equal safe padding;
- no text, logo, hexagon, watermark or environment;
- real transparent alpha;
- clarity at 96px and detail at 1024px.

## Subject prompts

### InP substrate

One circular indium-phosphide wafer with champagne/amber iridescence, fine die grid and realistic polished compound-semiconductor surface.

### CW laser

One compact continuous-wave semiconductor laser package on a ceramic submount, with gold contacts and one cyan emission point.

### EML

One elongated electro-absorption modulated laser module with a visible photonic die, contacts and a small output facet; visibly different from a CPU and the CW laser.

### 1.6T transceiver

One graphite-metal pluggable optical transceiver with heat fins, rear gold edge connector and two cyan optical ports.

### CPO

One integrated co-packaged-optics assembly with a large central switch ASIC, four surrounding optical engines and short cyan paths to fibre connectors.

### Optical fibre

One graphite spool of fine glass optical fibre with two data-centre connectors and a restrained cyan light pulse.

## AI News image

Wide 16:9 macro view of dense glass optical fibres converging into precise dark-metal network transceiver ports, cyan-white data pulses and restrained lime status lights. No text, people, logos, fantasy city or generic tunnel.

## Alpha validation

Masters in `assets/raster/photonics/` must report an alpha channel and a transparent corner pixel. Run the supplied validation script before copying assets into production.

