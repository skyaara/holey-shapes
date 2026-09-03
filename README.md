# holey-shapes

Solid, perforated shapes for the web and SwiftUI, with a connected extrusion and a built-in hover spin. Pick from 15 shapes, set the face and shadow colors, and control the hole layout.

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
    .package(url: "https://github.com/skyaara/holey-shapes.git", from: "0.1.2")
]
```

Then render any catalog shape directly in SwiftUI:

```swift
import HoleyShapes
import SwiftUI

struct Logo: View {
    var body: some View {
        HoleyShapeView(
            .flower,
            faceColor: HoleyColor(hex: "#FF4FA3"),
            shadowColor: HoleyColor(hex: "#7A1748"),
            holes: 6,
            seed: 2
        )
        .frame(width: 240, height: 240)
    }
}
```

The Swift SDK supports iOS 16+, macOS 13+, tvOS 16+, and visionOS 1+. It uses asynchronous SwiftUI `Canvas` rendering and caches the immutable shape paths, packing candidates, and finished hole layouts. The pointer hover animation follows Reduce Motion automatically.

## Render an SVG string

```js
import { createHoleySvg } from 'holey-shapes';

const svg = createHoleySvg({
  shape: 'flower',
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
| `animated` | `true` | Includes the hover spin |
| `duration` | `900` | Spin duration in milliseconds |
| `shadowX` | `18` | Horizontal extrusion offset |
| `shadowY` | `21` | Vertical extrusion offset |
| `shadowSteps` | `12` | Number of solid extrusion slices |

Available shape keys: `disc`, `round-block`, `hex`, `capsule`, `prism`, `cross`, `triangle`, `diamond`, `sunburst`, `octagon`, `chevron`, `long-bar`, `flower-star`, `flower`, and `bowtie`.

You can also build a picker from the exported metadata:

```js
import { shapeNames } from 'holey-shapes';

for (const { key, name, color } of shapeNames) {
  console.log(key, name, color);
}
```

## Browser support

The package has no runtime dependencies. Browsers with Canvas `Path2D` get the full packed-hole layout. Server-side rendering uses the built-in deterministic fallback layout.

The hover animation respects `prefers-reduced-motion`.
