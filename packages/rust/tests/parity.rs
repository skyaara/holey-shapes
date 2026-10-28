//! Checks the Rust package against the JavaScript package's own answers:
//! the shared seeding vectors, and the layouts and documents that
//! `scripts/rust-fixtures.mjs` writes from it.

use holey_shapes::{
    create_holey_svg, extrusion_color, hue_color, identity_hash, layout, seeded_options, Color,
    Options, Shape,
};

const SEEDING: &str = include_str!("../../seeding-vectors.tsv");
const LAYOUTS: &str = include_str!("fixtures/layouts.tsv");
const SVGS: &str = include_str!("fixtures/svgs.tsv");

type Outcome = Result<(), Box<dyn std::error::Error>>;

fn rows(source: &str) -> impl Iterator<Item = Vec<&str>> {
    source
        .lines()
        .filter(|line| !line.starts_with('#') && !line.is_empty())
        .map(|line| line.split('\t').collect())
}

fn color(hex: &str) -> Result<Color, String> {
    Color::from_hex(hex).ok_or_else(|| format!("not a color: {hex}"))
}

fn missing(what: &str) -> String {
    format!("{what} is missing")
}

#[test]
fn seeding_matches_every_reference_identity() -> Outcome {
    let mut checked = 0;
    for row in rows(SEEDING).filter(|row| row[0] == "seed") {
        let options = seeded_options(row[1]);
        let found = [
            options.shape.key().to_owned(),
            options.holes.ok_or_else(|| missing("holes"))?.to_string(),
            options.seed.to_string(),
            options.turn.to_string(),
            u8::from(options.mirror).to_string(),
            options.color.ok_or_else(|| missing("color"))?.hex(),
            options
                .shadow_color
                .ok_or_else(|| missing("shadow color"))?
                .hex(),
        ];
        assert_eq!(found.as_slice(), &row[2..], "identity {:?}", row[1]);
        checked += 1;
    }
    assert_eq!(checked, 1009);
    Ok(())
}

#[test]
fn every_hue_and_extrusion_matches() -> Outcome {
    let mut checked = 0;
    for row in rows(SEEDING) {
        match row[0] {
            "hue" => {
                let tenths: f64 = row[1].parse()?;
                assert_eq!(hue_color(tenths / 10.0).hex(), row[2], "hue {tenths}");
            }
            "extrusion" => {
                assert_eq!(
                    extrusion_color(color(row[1])?).hex(),
                    row[2],
                    "face {}",
                    row[1]
                );
            }
            _ => continue,
        }
        checked += 1;
    }
    assert_eq!(checked, 3900);
    Ok(())
}

#[test]
fn identity_hash_is_fnv1a64() -> Outcome {
    assert_eq!(identity_hash("relay-agent"), "0cc0c8aa3dbd893e");
    assert_eq!(identity_hash(""), "cbf29ce484222325");
    Ok(())
}

#[test]
fn every_layout_matches() -> Outcome {
    let mut checked = 0;
    for row in rows(LAYOUTS) {
        let shape = Shape::from_key(row[0]).ok_or_else(|| missing(row[0]))?;
        let (count, seed) = (row[1].parse()?, row[2].parse()?);
        let found: Vec<String> = layout(shape, count, seed)
            .iter()
            .map(|hole| {
                format!(
                    "{},{},{},{},{}",
                    hole.cx, hole.cy, hole.rx, hole.ry, hole.rotate
                )
            })
            .collect();
        let expected = row.get(3).copied().unwrap_or_default();
        assert_eq!(
            found.join(";"),
            expected,
            "{} holes={count} seed={seed}",
            row[0]
        );
        checked += 1;
    }
    assert_eq!(checked, 14 * 9 * 7);
    Ok(())
}

#[test]
fn documents_match_byte_for_byte() -> Outcome {
    let seeded = |identity: &str, animated: bool| Options {
        animated,
        ..seeded_options(identity)
    };
    let cases = [
        ("seeded-relay-agent", seeded("relay-agent", true)),
        (
            "seeded-ada-static",
            Options {
                id_prefix: Some("chat:ada".into()),
                ..seeded("ada", false)
            },
        ),
        (
            "seeded-empty-doodle",
            Options {
                doodle: true,
                ..seeded("", true)
            },
        ),
        (
            "seeded-planner-doodle-static",
            Options {
                doodle: true,
                id_prefix: Some("é_1".into()),
                ..seeded("bot:planner", false)
            },
        ),
        ("defaults", Options::default()),
        (
            "flower-doodle-ink",
            Options {
                shape: Shape::FlowerStar,
                color: Some(color("#F786A8")?),
                doodle: true,
                id_prefix: Some("my-doodle".into()),
                ..Options::default()
            },
        ),
        (
            "bowtie-custom",
            Options {
                shape: Shape::Bowtie,
                holes: Some(8),
                seed: -3,
                turn: -450,
                mirror: true,
                color: Some(color("#123abc")?),
                shadow_color: Some(color("#000000")?),
                shadow_x: -30.0,
                shadow_y: 4.25,
                shadow_steps: 5,
                duration_ms: 2500,
                ..Options::default()
            },
        ),
        (
            "long-bar-none",
            Options {
                shape: Shape::LongBar,
                holes: Some(0),
                animated: false,
                id_prefix: Some(String::new()),
                ..Options::default()
            },
        ),
    ];
    let expected: Vec<Vec<&str>> = rows(SVGS).collect();
    assert_eq!(expected.len(), cases.len());
    for ((name, options), row) in cases.iter().zip(&expected) {
        assert_eq!(*name, row[0]);
        assert_eq!(create_holey_svg(options), row[1], "{name}");
    }
    Ok(())
}

#[test]
fn every_shape_has_room_for_eight_holes() -> Outcome {
    for shape in Shape::ALL {
        assert_eq!(
            layout(shape, 8, 0).len(),
            usize::from(shape.max_holes()),
            "{shape:?}"
        );
    }
    Ok(())
}
