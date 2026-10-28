//! Avatars from an identity: a 64-bit FNV-1a hash of its UTF-8 bytes, mixed
//! once with a bijection so no bits are lost, then read as mixed-radix
//! digits, so every field gets its own bits.

use crate::{
    color::{extrusion_color, hue_color},
    shapes::Shape,
    Options, MAX_HOLES,
};

fn fnv1a64(identity: &str) -> u64 {
    identity.bytes().fold(0xcbf2_9ce4_8422_2325, |hash, byte| {
        (hash ^ u64::from(byte)).wrapping_mul(0x0000_0100_0000_01b3)
    })
}

fn mix64(value: u64) -> u64 {
    let value = (value ^ (value >> 30)).wrapping_mul(0xBF58_476D_1CE4_E5B9);
    let value = (value ^ (value >> 27)).wrapping_mul(0x94D0_49BB_1331_11EB);
    value ^ (value >> 31)
}

/// The identity's hash as 16 lowercase hex digits.
pub fn identity_hash(identity: &str) -> String {
    format!("{:016x}", fnv1a64(identity))
}

/// The complete holey an identity always gets: its shape, hole count, quarter
/// turn, mirroring, hue and layout seed.
pub fn seeded_options(identity: &str) -> Options {
    let mut rest = mix64(fnv1a64(identity));
    let mut take = |count: u64| {
        let digit = rest % count;
        rest /= count;
        digit
    };
    let shape = Shape::ALL
        .get(take(Shape::ALL.len() as u64) as usize)
        .copied()
        .unwrap_or(Shape::Disc);
    let data = shape.data();
    let styles = u8::try_from(data.styles.len()).unwrap_or(u8::MAX);
    let fewest = 2.max(data.initial.saturating_sub(1));
    let most = MAX_HOLES.min(styles).min(data.initial + 1);
    let holes = fewest + take(u64::from(most.saturating_sub(fewest)) + 1) as u8;
    let turn = take(4) as i32 * 90;
    let mirror = take(2) == 1;
    let color = hue_color(take(3600) as f64 / 10.0);
    let seed = take(1_000_001) as i32;
    Options {
        shape,
        holes: Some(holes),
        seed,
        turn,
        mirror,
        color: Some(color),
        shadow_color: Some(extrusion_color(color)),
        ..Options::default()
    }
}
