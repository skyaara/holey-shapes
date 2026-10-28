//! The catalog, transcribed from the reference's `packages/js/script.js`. Each
//! shape keeps the reference's hole styles (their proportions and turns); the
//! packer places and sizes the holes, so the styles' positions are not kept.

use std::sync::OnceLock;

use crate::{color::Color, geometry::ShapePath};

/// The proportions and turn one hole borrows from its shape.
#[derive(Clone, Copy, Debug)]
pub(crate) struct Style {
    pub(crate) rx: f64,
    pub(crate) ry: f64,
    pub(crate) rotate: f64,
}

const fn style(rx: f64, ry: f64, rotate: f64) -> Style {
    Style { rx, ry, rotate }
}

pub(crate) struct ShapeData {
    pub(crate) key: &'static str,
    pub(crate) name: &'static str,
    pub(crate) color: Color,
    /// The hole count a shape shows by default.
    pub(crate) initial: u8,
    pub(crate) path: &'static str,
    pub(crate) styles: &'static [Style],
}

impl Shape {
    pub(crate) fn data(self) -> &'static ShapeData {
        &CATALOG[self as usize]
    }

    /// The key the reference names it by, such as `round-block`.
    pub fn key(self) -> &'static str {
        self.data().key
    }

    /// Its display name, such as "Round block".
    pub fn name(self) -> &'static str {
        self.data().name
    }

    /// Its own face color, used when none is chosen.
    pub fn color(self) -> Color {
        self.data().color
    }

    /// The shape a key names, if any.
    pub fn from_key(key: &str) -> Option<Self> {
        Self::ALL.into_iter().find(|shape| shape.key() == key)
    }

    /// The most holes it can take: eight, or fewer for shapes with fewer styles.
    pub fn max_holes(self) -> u8 {
        let styles = u8::try_from(self.data().styles.len()).unwrap_or(u8::MAX);
        crate::MAX_HOLES.min(styles)
    }

    /// The flattened outline, compiled once per shape. Every catalog path
    /// compiles (a test checks), so an empty outline is never seen in use.
    pub(crate) fn outline(self) -> &'static ShapePath {
        static OUTLINES: [OnceLock<ShapePath>; 14] = [const { OnceLock::new() }; 14];
        OUTLINES[self as usize]
            .get_or_init(|| ShapePath::compile(self.data().path).unwrap_or_default())
    }
}

/// One of the fourteen catalog shapes.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash)]
pub enum Shape {
    Disc,
    RoundBlock,
    Hex,
    Capsule,
    Prism,
    Cross,
    Triangle,
    Diamond,
    Sunburst,
    Octagon,
    Chevron,
    LongBar,
    FlowerStar,
    Bowtie,
}

impl Shape {
    /// Every shape, in the reference's catalog order, which seeding indexes.
    pub const ALL: [Shape; 14] = [
        Shape::Disc,
        Shape::RoundBlock,
        Shape::Hex,
        Shape::Capsule,
        Shape::Prism,
        Shape::Cross,
        Shape::Triangle,
        Shape::Diamond,
        Shape::Sunburst,
        Shape::Octagon,
        Shape::Chevron,
        Shape::LongBar,
        Shape::FlowerStar,
        Shape::Bowtie,
    ];
}

pub(crate) static CATALOG: [ShapeData; 14] = [
    ShapeData {
        key: "disc",
        name: "Perforated disc",
        color: Color([0x63, 0x37, 0xFF]),
        initial: 5,
        path: "M210 38A164 164 0 1 1 209.9 38Z",
        styles: &[
            style(19.0, 27.0, -24.0),
            style(24.0, 16.0, 12.0),
            style(17.0, 25.0, 25.0),
            style(20.0, 29.0, 32.0),
            style(25.0, 17.0, 8.0),
            style(16.0, 24.0, -8.0),
            style(18.0, 25.0, 18.0),
            style(22.0, 15.0, -18.0),
            style(16.0, 21.0, 30.0),
            style(15.0, 20.0, -12.0),
            style(13.0, 18.0, 10.0),
            style(13.0, 18.0, 22.0),
        ],
    },
    ShapeData {
        key: "round-block",
        name: "Round block",
        color: Color([0x9B, 0xED, 0x00]),
        initial: 4,
        path: "M121 54H299Q365 54 365 120V298Q365 364 299 364H121Q55 364 55 298V120Q55 54 121 54Z",
        styles: &[
            style(23.0, 17.0, -16.0),
            style(16.0, 23.0, 5.0),
            style(22.0, 16.0, 16.0),
            style(16.0, 23.0, -4.0),
            style(23.0, 16.0, 22.0),
            style(17.0, 25.0, 12.0),
            style(22.0, 16.0, -18.0),
            style(16.0, 23.0, 0.0),
            style(21.0, 15.0, 13.0),
            style(13.0, 18.0, 21.0),
            style(15.0, 20.0, -14.0),
            style(13.0, 18.0, 8.0),
        ],
    },
    ShapeData {
        key: "hex",
        name: "Hex slab",
        color: Color([0xFF, 0x08, 0x78]),
        initial: 5,
        path: "M210 36 353 119 353 285 210 368 67 285 67 119Z",
        styles: &[
            style(15.0, 22.0, 0.0),
            style(23.0, 15.0, 18.0),
            style(16.0, 23.0, 8.0),
            style(18.0, 25.0, 24.0),
            style(23.0, 16.0, -15.0),
            style(16.0, 23.0, -8.0),
            style(17.0, 24.0, 16.0),
            style(20.0, 14.0, -12.0),
            style(16.0, 22.0, 22.0),
            style(20.0, 14.0, 9.0),
            style(12.0, 17.0, -5.0),
        ],
    },
    ShapeData {
        key: "capsule",
        name: "Capsule",
        color: Color([0x28, 0x78, 0xFF]),
        initial: 4,
        path: "M129 112H291A95 95 0 0 1 291 302H129A95 95 0 0 1 129 112Z",
        styles: &[
            style(15.0, 23.0, 0.0),
            style(23.0, 15.0, -12.0),
            style(16.0, 24.0, 8.0),
            style(21.0, 15.0, 10.0),
            style(15.0, 22.0, -8.0),
            style(21.0, 14.0, 17.0),
            style(22.0, 15.0, -14.0),
            style(12.0, 17.0, 5.0),
        ],
    },
    ShapeData {
        key: "prism",
        name: "Cut prism",
        color: Color([0xFF, 0x6A, 0x00]),
        initial: 4,
        path: "M210 34 370 164 309 358 111 358 50 164Z",
        styles: &[
            style(20.0, 15.0, -18.0),
            style(15.0, 21.0, 10.0),
            style(20.0, 15.0, 20.0),
            style(16.0, 23.0, 17.0),
            style(22.0, 15.0, 0.0),
            style(16.0, 22.0, -18.0),
            style(20.0, 15.0, -12.0),
            style(15.0, 22.0, 8.0),
            style(20.0, 14.0, 18.0),
            style(13.0, 18.0, -5.0),
        ],
    },
    ShapeData {
        key: "cross",
        name: "Cross block",
        color: Color([0x00, 0xDB, 0xFF]),
        initial: 5,
        path: "M151 36H269V151H384V269H269V384H151V269H36V151H151Z",
        styles: &[
            style(15.0, 22.0, 0.0),
            style(13.0, 18.0, 0.0),
            style(22.0, 15.0, 0.0),
            style(18.0, 13.0, 0.0),
            style(15.0, 22.0, 0.0),
            style(13.0, 18.0, 0.0),
            style(22.0, 15.0, 0.0),
            style(18.0, 13.0, 0.0),
            style(21.0, 21.0, 0.0),
        ],
    },
    ShapeData {
        key: "triangle",
        name: "Triangle plate",
        color: Color([0x00, 0xD6, 0x9F]),
        initial: 4,
        path: "M210 38 382 356H38Z",
        styles: &[
            style(14.0, 20.0, 0.0),
            style(18.0, 13.0, -15.0),
            style(18.0, 13.0, 15.0),
            style(16.0, 22.0, -10.0),
            style(21.0, 15.0, 0.0),
            style(16.0, 22.0, 10.0),
            style(18.0, 13.0, 0.0),
            style(17.0, 12.0, 0.0),
            style(18.0, 13.0, 0.0),
        ],
    },
    ShapeData {
        key: "diamond",
        name: "Diamond tile",
        color: Color([0xFF, 0xD0, 0x00]),
        initial: 5,
        path: "M210 28 392 210 210 392 28 210Z",
        styles: &[
            style(16.0, 22.0, 0.0),
            style(20.0, 14.0, -18.0),
            style(20.0, 14.0, 18.0),
            style(15.0, 21.0, 0.0),
            style(22.0, 16.0, 0.0),
            style(15.0, 21.0, 0.0),
            style(20.0, 14.0, 18.0),
            style(20.0, 14.0, -18.0),
            style(16.0, 22.0, 0.0),
            style(12.0, 17.0, 0.0),
        ],
    },
    ShapeData {
        key: "sunburst",
        name: "Sunburst slab",
        color: Color([0xB9, 0x4C, 0xFF]),
        initial: 5,
        path: "M210 28 246 78 306 50 315 112 379 113 352 171 402 208 349 244 377 303 313 304 302 368 245 338 207 390 171 339 110 368 105 304 41 300 69 243 18 207 71 172 43 112 107 111 118 49 173 78Z",
        styles: &[
            style(16.0, 22.0, 0.0),
            style(19.0, 14.0, -18.0),
            style(19.0, 14.0, 18.0),
            style(15.0, 22.0, 0.0),
            style(21.0, 15.0, 0.0),
            style(15.0, 22.0, 0.0),
            style(18.0, 24.0, -8.0),
            style(22.0, 15.0, 0.0),
            style(18.0, 24.0, 8.0),
            style(12.0, 17.0, 15.0),
        ],
    },
    ShapeData {
        key: "octagon",
        name: "Octagon",
        color: Color([0xFF, 0x38, 0x38]),
        initial: 6,
        path: "M130 40H290L380 130V290L290 380H130L40 290V130Z",
        styles: &[
            style(19.0, 14.0, -15.0),
            style(14.0, 20.0, 0.0),
            style(19.0, 14.0, 18.0),
            style(14.0, 20.0, 0.0),
            style(19.0, 14.0, -18.0),
            style(14.0, 20.0, 0.0),
            style(19.0, 14.0, 15.0),
            style(14.0, 20.0, 0.0),
            style(14.0, 19.0, -8.0),
            style(20.0, 14.0, 12.0),
            style(15.0, 21.0, 18.0),
            style(20.0, 14.0, -14.0),
        ],
    },
    ShapeData {
        key: "chevron",
        name: "Bent chevron",
        color: Color([0x00, 0xC9, 0xF2]),
        initial: 4,
        path: "M48 76 210 181 372 76 398 150 210 353 22 150Z",
        styles: &[
            style(19.0, 14.0, 18.0),
            style(15.0, 21.0, -12.0),
            style(15.0, 21.0, 12.0),
            style(19.0, 14.0, -18.0),
            style(21.0, 15.0, 0.0),
            style(16.0, 22.0, 18.0),
            style(19.0, 13.0, 0.0),
            style(16.0, 22.0, -18.0),
        ],
    },
    ShapeData {
        key: "long-bar",
        name: "Long bar",
        color: Color([0xFF, 0x4F, 0xA3]),
        initial: 5,
        path: "M30 145H390V275H30Z",
        styles: &[
            style(20.0, 14.0, -12.0),
            style(15.0, 21.0, 8.0),
            style(14.0, 20.0, 0.0),
            style(21.0, 15.0, 15.0),
            style(15.0, 22.0, -8.0),
            style(18.0, 25.0, 12.0),
            style(21.0, 15.0, -12.0),
            style(17.0, 23.0, 8.0),
            style(22.0, 15.0, 0.0),
            style(12.0, 17.0, 15.0),
        ],
    },
    ShapeData {
        key: "flower-star",
        name: "Five-point bloom",
        color: Color([0xFF, 0x76, 0x57]),
        initial: 5,
        path: "M274.7 121Q467.8 126.3 314.6 244Q369.3 429.2 210 320Q50.7 429.2 105.4 244Q-47.8 126.3 145.3 121Q210 -61 274.7 121Z",
        styles: &[
            style(18.0, 24.0, 0.0),
            style(23.0, 17.0, 20.0),
            style(18.0, 24.0, -22.0),
            style(22.0, 17.0, 18.0),
            style(17.0, 23.0, -18.0),
            style(23.0, 18.0, 0.0),
            style(16.0, 21.0, 12.0),
            style(16.0, 21.0, -12.0),
        ],
    },
    ShapeData {
        key: "bowtie",
        name: "Bowtie slab",
        color: Color([0x00, 0xD7, 0xB9]),
        initial: 6,
        path: "M40 70H380L286 210 380 350H40L134 210Z",
        styles: &[
            style(20.0, 15.0, -15.0),
            style(16.0, 22.0, 8.0),
            style(20.0, 15.0, 15.0),
            style(20.0, 15.0, -15.0),
            style(16.0, 22.0, -8.0),
            style(20.0, 15.0, 15.0),
            style(15.0, 20.0, 0.0),
            style(15.0, 20.0, 0.0),
        ],
    },
];
