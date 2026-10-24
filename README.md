# holey-shapes

Solid, perforated shapes for the web, SwiftUI, and Jetpack Compose, with a connected extrusion and built-in hole animation. Hovering closes and reopens the holes in a seeded random order while the body stays still.

[website](https://holey-shapes.aakashreddy.com) · [npm package](https://www.npmjs.com/package/holey-shapes) · [source](https://github.com/skyaara/holey-shapes)

## Install

### JavaScript

```sh
npm install holey-shapes
```

### Swift Package Manager

In Xcode, add `https://github.com/skyaara/holey-shapes` as a package dependency, or add it to `Package.swift`:

```swift
dependencies: [
    .package(url: "https://github.com/skyaara/holey-shapes.git", from: "2.1.0")
]
```

Then render any catalog shape directly in SwiftUI:

```swift
import HoleyShapes
import SwiftUI

struct Logo: View {
    var body: some View {
        HoleyShapeView(
            .prism,
            faceColor: HoleyColor(hex: "#FF4FA3"),
            shadowColor: HoleyColor(hex: "#7A1748"),
            holes: 6,
            seed: 2
        )
        .frame(width: 240, height: 240)
    }
}
```

The Swift SDK supports iOS 16+, macOS 13+, tvOS 16+, and visionOS 1+. It packs new layouts off the main thread, draws each frame as a single even-odd path, and caches shape paths, packing candidates, and finished hole layouts. Pointer hover or a tap closes and reopens individual holes with the same timing as the web package, and Reduce Motion disables the effect.

### Android

Add JitPack to dependency resolution in `settings.gradle.kts`:

```kotlin
dependencyResolutionManagement {
    repositories {
        google()
        mavenCentral()
        maven("https://jitpack.io")
    }
}
```

Then add the Compose SDK:

```kotlin
dependencies {
    implementation("com.github.skyaara:holey-shapes:v2.1.0")
}
```

Use the composable directly or derive a stable shape from an ID:

```kotlin
import com.aakashreddy.holeyshapes.HoleyShapeConfig
import com.aakashreddy.holeyshapes.HoleyShapeView

HoleyShapeView(
    config = HoleyShapeConfig.seeded(user.id),
    modifier = Modifier.size(64.dp),
    contentDescription = null,
)
```

The Android SDK requires API 26 or newer and a consuming project compiled with API 35 or newer. It renders through the native Android canvas and caches geometry and packed layouts. It packs new layouts off the main thread and draws each frame as a single even-odd path. Mouse hover or a touch press closes and reopens individual holes with the same timing as the web package. Android's animation scale applies automatically.

## Generate layouts in Swift and JVM processes

Swift packing uses Foundation and plain geometry. It needs no SwiftUI view or CoreGraphics context. The package conditionally includes its SwiftUI renderer on supported Apple platforms.

```swift
import HoleyShapes

let holes = HoleyShapes.layout(shape: .prism, count: 6, seed: 2)
// Each hole exposes cx, cy, rx, ry, and rotation.
```

The Kotlin `core` module is a standalone JVM library with no Android or Compose dependencies. The Android SDK uses this same core. For a local JVM consumer, run `cd packages/android && ./gradlew :core:publishToMavenLocal`, enable `mavenLocal()`, and add `com.github.skyaara:holey-shapes-core:2.1.0`. For JitPack, the standalone module coordinate is `com.github.skyaara.holey-shapes:holey-shapes-core:v2.1.0`.

```kotlin
import com.aakashreddy.holeyshapes.core.HoleyPacking
import com.aakashreddy.holeyshapes.core.HoleyShape

val holes = HoleyPacking.layout(HoleyShape.Prism, count = 6, seed = 2)
```

Both APIs use full equal-area packing, clamp counts to 0–8 and seeds to ±1,000,000, and cache layouts. They never substitute preset layouts. Swift, Kotlin, and JavaScript produce the same layouts for the same shape, count, and seed; the process checks compare all three across 630 combinations.

Run the process checks locally:

```sh
swift run --package-path packages/swift/Verification -c release Verify /tmp/swift-layouts.json
(cd packages/android && ./gradlew :core:verifyPacking)
# Independent Canvas checks require Playwright and installed Google Chrome.
node scripts/verify-native-layouts.mjs /tmp/swift-layouts.json packages/android/core/build/packing-layouts.json
```

To regenerate the ignored native comparison gallery, run `node scripts/create-native-samples.mjs`. The Canvas checks and gallery rendering need Google Chrome and a resolvable Playwright module; `PLAYWRIGHT_MODULE` can point to an existing installation.

## Render an SVG string

```js
import { createHoleySvg } from 'holey-shapes';

const svg = createHoleySvg({
  shape: 'prism',
  color: '#FF4FA3',
  shadowColor: '#7A1748',
  holes: 6,
  seed: 2
});

document.querySelector('#shape').innerHTML = svg;
```

`createHoleySvg()` returns a complete, self-contained SVG string. The animation and extrusion are embedded in the SVG, so downloaded or copied shapes keep their hover behavior. When inserting several SVG strings into one document, pass a different `idPrefix` for each instance (for example, `idPrefix: 'avatar-42'`) so masks and filters cannot collide. Identical options, including the prefix, produce identical markup.

### Avatars from an ID

`seededHoleyOptions(id)` picks a shape and seed from any string, so the same user always gets the same avatar. It starts from `identityHash(id)`, a 64-bit FNV-1a hash of the ID's UTF-8 bytes returned as 16 lowercase hex digits. Swift (`HoleyShapeConfiguration.identityHash`) and Kotlin (`HoleyShapeConfig.identityHash`) return the same hash, and their `seeded` functions return the same shape and seed.

```js
import { createHoleySvg, identityHash, seededHoleyOptions } from 'holey-shapes';

identityHash('relay-agent');       // '0cc0c8aa3dbd893e'
seededHoleyOptions('relay-agent'); // { shape: 'triangle', seed: 168748, animated: true }

avatar.innerHTML = createHoleySvg({ ...seededHoleyOptions('relay-agent'), doodle: true });
```

### Doodle renderer example (JavaScript)

```js
const svg = createHoleySvg({
  shape: 'flower-star',
  color: '#F786A8',
  doodle: true,
  idPrefix: 'my-doodle'
});
```

The doodle renderer adds a gently irregular ink outline, hand-drawn cutouts, and a fixed ink shadow offset of `(9, 11)`. Its holes pulse subtly on hover. `shadowColor`, `shadowX`, `shadowY`, and `shadowSteps` apply only to the solid style. Doodle rendering is currently available in the JavaScript SDK; the native SDKs retain their solid renderer.

## Share links

Every handle has a page on the website: `https://holey-shapes.aakashreddy.com/@yourname`. Handles are case-insensitive and the `@` is optional. When the link is posted on X or another site, its preview card shows that holey, served as a PNG from `/og/@yourname.png`.

## Mount and update a shape

```js
import { mountHoleyShape } from 'holey-shapes';

const shape = mountHoleyShape('#shape', {
  shape: 'disc',
  color: '#6337FF',
  holes: 5
});

shape.update({ color: '#00D7B9', holes: 8 });
shape.shuffle();
```

`mountHoleyShape()` returns `update()`, `shuffle()`, and `destroy()` methods. It assigns isolated SVG IDs automatically and preserves other children in the target. Updates replace only the mounted SVG. `destroy()` removes that SVG and makes later calls no-ops; create a new mount to render again. Shuffling wraps at the supported seed boundary.

The generated SVG scales to its container:

```css
#shape {
  width: 320px;
}

#shape svg {
  display: block;
  width: 100%;
  height: auto;
}
```

## Options

| Option | Default | Description |
| --- | --- | --- |
| `shape` | `disc` | One of the keys in `shapeNames` |
| `doodle` | `false` | Hand-drawn outline and fixed ink shadow (JavaScript only) |
| `idPrefix` | Unprefixed | Unique per inline SVG string; mounts manage this automatically |
| `color` | Shape color | Six-digit hex face color |
| `shadowColor` | Darker face color | Six-digit hex extrusion color |
| `holes` | Shape default | Hole count from 0 to 8 |
| `seed` | `0` | Changes the hole layout |
| `animated` | `true` | Includes the hover hole animation |
| `duration` | `900` | Total hole-animation duration in milliseconds |
| `shadowX` | `18` | Horizontal extrusion offset |
| `shadowY` | `21` | Vertical extrusion offset |
| `shadowSteps` | `12` | Number of solid extrusion slices |

Available shape keys: `disc`, `round-block`, `hex`, `capsule`, `prism`, `cross`, `triangle`, `diamond`, `sunburst`, `octagon`, `chevron`, `long-bar`, `flower-star`, and `bowtie`.

You can also build a picker from the exported metadata:

```js
import { shapeNames } from 'holey-shapes';

for (const { key, name, color } of shapeNames) {
  console.log(key, name, color);
}
```

## Browser support

The package has no runtime dependencies. Node processes, server-side rendering, and browsers use the same JavaScript geometry and full hole-packing algorithm. SVG generation needs no DOM, Canvas, or `Path2D`; identical options produce identical SVG markup. Only `mountHoleyShape` and interactive animation require a browser.

The hover animation respects `prefers-reduced-motion`.

## Local checks

Run `npm test` in `packages/js` for the Node API and packing checks. Run `npm ci` and `npm run build` in `web` for the website. With `npm run dev` running from `web`, open `/tests/browser.html` for DOM mounting and lifecycle regression checks. The browser harness is excluded from production builds and the npm package.

## Repository layout

| Path | Purpose |
| --- | --- |
| `packages/js/` | Published JavaScript package, types, and Node tests |
| `packages/swift/` | Swift sources and verification package |
| `packages/android/` | Android and standalone Kotlin/JVM packages with Gradle wrapper |
| `web/` | Website, share-link Pages Functions, public assets, and browser tests |
| `scripts/` | Cross-platform native sample verification |

The root `Package.swift` keeps the existing Swift Package Manager Git URL working and points to `packages/swift/`. The root `jitpack.yml` builds `packages/android/`. Run `npm run dev` from `web` to work on the website. Native verification images in `artifacts/` are generated locally and are not tracked.

Contributions are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for setup, checks, and the package boundaries. The project is licensed under [MIT](LICENSE).

## Extending the renderer

Pass `doodle: true` for the hand-drawn renderer in [`packages/js/doodle.js`](packages/js/doodle.js). It reuses the same packed holes.
