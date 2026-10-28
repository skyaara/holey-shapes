//! Self-contained SVG documents, written byte for byte as the reference
//! writes them. Every interpolated value is a number, a validated color or a
//! catalog constant, so no caller text reaches the markup unescaped.

use std::fmt::Write as _;

use crate::{
    color::{extrusion_color, Color},
    doodle, js,
    packing::{layout, seeded_noise, Hole},
    shapes::Shape,
};

/// Everything that decides a holey. Defaults match the reference's.
#[derive(Clone, Debug, PartialEq)]
pub struct Options {
    pub shape: Shape,
    /// The face color; the shape's own when `None`.
    pub color: Option<Color>,
    /// The extrusion color, or for doodles the shadow color; derived from the
    /// face (solid) or ink (doodle) when `None`.
    pub shadow_color: Option<Color>,
    /// Hole count from 0 to 8; the shape's default when `None`.
    pub holes: Option<u8>,
    /// Changes the hole layout; clamped to ±1,000,000.
    pub seed: i32,
    /// Degrees, rounded to a quarter turn of the face.
    pub turn: i32,
    /// Flips the face left to right.
    pub mirror: bool,
    /// Draws the hand-drawn outline and ink shadow instead of the extrusion.
    pub doodle: bool,
    /// Includes the hover animation.
    pub animated: bool,
    /// The whole hole animation, from 100 to 10,000 ms; 0 means the default.
    pub duration_ms: u32,
    pub shadow_x: f64,
    pub shadow_y: f64,
    pub shadow_steps: u8,
    /// Unique per document inserted beside others, so masks and filters
    /// cannot collide.
    pub id_prefix: Option<String>,
}

const SHADOW_X: f64 = 18.0;
const SHADOW_Y: f64 = 21.0;
const SHADOW_STEPS: u8 = 12;
const DURATION_MS: u32 = 900;

impl Default for Options {
    fn default() -> Self {
        Self {
            shape: Shape::Disc,
            color: None,
            shadow_color: None,
            holes: None,
            seed: 0,
            turn: 0,
            mirror: false,
            doodle: false,
            animated: true,
            duration_ms: DURATION_MS,
            shadow_x: SHADOW_X,
            shadow_y: SHADOW_Y,
            shadow_steps: SHADOW_STEPS,
            id_prefix: None,
        }
    }
}

/// What the renderers draw, with every option resolved and clamped.
pub(crate) struct Resolved<'a> {
    pub(crate) shape: Shape,
    pub(crate) color: Color,
    pub(crate) holes: &'a [Hole],
    pub(crate) seed: i32,
    pub(crate) transform: String,
    pub(crate) animated: bool,
    pub(crate) duration: f64,
    /// Only a doodle given a shadow color draws in it; others use ink.
    pub(crate) doodle_shadow: Option<Color>,
    shadow_color: Color,
    shadow_x: f64,
    shadow_y: f64,
    shadow_steps: u8,
}

fn finite_in(value: f64, fallback: f64, min: f64, max: f64) -> f64 {
    if value.is_finite() {
        value.clamp(min, max)
    } else {
        fallback
    }
}

/// Quarter turns and mirroring apply to the face only. The extrusion is drawn
/// around it in unturned space, so every holey's depth points the same way.
fn orientation(turn: i32, mirror: bool) -> String {
    let mut parts = Vec::new();
    if turn != 0 {
        parts.push(format!("rotate({turn} 210 210)"));
    }
    if mirror {
        parts.push("translate(420 0) scale(-1 1)".to_owned());
    }
    parts.join(" ")
}

fn hole_markup(out: &mut String, hole: &Hole) {
    let (cx, cy) = (js::number(hole.cx), js::number(hole.cy));
    let _ = write!(
        out,
        r#"<ellipse cx="{cx}" cy="{cy}" rx="{}" ry="{}""#,
        js::number(hole.rx),
        js::number(hole.ry)
    );
    if hole.rotate != 0.0 {
        let _ = write!(
            out,
            r#" transform="rotate({} {cx} {cy})""#,
            js::number(hole.rotate)
        );
    }
    out.push_str("/>");
}

fn hover_hole_markup(out: &mut String, hole: &Hole, index: usize, seed: i32, duration: f64) {
    let position = index as f64 + 1.0;
    let seed = f64::from(seed);
    let pulse = js::round(duration * (0.42 + seeded_noise(position, 17.0, seed) * 0.16));
    let delay = js::round(duration * (0.04 + seeded_noise(position, 43.0, seed) * 0.34));
    let _ = write!(
        out,
        r#"<g class="hole-hover" style="--hole-duration:{}ms;--hole-delay:{}ms">"#,
        js::number(pulse),
        js::number(delay)
    );
    hole_markup(out, hole);
    out.push_str("</g>");
}

fn extrusion_filter(out: &mut String, resolved: &Resolved<'_>) {
    let steps = resolved.shadow_steps;
    let _ = write!(
        out,
        r#"<filter id="e" x="-20%" y="-20%" width="160%" height="160%" color-interpolation-filters="sRGB"><feFlood flood-color="{}" result="p"/><feComposite in="p" in2="SourceGraphic" operator="in" result="s"/>"#,
        resolved.shadow_color
    );
    for step in 1..=steps {
        let ratio = f64::from(step) / f64::from(steps);
        let _ = write!(
            out,
            r#"<feOffset in="s" dx="{}" dy="{}" result="s{step}"/>"#,
            js::compact(resolved.shadow_x * ratio),
            js::compact(resolved.shadow_y * ratio)
        );
    }
    out.push_str("<feMerge>");
    for step in (1..=steps).rev() {
        let _ = write!(out, r#"<feMergeNode in="s{step}"/>"#);
    }
    out.push_str(r#"<feMergeNode in="SourceGraphic"/></feMerge></filter>"#);
}

const SOLID_ANIMATION: &str = "<style>.hole-hover{transform-box:fill-box;transform-origin:center;will-change:transform}svg:hover .hole-hover{animation:hole-open-close var(--hole-duration) cubic-bezier(.33,0,.2,1) var(--hole-delay) both}@keyframes hole-open-close{0%,100%{transform:scale(1)}50%{transform:scale(.06)}}@media(prefers-reduced-motion:reduce){svg:hover .hole-hover{animation:none}}</style>";

pub(crate) fn opening(out: &mut String, resolved: &Resolved<'_>) {
    let _ = write!(
        out,
        r#"<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 420" role="img" aria-label="{} with {} holes">"#,
        resolved.shape.name(),
        resolved.holes.len()
    );
}

fn solid(resolved: &Resolved<'_>) -> String {
    let mut out = String::with_capacity(2048);
    opening(&mut out, resolved);
    if resolved.animated {
        out.push_str(SOLID_ANIMATION);
    }
    out.push_str(r#"<defs><mask id="h"><rect width="420" height="420" fill="white"/>"#);
    for (index, hole) in resolved.holes.iter().enumerate() {
        if resolved.animated {
            hover_hole_markup(&mut out, hole, index, resolved.seed, resolved.duration);
        } else {
            hole_markup(&mut out, hole);
        }
    }
    out.push_str("</mask>");
    extrusion_filter(&mut out, resolved);
    out.push_str(r#"</defs><g filter="url(#e)"><path"#);
    if !resolved.transform.is_empty() {
        let _ = write!(out, r#" transform="{}""#, resolved.transform);
    }
    let _ = write!(
        out,
        r#" d="{}" fill="{}" mask="url(#h)"/></g></svg>"#,
        resolved.shape.data().path,
        resolved.color
    );
    out
}

/// Gives a document's ids a prefix, encoding each code point so prefixes
/// that differ only in punctuation still differ.
fn scoped(source: String, prefix: Option<&str>) -> String {
    let Some(prefix) = prefix else {
        return source;
    };
    let encoded: Vec<String> = prefix
        .chars()
        .map(|c| format!("{:x}", u32::from(c)))
        .collect();
    let id = if encoded.is_empty() {
        "holey-empty".to_owned()
    } else {
        format!("holey-{}", encoded.join("-"))
    };
    source
        .replace(r#"id="h""#, &format!(r#"id="{id}-h""#))
        .replace("url(#h)", &format!("url(#{id}-h)"))
        .replace(r#"id="e""#, &format!(r#"id="{id}-e""#))
        .replace("url(#e)", &format!("url(#{id}-e)"))
}

/// A complete, self-contained SVG document; identical options give
/// identical markup.
pub fn create_holey_svg(options: &Options) -> String {
    let shape = options.shape;
    let color = options.color.unwrap_or_else(|| shape.color());
    let count = options.holes.unwrap_or(shape.data().initial);
    let seed = options.seed.clamp(-1_000_000, 1_000_000);
    let turn = js::round(f64::from(options.turn.clamp(-36_000, 36_000)) / 90.0) as i32;
    let holes = layout(shape, count, seed);
    let duration = if options.duration_ms == 0 {
        DURATION_MS
    } else {
        options.duration_ms.clamp(100, 10_000)
    };
    let resolved = Resolved {
        shape,
        color,
        holes: &holes,
        seed,
        transform: orientation(turn.rem_euclid(4) * 90, options.mirror),
        animated: options.animated,
        duration: f64::from(duration),
        doodle_shadow: options.shadow_color,
        shadow_color: options
            .shadow_color
            .unwrap_or_else(|| extrusion_color(color)),
        shadow_x: finite_in(options.shadow_x, SHADOW_X, -80.0, 80.0),
        shadow_y: finite_in(options.shadow_y, SHADOW_Y, -80.0, 80.0),
        shadow_steps: options.shadow_steps.clamp(1, 32),
    };
    let document = if options.doodle {
        doodle::document(&resolved)
    } else {
        solid(&resolved)
    };
    scoped(document, options.id_prefix.as_deref())
}
