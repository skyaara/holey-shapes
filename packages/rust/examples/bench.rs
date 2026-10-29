//! How fast avatars are drawn on one thread: a fixed set of new names and
//! layouts, timed over several rounds, reporting the best round so other
//! work on the machine disturbs it least.
//!
//! `cargo run --release --example bench`

use std::{hint::black_box, time::Instant};

use holey_shapes::{create_holey_svg, layout, seeded_options, Shape};

const ROUNDS: u32 = 7;

fn best(label: &str, count: u32, mut draw: impl FnMut(u32)) {
    // Warms the per-shape outlines and packing candidates.
    for index in 0..100 {
        draw(index);
    }
    let fastest = (0..ROUNDS)
        .map(|_| {
            let started = Instant::now();
            for index in 0..count {
                draw(index);
            }
            started.elapsed().as_secs_f64()
        })
        .fold(f64::INFINITY, f64::min);
    let rate = f64::from(count) / fastest;
    println!(
        "{label:<22} {rate:>7.0} per second  ({:.3} ms each)",
        1_000.0 / rate
    );
}

fn main() {
    best("seeded avatar (svg)", 1_000, |index| {
        let options = seeded_options(&format!("user-{index}"));
        black_box(create_holey_svg(&black_box(options)));
    });
    for holes in [3, 5, 8] {
        best(&format!("{holes}-hole layout"), 700, |index| {
            let shape = Shape::ALL[index as usize % Shape::ALL.len()];
            black_box(layout(shape, holes, black_box(index as i32)));
        });
    }
}
