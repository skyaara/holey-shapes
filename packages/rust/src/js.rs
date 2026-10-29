//! The few JavaScript number semantics the reference package's output depends
//! on, so every layout and document matches it exactly.

/// `Math.round`: the nearest integer, with halves rounded up.
pub(crate) fn round(value: f64) -> f64 {
    let floor = value.floor();
    // Exact for every finite value: both share the binade near `value`.
    if value - floor >= 0.5 {
        floor + 1.0
    } else {
        floor
    }
}

/// `Number(value.toFixed(3))`, which rounds the exact binary value with
/// halves away from zero; Rust's formatter rounds exact halves to even.
pub(crate) fn fixed3(value: f64) -> f64 {
    if !value.is_finite() {
        return value;
    }
    // A finite binary fraction ends in 5 at the fourth decimal only when it
    // is an odd number of sixteenths, so only those are true halves.
    let sixteenths = value * 16.0;
    if sixteenths.fract() == 0.0 && sixteenths.abs() < 9.0e15 && (sixteenths as i64) % 2 != 0 {
        return (value.abs() * 1000.0).ceil().copysign(value) / 1000.0;
    }
    format!("{value:.3}").parse().unwrap_or(value)
}

/// `String(value)` for the finite, moderate values the documents contain.
pub(crate) fn number(value: f64) -> String {
    if value == 0.0 {
        // JavaScript writes negative zero as "0".
        return "0".to_owned();
    }
    format!("{value}")
}

/// Rounds to hundredths and writes the shortest form, as markup does.
pub(crate) fn compact(value: f64) -> String {
    number(round(value * 100.0) / 100.0)
}

/// `Math.hypot` for two values, as V8 computes it: scaled by the larger
/// magnitude, so results match the reference to the last bit.
pub(crate) fn hypot(x: f64, y: f64) -> f64 {
    let (x, y) = (x.abs(), y.abs());
    let max = x.max(y);
    if max == 0.0 {
        return 0.0;
    }
    if max.is_infinite() {
        return f64::INFINITY;
    }
    let mut sum = 0.0_f64;
    let mut compensation = 0.0_f64;
    for value in [x, y] {
        let scaled = value / max;
        let summand = scaled * scaled - compensation;
        let preliminary = sum + summand;
        compensation = (preliminary - sum) - summand;
        sum = preliminary;
    }
    sum.sqrt() * max
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rounds_halves_up_like_math_round() {
        assert_eq!(round(2.5), 3.0);
        assert_eq!(round(-2.5), -2.0);
        assert_eq!(round(1.4999), 1.0);
    }

    #[test]
    fn fixed_rounds_exact_halves_away_from_zero() {
        // 12.3125 is exactly representable; toFixed(3) gives "12.313".
        assert_eq!(fixed3(12.3125), 12.313);
        assert_eq!(fixed3(-12.3125), -12.313);
        assert_eq!(fixed3(1.23449), 1.234);
        assert_eq!(fixed3(54.21749), 54.217);
    }

    #[test]
    fn numbers_are_written_as_javascript_writes_them() {
        assert_eq!(number(-0.0), "0");
        assert_eq!(number(210.0), "210");
        assert_eq!(number(177.5), "177.5");
        assert_eq!(compact(1.75), "1.75");
        assert_eq!(compact(-0.001), "0");
    }

    #[test]
    fn hypot_matches_the_plain_formula_for_simple_values() {
        assert_eq!(hypot(3.0, 4.0), 5.0);
        assert_eq!(hypot(0.0, 0.0), 0.0);
    }
}
