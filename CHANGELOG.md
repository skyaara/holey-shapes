# Changelog

## Unreleased

- Add a Rust crate, `holey-shapes`, with no dependencies. Seeding, colors, layouts and the solid and doodle SVG documents match JavaScript byte for byte, checked in CI against the shared seeding vectors and fixtures generated from the JavaScript package. One thread builds about 1,700 seeded avatars a second. The release workflow publishes it to crates.io.

## 2.1.0

- Seed far more distinct holeys from an identity. The hash now picks the shape, hole count, quarter turn, mirroring, an OKLCH hue and the layout seed from separate bits, so different names rarely share a holey. Swift and Kotlin match JavaScript exactly, checked against shared vectors in CI.
- Add `turn` and `mirror` options on every platform (Swift `mirrored`). They move the face only, so the extrusion always falls down and to the right.
- Darken default extrusions in OKLCH on every platform: the face hue at 56% of its lightness and 70% of its chroma, replacing the per-channel RGB multiply.

- Add `identityHash(id)` in JavaScript, `HoleyShapeConfiguration.identityHash(_:)` in Swift, and `HoleyShapeConfig.identityHash(id)` in Kotlin. They return the same 16-digit hex hash that seeded avatars start from.
- Doodles honor `shadowColor`: the offset shadow becomes a solid silhouette in that color, so it reads on dark backgrounds. Without it the shadow stays ink. Seeded doodles use the seeded extrusion color.
- Add JavaScript `doodle` rendering and `idPrefix` for safely embedding SVG strings. Doodles use the llmgames-online style: a wobbly ink outline that keeps corners crisp, closed irregular hole rings and a short ink shadow.
- Isolate mounted SVG definitions, preserve sibling content, and make destroyed mounts inert.
- Wrap JavaScript shuffle seeds at the supported limit.
- Remove unused playground handlers and theme storage from the published JavaScript module.
- Fall back to safe defaults for non-finite Swift and Compose rendering options.
- Replace the website with a single page for using Holey Shapes as an avatar SDK. Avatars render in Web Workers.
- Give every handle a share link at `/@handle`. Its X and Open Graph preview card shows that holey, rendered at the edge as a PNG.
- Pack layouts about 6–7x faster on every platform by rejecting optimizer moves with cheap checks first. Output is unchanged.
- Speed up JavaScript point-in-shape checks by about 25% with a flat, finer edge index. Output is unchanged.
- Make Swift and Kotlin layouts identical to JavaScript by matching its rounding and disc and capsule outlines. Swift and Kotlin layouts change slightly; regenerate persisted native layouts if exact matches matter.
- Pack SwiftUI and Compose layouts off the main thread, and draw each frame as one even-odd path instead of offscreen layers or path subtraction.
- Match the web hole animation timing on SwiftUI and Compose, stop SwiftUI redraws once the animation ends, and play the animation on tap or touch.
- Treat `null` and empty JavaScript numeric options as unset, so they use defaults.
- Stop Swift crashing when a shape has too little packing space, reject non-hex characters in `HoleyColor(hex:)`, and announce the clamped hole count on Android.

## 2.0.0

- Run the full JavaScript packing algorithm in Node and browsers without Canvas or Path2D. Identical options produce identical SVG markup in both environments.
- Generate Swift layouts without CoreGraphics through `HoleyShapes.layout`.
- Generate Kotlin layouts in a standalone JVM module through `HoleyPacking.layout`. The Compose renderer uses the same core.
- Enlarge holes while preserving equal areas and each oval's proportions. Remove silent preset-layout fallbacks and fix negative JavaScript seeds.
- Refresh the website with a shape studio, catalog, motion experiments, and loading loops.
- Add process checks and rendered samples covering every shape.

### Migration

Generated layouts have changed. Regenerate persisted SVGs if you want the new packing. The `flower` shape is removed; use `flower-star`. SwiftUI and Compose rendering APIs remain available. JVM consumers can depend on the core module without Android or Compose.

JavaScript browser and Node output is identical for the same options. Cross-language floating-point differences can still affect Swift and Kotlin layouts.
