# Changelog

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
