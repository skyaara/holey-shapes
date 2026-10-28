//! The hand-drawn style: a gently irregular ink outline, hand-drawn cutouts,
//! and a shadow offset by (9, 11). It reuses the same packed holes.

use std::{f64::consts::PI, fmt::Write as _};

use crate::{
    js,
    packing::Hole,
    shapes::Shape,
    svg::{opening, Resolved},
};

const INK: &str = "#25262A";

fn point(out: &mut String, (x, y): (f64, f64)) {
    let _ = write!(out, "{} {}", js::compact(x), js::compact(y));
}

/// A wobbly polyline around the outline. Straight segments keep corners crisp.
fn outline(shape: Shape, seed: i32) -> String {
    let vertices = &shape.outline().contour;
    let mut out = String::new();
    let Some(&start) = vertices.first() else {
        return out;
    };
    let phase = f64::from(seed) * 0.017;
    let wobble = |(x, y): (f64, f64)| {
        (
            x + 2.6 * (y / 23.0 + phase).sin() + 1.3 * (x / 13.0 + y / 37.0).sin(),
            y + 2.6 * (x / 27.0 - phase).sin() + 1.3 * (y / 17.0 + x / 31.0).cos(),
        )
    };
    let mut points = vec![start];
    let length = vertices.len();
    // Retain polygon corners; decimate the densely flattened curves.
    for (i, pair) in vertices.windows(2).enumerate() {
        let i = i + 1;
        let (previous, current) = (pair[0], pair[1]);
        let next = vertices[(i + 1) % length];
        let a = (current.1 - previous.1).atan2(current.0 - previous.0);
        let b = (next.1 - current.1).atan2(next.0 - current.0);
        let last = points[points.len() - 1];
        let distance = js::hypot(current.0 - last.0, current.1 - last.1);
        let turn = (b - a).sin().atan2((b - a).cos()).abs();
        if distance < 9.0 && turn < 0.3 && i < length - 1 {
            continue;
        }
        let steps = 1.0_f64.max((distance / 10.0).ceil());
        let mut step = 1.0;
        while step <= steps {
            points.push((
                last.0 + ((current.0 - last.0) * step) / steps,
                last.1 + ((current.1 - last.1) * step) / steps,
            ));
            step += 1.0;
        }
    }
    for (i, p) in points.into_iter().enumerate() {
        out.push(if i == 0 { 'M' } else { 'L' });
        point(&mut out, wobble(p));
    }
    out.push('Z');
    out
}

/// A slightly irregular closed curve inside each packed hole.
fn cutout(hole: &Hole, seed: i32, index: usize) -> String {
    let phase = f64::from(seed) * 0.013 + index as f64 * 2.4;
    let rotation = (hole.rotate * PI) / 180.0;
    let points: Vec<(f64, f64)> = (0..12)
        .map(|i| {
            let angle = (f64::from(i) * PI) / 6.0;
            // Shrink before wobbling to stay inside the original packing clearance.
            let radius =
                0.92 + 0.045 * (angle * 3.0 + phase).sin() + 0.03 * (angle * 2.0 - phase).cos();
            let x = angle.cos() * hole.rx * radius;
            let y = angle.sin() * hole.ry * radius;
            (
                hole.cx + x * rotation.cos() - y * rotation.sin(),
                hole.cy + x * rotation.sin() + y * rotation.cos(),
            )
        })
        .collect();
    let mut out = String::from("M");
    point(&mut out, points[0]);
    for i in 0..12 {
        let (previous, start) = (points[(i + 11) % 12], points[i]);
        let (end, next) = (points[(i + 1) % 12], points[(i + 2) % 12]);
        out.push('C');
        point(
            &mut out,
            (
                start.0 + (end.0 - previous.0) / 6.0,
                start.1 + (end.1 - previous.1) / 6.0,
            ),
        );
        out.push(' ');
        point(
            &mut out,
            (
                end.0 - (next.0 - start.0) / 6.0,
                end.1 - (next.1 - start.1) / 6.0,
            ),
        );
        out.push(' ');
        point(&mut out, end);
    }
    out.push('Z');
    out
}

fn mark(out: &mut String, resolved: &Resolved<'_>, d: &str, index: usize, stroke: bool) {
    let paint = if stroke {
        format!(
            r#"fill="none" stroke="{INK}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round""#
        )
    } else {
        r#"fill="black""#.to_owned()
    };
    let path = format!(r#"<path d="{d}" {paint}/>"#);
    match resolved.holes.get(index).filter(|_| resolved.animated) {
        Some(hole) => {
            let _ = write!(
                out,
                r#"<g class="doodle-cutout" style="transform-origin:{}px {}px;--doodle-delay:{}ms;--doodle-duration:{}ms">{path}</g>"#,
                js::compact(hole.cx),
                js::compact(hole.cy),
                index * 27,
                js::number(resolved.duration)
            );
        }
        None => out.push_str(&path),
    }
}

const DOODLE_ANIMATION: &str = "<style>svg:hover .doodle-cutout{animation:doodle-cutout-pulse var(--doodle-duration) ease-in-out var(--doodle-delay) both}@keyframes doodle-cutout-pulse{0%,100%{transform:scale(1)}50%{transform:scale(.75)}}@media(prefers-reduced-motion:reduce){svg:hover .doodle-cutout{animation:none}}</style>";

pub(crate) fn document(resolved: &Resolved<'_>) -> String {
    let path = outline(resolved.shape, resolved.seed);
    let cutouts: Vec<String> = resolved
        .holes
        .iter()
        .enumerate()
        .map(|(index, hole)| cutout(hole, resolved.seed, index))
        .collect();
    // The offset shadow is ink by default, or a solid silhouette in the
    // shadow color when one is given, so it reads on dark backgrounds too.
    let shadow = resolved
        .doodle_shadow
        .map_or_else(|| INK.to_owned(), |color| color.hex());
    // Turn and mirror the drawing, not its offset, so the shadow keeps its direction.
    let turned = if resolved.transform.is_empty() {
        String::new()
    } else {
        format!(r#" transform="{}""#, resolved.transform)
    };
    let mut out = String::with_capacity(4096);
    opening(&mut out, resolved);
    if resolved.animated {
        out.push_str(DOODLE_ANIMATION);
    }
    out.push_str(r#"<defs><mask id="h"><rect width="420" height="420" fill="white"/>"#);
    for (index, d) in cutouts.iter().enumerate() {
        mark(&mut out, resolved, d, index, false);
    }
    let _ = write!(
        out,
        r#"</mask></defs><g stroke="{INK}" stroke-width="7" stroke-linejoin="round" stroke-linecap="round"><g class="doodle-shadow-offset" transform="translate(9 11)"><g class="doodle-shadow"{turned}><path d="{path}" fill="{shadow}" stroke="{shadow}" mask="url(#h)"/></g></g><g class="doodle-face"{turned}><path d="{path}" fill="{}" mask="url(#h)"/><path d="{path}" fill="none"/>"#,
        resolved.color
    );
    for (index, d) in cutouts.iter().enumerate() {
        mark(&mut out, resolved, d, index, true);
    }
    out.push_str("</g></g></svg>");
    out
}
