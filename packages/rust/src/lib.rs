//! Avatars with holes cut into them: the Rust package of
//! [holey-shapes](https://github.com/skyaara/holey-shapes).
//!
//! A name is hashed to pick one of fourteen shapes, a hole count, a quarter
//! turn, mirroring, a hue and a layout seed; equal-sized holes are packed into
//! the shape, then cut out and extruded into a plain SVG string. Layouts,
//! seeding and documents match the JavaScript package byte for byte, which
//! the tests check against its own output.
//!
//! ```
//! let svg = holey_shapes::create_holey_svg(&holey_shapes::seeded_options("relay-agent"));
//! assert!(svg.starts_with("<svg"));
//! ```

#![forbid(unsafe_code)]

mod color;
mod doodle;
mod geometry;
mod js;
mod packing;
mod seeding;
mod shapes;
mod svg;

pub use color::{extrusion_color, hue_color, Color};
pub use packing::{layout, Hole};
pub use seeding::{identity_hash, seeded_options};
pub use shapes::Shape;
pub use svg::{create_holey_svg, Options};

/// The most holes any shape takes.
pub const MAX_HOLES: u8 = 8;

// Compiles and runs the README's examples, so they cannot drift from the API.
#[cfg(doctest)]
#[doc = include_str!("../README.md")]
struct ReadmeExamples;
