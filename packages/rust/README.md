# holey-shapes

**Avatars with holes.** Turn any name into a colorful, one-of-a-kind shape with holes punched in it. The same name always gives the same shape, and this crate draws exactly the SVG that the [JavaScript, Swift and Kotlin packages](https://github.com/skyaara/holey-shapes) draw.

- **No dependencies** and no `unsafe`. The output is a plain SVG string, so it runs on servers, in CLIs and in native apps.
- **Identical everywhere.** Seeding, colors, hole layouts and whole documents match the JavaScript package byte for byte, checked in CI against its own output.
- **Fast.** One thread builds about 1,700 seeded avatars a second on an Apple M4, about 4.5× the JavaScript package on the same machine.

[Try it on the website →](https://holey-shapes.aakashreddy.com)

## Install

```toml
[dependencies]
holey-shapes = "2.1.0"
```

## Avatars from an ID

```rust
use holey_shapes::{create_holey_svg, seeded_options};

let svg = create_holey_svg(&seeded_options("ada"));
assert!(svg.starts_with("<svg"));
```

`seeded_options(id)` hashes the ID's UTF-8 bytes with 64-bit FNV-1a (`identity_hash(id)` returns it as hex) and picks the shape, hole count, quarter turn, mirroring, an OKLCH hue and the layout seed, each from its own bits.

## Pick your own

```rust
use holey_shapes::{create_holey_svg, Color, Options, Shape};

let svg = create_holey_svg(&Options {
    shape: Shape::FlowerStar,
    color: Color::from_hex("#FF7A59"),
    holes: Some(5),
    doodle: true,
    id_prefix: Some("avatar-42".into()),
    ..Options::default()
});
```

Every option matches the JavaScript one: `shape`, `color`, `shadow_color`, `holes` (0–8), `seed`, `turn`, `mirror`, `doodle`, `animated`, `duration_ms`, `shadow_x`, `shadow_y`, `shadow_steps` and `id_prefix`. Pass a different `id_prefix` for each SVG inserted into one document so their masks and filters cannot collide. Set `animated: false` for renderers without CSS animation, such as rasterizers.

## Layouts only

```rust
use holey_shapes::{layout, Shape};

let holes = layout(Shape::Prism, 6, 2);
// Each hole has cx, cy, rx, ry and rotate (degrees) in the 420-unit viewBox.
```

Packing is deterministic and does not cache. Cache layouts or documents yourself if you draw the same ones repeatedly.

## License

MIT
