# holey-shapes

Solid, perforated shapes for the web, SwiftUI, and Jetpack Compose, with a connected extrusion and built-in hole animation. Hovering closes and reopens the holes in a seeded random order while the body stays still.

[live playground](https://holey-shapes.aakashreddy.com) · [npm package](https://www.npmjs.com/package/holey-shapes) · [source](https://github.com/skyaara/holey-shapes)

## Install

### JavaScript

```sh
npm install holey-shapes
```

### Swift Package Manager

In Xcode, add `https://github.com/skyaara/holey-shapes` as a package dependency, or add it to `Package.swift`:

```swift
dependencies: [
    .package(url: "https://github.com/skyaara/holey-shapes.git", from: "2.0.0")
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

The Swift SDK supports iOS 16+, macOS 13+, tvOS 16+, and visionOS 1+. It uses asynchronous SwiftUI `Canvas` rendering and caches the immutable shape paths, packing candidates, and finished hole layouts. Pointer hover closes and reopens individual holes, and Reduce Motion disables the effect.

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
    implementation("com.github.skyaara:holey-shapes:v2.0.0")
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

The Android SDK requires API 26 or newer and a consuming project compiled with API 35 or newer. It renders through the native Android canvas and caches geometry and packed layouts. Mouse and stylus hover close and reopen individual holes; touch-only avatars remain still. Android's animation scale applies automatically.

## Generate layouts in Swift and JVM processes

Swift packing uses Foundation and plain geometry. It needs no SwiftUI view or CoreGraphics context. The package conditionally includes its SwiftUI renderer on supported Apple platforms.

```swift
import HoleyShapes

let holes = HoleyShapes.layout(shape: .prism, count: 6, seed: 2)
// Each hole exposes cx, cy, rx, ry, and rotation.
```

The Kotlin `core` module is a standalone JVM library with no Android or Compose dependencies. The Android SDK uses this same core. For a local JVM consumer, run `./gradlew :core:publishToMavenLocal`, enable `mavenLocal()`, and add `com.github.skyaara:holey-shapes-core:2.0.0`. For JitPack, the standalone module coordinate is `com.github.skyaara.holey-shapes:holey-shapes-core:v2.0.0`.

```kotlin
import com.aakashreddy.holeyshapes.core.HoleyPacking
import com.aakashreddy.holeyshapes.core.HoleyShape

val holes = HoleyPacking.layout(HoleyShape.Prism, count = 6, seed = 2)
```

Both APIs use full equal-area packing, clamp counts to 0–8 and seeds to ±1,000,000, and cache layouts. They never substitute preset layouts. Floating-point differences between language runtimes can produce different positions; byte-identical layouts across Swift, Kotlin, and JavaScript are not guaranteed.

Run the process checks locally:

```sh
swift run --package-path tests/native/swift -c release Verify /tmp/swift-layouts.json
./gradlew :core:verifyPacking
# Independent Canvas checks require Playwright and installed Google Chrome.
node scripts/verify-native-layouts.mjs /tmp/swift-layouts.json core/build/packing-layouts.json
```

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

`createHoleySvg()` returns a complete, self-contained SVG string. The animation and extrusion are embedded in the SVG, so downloaded or copied shapes keep their hover behavior.

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

`mountHoleyShape()` returns `update()`, `shuffle()`, and `destroy()` methods. Updates replace only the mounted SVG.

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
