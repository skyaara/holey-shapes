//! Colors chosen in OKLCH, where equal lightness looks equally bright, so every
//! seeded hue reads as one family and every extrusion darkens by the same
//! perceived amount. Results are rounded to sRGB exactly as the reference does.

use std::fmt;

use crate::js;

/// A six-digit sRGB color.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash)]
pub struct Color(pub [u8; 3]);

impl Color {
    /// Reads `#RRGGBB` in either case; `None` for anything else.
    pub fn from_hex(source: &str) -> Option<Self> {
        let digits = source.strip_prefix('#')?;
        if digits.len() != 6 || !digits.bytes().all(|byte| byte.is_ascii_hexdigit()) {
            return None;
        }
        let channel = |at: usize| u8::from_str_radix(digits.get(at..at + 2)?, 16).ok();
        Some(Self([channel(0)?, channel(2)?, channel(4)?]))
    }

    /// The color as the reference writes it, `#RRGGBB` in upper case.
    pub fn hex(self) -> String {
        let [r, g, b] = self.0;
        format!("#{r:02X}{g:02X}{b:02X}")
    }
}

impl fmt::Display for Color {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(&self.hex())
    }
}

fn to_linear(c: f64) -> f64 {
    if c <= 0.04045 {
        c / 12.92
    } else {
        ((c + 0.055) / 1.055).powf(2.4)
    }
}

fn to_gamma(c: f64) -> f64 {
    if c <= 0.0031308 {
        12.92 * c
    } else {
        1.055 * c.powf(1.0 / 2.4) - 0.055
    }
}

fn oklab_to_linear(l: f64, a: f64, b: f64) -> [f64; 3] {
    let l_ = l + 0.3963377774 * a + 0.2158037573 * b;
    let m_ = l - 0.1055613458 * a - 0.0638541728 * b;
    let s_ = l - 0.0894841775 * a - 1.291485548 * b;
    let (l3, m3, s3) = (l_ * l_ * l_, m_ * m_ * m_, s_ * s_ * s_);
    [
        4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3,
        -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3,
        -0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3,
    ]
}

fn in_gamut(rgb: [f64; 3]) -> bool {
    rgb.iter().all(|v| (-0.0001..=1.0001).contains(v))
}

fn to_color(rgb: [f64; 3]) -> Color {
    // Clamped to 0..=1 first, so the rounded channel is always 0..=255.
    Color(rgb.map(|v| js::round(to_gamma(v.clamp(0.0, 1.0)) * 255.0) as u8))
}

/// Keeps lightness and hue, and reduces chroma until the color fits in sRGB.
fn oklab_color(l: f64, a: f64, b: f64) -> Color {
    let rgb = oklab_to_linear(l, a, b);
    if in_gamut(rgb) {
        return to_color(rgb);
    }
    let (mut low, mut high) = (0.0_f64, 1.0_f64);
    for _ in 0..24 {
        let mid = (low + high) / 2.0;
        if in_gamut(oklab_to_linear(l, a * mid, b * mid)) {
            low = mid;
        } else {
            high = mid;
        }
    }
    to_color(oklab_to_linear(l, a * low, b * low))
}

/// Face color for a hue in degrees. Yellows only look clean when lighter, so
/// lightness rises around 100°.
pub fn hue_color(hue: f64) -> Color {
    let distance = (((hue - 100.0) % 360.0 + 540.0) % 360.0 - 180.0).abs();
    let lift = if distance < 60.0 {
        ((distance / 60.0) * (std::f64::consts::PI / 2.0))
            .cos()
            .powf(2.0)
    } else {
        0.0
    };
    let angle = (hue * std::f64::consts::PI) / 180.0;
    oklab_color(0.74 + 0.12 * lift, 0.19 * angle.cos(), 0.19 * angle.sin())
}

/// Extrusion color for a face: the same hue at 56% of its lightness and 70%
/// of its chroma.
pub fn extrusion_color(face: Color) -> Color {
    let [r, g, b] = face.0.map(|channel| to_linear(f64::from(channel) / 255.0));
    let l = (0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b).cbrt();
    let m = (0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b).cbrt();
    let s = (0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b).cbrt();
    let lightness = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
    let a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
    let b = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
    oklab_color(lightness * 0.56, a * 0.7, b * 0.7)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn reads_and_writes_hex() {
        assert_eq!(Color::from_hex("#12abCD"), Some(Color([0x12, 0xAB, 0xCD])));
        assert_eq!(Color([0x12, 0xAB, 0xCD]).hex(), "#12ABCD");
        for bad in ["12abcd", "#12abc", "#12abcde", "#12abcg", "#+1abcd", "#ÿÿÿ"] {
            assert_eq!(Color::from_hex(bad), None, "{bad}");
        }
    }
}
