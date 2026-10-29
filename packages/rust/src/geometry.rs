//! Geometry for the absolute SVG commands the built-in shapes use. Curves are
//! flattened within 0.01 viewBox units, well below the packing rim.

use crate::js;

/// The source path was not one this parser reads.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(crate) struct PathError;

/// A flattened outline that answers point-in-shape queries with the nonzero
/// rule, as the reference does.
#[derive(Debug, Default)]
pub(crate) struct ShapePath {
    pub(crate) contour: Vec<(f64, f64)>,
    first_band: i64,
    // Edges indexed by 1-unit vertical band: the optimizer makes millions of
    // point queries, and each one only scans the edges that can cross its row.
    offsets: Vec<usize>,
    edges: Vec<[f64; 4]>,
}

#[derive(Clone, Copy, Debug, PartialEq)]
enum Token {
    Command(u8),
    Number(f64),
}

/// The tokens the reference's `[a-zA-Z]|[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:e[-+]?\d+)?`
/// finds, skipping everything else.
fn tokens(source: &str) -> Result<Vec<Token>, PathError> {
    let bytes = source.as_bytes();
    let mut found = Vec::new();
    let mut at = 0;
    let digits = |mut at: usize| {
        while bytes.get(at).is_some_and(u8::is_ascii_digit) {
            at += 1;
        }
        at
    };
    while let Some(&byte) = bytes.get(at) {
        if byte.is_ascii_alphabetic() {
            found.push(Token::Command(byte));
            at += 1;
            continue;
        }
        let signed = usize::from(matches!(byte, b'-' | b'+'));
        let whole = digits(at + signed);
        let mut end = whole;
        if bytes.get(whole) == Some(&b'.') {
            let fraction = digits(whole + 1);
            if fraction > whole + 1 || whole > at + signed {
                end = fraction;
            }
        }
        if end == at + signed {
            at += 1;
            continue;
        }
        if bytes.get(end) == Some(&b'e') {
            let sign = usize::from(matches!(bytes.get(end + 1), Some(b'-' | b'+')));
            let exponent = digits(end + 1 + sign);
            if exponent > end + 1 + sign {
                end = exponent;
            }
        }
        let text = source.get(at..end).ok_or(PathError)?;
        found.push(Token::Number(text.parse().map_err(|_| PathError)?));
        at = end;
    }
    Ok(found)
}

struct Builder {
    edges: Vec<[f64; 4]>,
    contour: Vec<(f64, f64)>,
    x: f64,
    y: f64,
}

impl Builder {
    fn line(&mut self, nx: f64, ny: f64) {
        if self.y != ny {
            self.edges.push([self.x, self.y, nx, ny]);
        }
        self.x = nx;
        self.y = ny;
        self.contour.push((nx, ny));
    }

    fn quadratic(&mut self, from: (f64, f64), control: (f64, f64), to: (f64, f64)) {
        let ((x0, y0), (cx, cy), (x1, y1)) = (from, control, to);
        // The curve's deviation from its chord is at most half this distance.
        if js::hypot(cx - (x0 + x1) / 2.0, cy - (y0 + y1) / 2.0) <= 0.02 {
            self.line(x1, y1);
            return;
        }
        let (ax, ay) = ((x0 + cx) / 2.0, (y0 + cy) / 2.0);
        let (bx, by) = ((cx + x1) / 2.0, (cy + y1) / 2.0);
        let (mx, my) = ((ax + bx) / 2.0, (ay + by) / 2.0);
        self.quadratic((x0, y0), (ax, ay), (mx, my));
        self.quadratic((mx, my), (bx, by), (x1, y1));
    }

    #[allow(clippy::too_many_arguments)]
    fn arc(&mut self, rx: f64, ry: f64, rotation: f64, large: f64, sweep: f64, nx: f64, ny: f64) {
        let (mut rx, mut ry) = (rx.abs(), ry.abs());
        let rotation = rotation * std::f64::consts::PI / 180.0;
        if rx == 0.0 || ry == 0.0 {
            self.line(nx, ny);
            return;
        }
        if self.x == nx && self.y == ny {
            return;
        }
        let (x, y) = (self.x, self.y);
        let (c, s) = (rotation.cos(), rotation.sin());
        let (dx, dy) = ((x - nx) / 2.0, (y - ny) / 2.0);
        let (px, py) = (c * dx + s * dy, -s * dx + c * dy);
        let scale = js::hypot(px / rx, py / ry);
        if scale > 1.0 {
            rx *= scale;
            ry *= scale;
        }
        let factor = (if large == sweep { -1.0 } else { 1.0 })
            * (0.0_f64
                .max(
                    (rx * rx * ry * ry - rx * rx * py * py - ry * ry * px * px)
                        / (rx * rx * py * py + ry * ry * px * px),
                )
                .sqrt());
        let (cx, cy) = (factor * rx * py / ry, -factor * ry * px / rx);
        let center_x = c * cx - s * cy + (x + nx) / 2.0;
        let center_y = s * cx + c * cy + (y + ny) / 2.0;
        let angle = ((py - cy) / ry).atan2((px - cx) / rx);
        let mut delta = ((-py - cy) / ry).atan2((-px - cx) / rx) - angle;
        let tau = std::f64::consts::PI * 2.0;
        if sweep != 0.0 && delta < 0.0 {
            delta += tau;
        }
        if sweep == 0.0 && delta > 0.0 {
            delta -= tau;
        }
        let step_angle = 2.0 * (1.0 - 1.0_f64.min(0.01 / rx.max(ry))).acos();
        let steps = (delta.abs() / step_angle).ceil();
        let mut step = 1.0;
        while step < steps {
            let a = angle + delta * step / steps;
            self.line(
                center_x + c * rx * a.cos() - s * ry * a.sin(),
                center_y + s * rx * a.cos() + c * ry * a.sin(),
            );
            step += 1.0;
        }
        self.line(nx, ny);
    }
}

impl ShapePath {
    /// Flattens an absolute path of `M L H V Q A Z` commands.
    pub(crate) fn compile(source: &str) -> Result<Self, PathError> {
        let tokens = tokens(source)?;
        let mut builder = Builder {
            edges: Vec::new(),
            contour: Vec::new(),
            x: 0.0,
            y: 0.0,
        };
        let (mut start_x, mut start_y) = (0.0, 0.0);
        let mut command: Option<u8> = None;
        let mut at = 0;
        let number = |at: &mut usize| match tokens.get(*at) {
            Some(Token::Number(value)) => {
                *at += 1;
                Ok(*value)
            }
            _ => Err(PathError),
        };
        while let Some(token) = tokens.get(at) {
            if let Token::Command(letter) = token {
                command = Some(*letter);
                at += 1;
            }
            match command {
                Some(b'M') => {
                    builder.x = number(&mut at)?;
                    builder.y = number(&mut at)?;
                    (start_x, start_y) = (builder.x, builder.y);
                    command = Some(b'L');
                    builder.contour.push((builder.x, builder.y));
                }
                Some(b'L') => {
                    let (x, y) = (number(&mut at)?, number(&mut at)?);
                    builder.line(x, y);
                }
                Some(b'H') => {
                    let x = number(&mut at)?;
                    builder.line(x, builder.y);
                }
                Some(b'V') => {
                    let y = number(&mut at)?;
                    builder.line(builder.x, y);
                }
                Some(b'Q') => {
                    let control = (number(&mut at)?, number(&mut at)?);
                    let to = (number(&mut at)?, number(&mut at)?);
                    builder.quadratic((builder.x, builder.y), control, to);
                }
                Some(b'A') => {
                    let (rx, ry, rotation) = (number(&mut at)?, number(&mut at)?, number(&mut at)?);
                    let (large, sweep) = (number(&mut at)?, number(&mut at)?);
                    let (nx, ny) = (number(&mut at)?, number(&mut at)?);
                    builder.arc(rx, ry, rotation, large, sweep, nx, ny);
                }
                Some(b'Z') => {
                    builder.line(start_x, start_y);
                    command = None;
                }
                _ => return Err(PathError),
            }
        }
        Ok(Self::indexed(builder.edges, builder.contour))
    }

    fn indexed(edges: Vec<[f64; 4]>, contour: Vec<(f64, f64)>) -> Self {
        let (mut top, mut bottom) = (f64::INFINITY, f64::NEG_INFINITY);
        for [_, y, _, ny] in &edges {
            top = top.min(*y).min(*ny);
            bottom = bottom.max(*y).max(*ny);
        }
        if edges.is_empty() {
            return Self {
                contour,
                ..Self::default()
            };
        }
        let first_band = top.floor() as i64;
        let band_count = (bottom.floor() as i64 - first_band + 1).max(0) as usize;
        let mut bands: Vec<Vec<[f64; 4]>> = vec![Vec::new(); band_count];
        for edge in &edges {
            let [_, y, _, ny] = *edge;
            let (low, high) = (y.min(ny).floor() as i64, y.max(ny).floor() as i64);
            for band in low..=high {
                if let Some(list) = usize::try_from(band - first_band)
                    .ok()
                    .and_then(|index| bands.get_mut(index))
                {
                    list.push(*edge);
                }
            }
        }
        let mut offsets = Vec::with_capacity(band_count + 1);
        offsets.push(0);
        let mut flat = Vec::new();
        for list in bands {
            flat.extend(list);
            offsets.push(flat.len());
        }
        Self {
            contour,
            first_band,
            offsets,
            edges: flat,
        }
    }

    /// Whether a point lies inside the outline by the nonzero rule.
    pub(crate) fn contains(&self, px: f64, py: f64) -> bool {
        if !py.is_finite() {
            return false;
        }
        let Ok(band) = usize::try_from(py.floor() as i64 - self.first_band) else {
            return false;
        };
        let (Some(&start), Some(&end)) = (self.offsets.get(band), self.offsets.get(band + 1))
        else {
            return false;
        };
        let mut winding = 0i32;
        for &[x, y, nx, ny] in self.edges.get(start..end).unwrap_or_default() {
            if (y > py) == (ny > py) {
                continue;
            }
            if px < x + (py - y) * (nx - x) / (ny - y) {
                winding += if ny > y { 1 } else { -1 };
            }
        }
        winding != 0
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_square_contains_its_inside_only() -> Result<(), PathError> {
        let path = ShapePath::compile("M10 10H30V30H10Z")?;
        assert!(path.contains(20.0, 20.0));
        assert!(!path.contains(5.0, 20.0));
        assert!(!path.contains(20.0, 35.0));
        assert!(!path.contains(20.0, f64::NAN));
        Ok(())
    }

    #[test]
    fn rejects_paths_it_cannot_read() {
        assert_eq!(
            ShapePath::compile("M10 10C1 2 3 4 5 6Z").err(),
            Some(PathError)
        );
        assert_eq!(ShapePath::compile("M10Z").err(), Some(PathError));
    }

    #[test]
    fn reads_signed_decimal_and_exponent_numbers() -> Result<(), PathError> {
        let found = tokens("M-47.8 .5L1e2+3")?;
        assert_eq!(
            found,
            [
                Token::Command(b'M'),
                Token::Number(-47.8),
                Token::Number(0.5),
                Token::Command(b'L'),
                Token::Number(100.0),
                Token::Number(3.0),
            ]
        );
        Ok(())
    }
}
