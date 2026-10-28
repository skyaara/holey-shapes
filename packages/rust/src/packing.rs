//! Equal-area hole packing, step for step as the reference does it: seeded
//! starting points relaxed over the shape's grid, then a coordinate search
//! that grows every hole to the largest common size that still fits.

use std::f64::consts::PI;

use crate::{geometry::ShapePath, js, shapes::Shape};

/// One elliptical hole in the 420-unit viewBox; `rotate` is in degrees.
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Hole {
    pub cx: f64,
    pub cy: f64,
    pub rx: f64,
    pub ry: f64,
    pub rotate: f64,
}

/// A grid point deep enough inside the shape to hold a hole.
#[derive(Clone, Copy, PartialEq)]
struct Candidate {
    x: f64,
    y: f64,
    clearance: f64,
}

#[derive(Clone, Copy)]
struct Point {
    x: f64,
    y: f64,
}

/// The space kept between holes and between a hole and the rim.
const GAP: f64 = 12.0;

pub(crate) fn seeded_noise(x: f64, y: f64, seed: f64) -> f64 {
    let value = (x * 12.9898 + y * 78.233 + seed * 41.137).sin() * 43758.5453;
    value - value.floor()
}

fn circle_fits(path: &ShapePath, cx: f64, cy: f64, radius: f64) -> bool {
    (0..32).all(|step| {
        let angle = (PI * 2.0 * f64::from(step)) / 32.0;
        path.contains(cx + angle.cos() * radius, cy + angle.sin() * radius)
    })
}

fn boundary_clearance(path: &ShapePath, cx: f64, cy: f64) -> f64 {
    if !path.contains(cx, cy) {
        return 0.0;
    }
    let (mut low, mut high) = (0.0, 180.0);
    for _ in 0..9 {
        let radius = (low + high) / 2.0;
        if circle_fits(path, cx, cy, radius) {
            low = radius;
        } else {
            high = radius;
        }
    }
    low
}

fn candidates(shape: Shape) -> &'static [Candidate] {
    use std::sync::OnceLock;
    static CANDIDATES: [OnceLock<Vec<Candidate>>; 14] = [const { OnceLock::new() }; 14];
    CANDIDATES[shape as usize].get_or_init(|| {
        let path = shape.outline();
        let mut found = Vec::new();
        for y in (50..=370).step_by(12) {
            for x in (50..=370).step_by(12) {
                let (x, y) = (f64::from(x), f64::from(y));
                if !path.contains(x, y) {
                    continue;
                }
                let clearance = boundary_clearance(path, x, y);
                if clearance >= 17.0 {
                    found.push(Candidate { x, y, clearance });
                }
            }
        }
        found
    })
}

fn squared(value: f64) -> f64 {
    value * value
}

fn voronoi_cells(points: &[Candidate], candidates: &[Candidate]) -> Vec<Vec<Candidate>> {
    let mut cells = vec![Vec::new(); points.len()];
    for candidate in candidates {
        let mut closest = 0;
        let mut closest_distance = f64::INFINITY;
        for (index, point) in points.iter().enumerate() {
            let distance = squared(candidate.x - point.x) + squared(candidate.y - point.y);
            if distance < closest_distance {
                closest_distance = distance;
                closest = index;
            }
        }
        if let Some(cell) = cells.get_mut(closest) {
            cell.push(*candidate);
        }
    }
    cells
}

/// Shrinks to the smallest fitted area so spacing and oval proportions stay intact.
fn equalize_areas(holes: Vec<Hole>) -> Vec<Hole> {
    let target = holes
        .iter()
        .map(|hole| hole.rx * hole.ry)
        .fold(f64::INFINITY, f64::min);
    holes
        .into_iter()
        .map(|hole| {
            let scale = (target / (hole.rx * hole.ry)).sqrt();
            Hole {
                rx: js::fixed3(hole.rx * scale),
                ry: js::fixed3(hole.ry * scale),
                ..hole
            }
        })
        .collect()
}

fn initial_layout(shape: Shape, count: usize, seed: i32) -> Vec<Hole> {
    let candidates = candidates(shape);
    // Every catalog shape has room for eight (a test checks), so this never
    // trims a count; the reference throws there instead.
    let count = count.min(candidates.len());
    if count == 0 {
        return Vec::new();
    }
    let seed_value = f64::from(seed);
    let maximum = candidates
        .iter()
        .map(|candidate| candidate.clearance)
        .fold(f64::NEG_INFINITY, f64::max);
    let pool: Vec<&Candidate> = candidates
        .iter()
        .filter(|candidate| candidate.clearance >= maximum * 0.72)
        .collect();
    let from_center = |point: &Candidate| js::hypot(point.x - 210.0, point.y - 210.0);
    let first = if seed == 0 {
        pool.iter().copied().reduce(|best, point| {
            if from_center(point) < from_center(best) {
                point
            } else {
                best
            }
        })
    } else {
        let pick = seeded_noise(seed_value, count as f64, seed_value) * pool.len() as f64;
        pool.get(pick.floor() as usize).copied()
    };
    let Some(first) = first.copied() else {
        return Vec::new();
    };
    let mut selected = vec![first];
    let mut remaining: Vec<Candidate> = candidates
        .iter()
        .copied()
        .filter(|point| *point != first)
        .collect();

    while selected.len() < count && !remaining.is_empty() {
        let mut best_index = 0;
        let mut best_score = -1.0;
        for (index, candidate) in remaining.iter().enumerate() {
            let nearest = selected
                .iter()
                .map(|picked| js::hypot(candidate.x - picked.x, candidate.y - picked.y))
                .fold(f64::INFINITY, f64::min);
            let radius = (candidate.clearance - 12.0).min(nearest / 2.0 - 5.0);
            let variation = if seed == 0 {
                1.0
            } else {
                0.92 + seeded_noise(candidate.x, candidate.y, seed_value) * 0.16
            };
            let score = radius * variation;
            if score > best_score {
                best_score = score;
                best_index = index;
            }
        }
        selected.push(remaining.remove(best_index));
    }

    for _ in 0..8 {
        let cells = voronoi_cells(&selected, candidates);
        selected = cells
            .iter()
            .zip(&selected)
            .map(|(cell, kept)| {
                if cell.is_empty() {
                    return *kept;
                }
                let length = cell.len() as f64;
                let (sum_x, sum_y) = cell
                    .iter()
                    .fold((0.0, 0.0), |(x, y), point| (x + point.x, y + point.y));
                let (cx, cy) = (sum_x / length, sum_y / length);
                let distance = |point: &Candidate| squared(point.x - cx) + squared(point.y - cy);
                cell.iter()
                    .copied()
                    .reduce(|closest, point| {
                        if distance(&point) < distance(&closest) {
                            point
                        } else {
                            closest
                        }
                    })
                    .unwrap_or(*kept)
            })
            .collect();
    }

    let cells = voronoi_cells(&selected, candidates);
    let styles = shape.data().styles;
    let holes = selected
        .iter()
        .enumerate()
        .map(|(index, point)| {
            let nearest = selected
                .iter()
                .enumerate()
                .filter(|(other, _)| *other != index)
                .map(|(_, other)| js::hypot(point.x - other.x, point.y - other.y))
                .fold(f64::INFINITY, f64::min);
            let style_index = (index as i64 + i64::from(seed)).rem_euclid(styles.len() as i64);
            let style = styles
                .get(style_index as usize)
                .copied()
                .unwrap_or(crate::shapes::Style {
                    rx: 1.0,
                    ry: 1.0,
                    rotate: 0.0,
                });
            let style_radius = style.rx.max(style.ry);
            let aspect_area = (style.rx / style_radius) * (style.ry / style_radius);
            let territory_area = cells.get(index).map_or(0, Vec::len) as f64 * 144.0;
            let territory_radius = ((territory_area * 0.56) / (PI * aspect_area)).sqrt();
            let safe_radius = (point.clearance - 12.0).min(nearest / 2.0 - 6.0);
            let radius = 10.0_f64.max(safe_radius.min(territory_radius));
            Hole {
                cx: point.x,
                cy: point.y,
                rx: js::round(radius * (style.rx / style_radius)),
                ry: js::round(radius * (style.ry / style_radius)),
                rotate: style.rotate,
            }
        })
        .collect();
    equalize_areas(holes)
}

/// A hole's oval, normalized to unit area: support distances along the
/// packing directions, and rim samples with their outward normals already
/// scaled by the rim's reach past the gap.
struct Profile {
    a: f64,
    b: f64,
    support: Vec<f64>,
    edge: Vec<[f64; 4]>,
}

fn directions(count: u32) -> impl Iterator<Item = (f64, f64)> {
    (0..count).map(move |i| {
        let angle = f64::from(i) * PI * 2.0 / f64::from(count);
        (angle.cos(), angle.sin())
    })
}

fn profile(hole: &Hole) -> Profile {
    let a = (hole.rx / hole.ry).sqrt();
    let b = 1.0 / a;
    let angle = hole.rotate * PI / 180.0;
    let (c, s) = (angle.cos(), angle.sin());
    Profile {
        a,
        b,
        support: directions(48)
            .map(|(x, y)| js::hypot(a * (x * c + y * s), b * (-x * s + y * c)))
            .collect(),
        edge: directions(192)
            .map(|(x, y)| {
                let (nx, ny) = (x / a, y / b);
                let length = js::hypot(nx, ny);
                // An extra rim unit covers the space between perimeter samples.
                [
                    a * x * c - b * y * s,
                    a * x * s + b * y * c,
                    (GAP + 1.0) * ((nx * c - ny * s) / length),
                    (GAP + 1.0) * ((nx * s + ny * c) / length),
                ]
            })
            .collect(),
    }
}

struct Search<'a> {
    path: &'a ShapePath,
    profiles: Vec<Profile>,
    directions: Vec<(f64, f64)>,
    /// Each pair's summed support distances, `reach[i * holes + j][k]`.
    reach: Vec<Vec<f64>>,
}

impl Search<'_> {
    fn new(path: &ShapePath, profiles: Vec<Profile>) -> Search<'_> {
        let reach = profiles
            .iter()
            .flat_map(|own| {
                profiles.iter().map(move |theirs| {
                    own.support
                        .iter()
                        .zip(&theirs.support)
                        .map(|(own, theirs)| own + theirs)
                        .collect()
                })
            })
            .collect();
        Search {
            path,
            profiles,
            directions: directions(48).collect(),
            reach,
        }
    }

    /// Whether the rim, one unit past the gap, stays inside the shape.
    /// Whether the rim, one unit past the gap, stays inside the shape.
    fn rim_fits(&self, point: Point, profile: &Profile, radius: f64) -> bool {
        profile.edge.iter().all(|[x, y, nx, ny]| {
            self.path
                .contains(point.x + radius * x + nx, point.y + radius * y + ny)
        })
    }

    fn boundary_limit(&self, point: Point, profile: &Profile) -> f64 {
        if !self.path.contains(point.x, point.y) {
            return 0.0;
        }
        let (mut low, mut high) = (0.0, 180.0);
        for _ in 0..11 {
            let radius = (low + high) / 2.0;
            if self.rim_fits(point, profile, radius) {
                low = radius;
            } else {
                high = radius;
            }
        }
        low
    }

    fn fits_at(&self, point: Point, profile: &Profile, radius: f64) -> bool {
        radius < 180.0
            && self.path.contains(point.x, point.y)
            && self.rim_fits(point, profile, radius)
    }

    /// The largest size hole `index` can take at `point` beside the others,
    /// capped by `boundary`.
    fn capacity(&self, points: &[Point], point: Point, index: usize, boundary: f64) -> f64 {
        let mut limit = boundary;
        for (j, other) in points.iter().enumerate() {
            let Some(reach) = self
                .reach
                .get(index * points.len() + j)
                .filter(|_| j != index)
            else {
                continue;
            };
            let (dx, dy) = (point.x - other.x, point.y - other.y);
            let mut separation = 0.0_f64;
            for ((nx, ny), reach) in self.directions.iter().zip(reach) {
                separation = separation.max(((dx * nx + dy * ny).abs() - GAP) / reach);
                // Separation only grows, so once it reaches the limit this
                // pair cannot lower it.
                if separation >= limit {
                    break;
                }
            }
            limit = limit.min(separation);
        }
        limit
    }
}

fn maximize_areas(shape: Shape, holes: Vec<Hole>) -> Vec<Hole> {
    if holes.is_empty() {
        return holes;
    }
    let search = Search::new(shape.outline(), holes.iter().map(profile).collect());
    let mut points: Vec<Point> = holes
        .iter()
        .map(|hole| Point {
            x: hole.cx,
            y: hole.cy,
        })
        .collect();
    let mut boundaries: Vec<f64> = points
        .iter()
        .zip(&search.profiles)
        .map(|(point, profile)| search.boundary_limit(*point, profile))
        .collect();
    const MOVES: [(f64, f64); 8] = [
        (1.0, 0.0),
        (-1.0, 0.0),
        (0.0, 1.0),
        (0.0, -1.0),
        (1.0, 1.0),
        (-1.0, 1.0),
        (1.0, -1.0),
        (-1.0, -1.0),
    ];
    // Coordinate search improves each constrained hole, then refines its position.
    for step in [12.0, 6.0, 3.0, 1.5] {
        for _ in 0..3 {
            let mut moved = false;
            for i in 0..points.len() {
                let (Some(&point), Some(&boundary), Some(profile)) =
                    (points.get(i), boundaries.get(i), search.profiles.get(i))
                else {
                    continue;
                };
                let (mut best, mut best_boundary) = (None, boundary);
                let mut best_limit = search.capacity(&points, point, i, boundary);
                for (dx, dy) in MOVES {
                    let candidate = Point {
                        x: point.x + dx * step,
                        y: point.y + dy * step,
                    };
                    // A move wins only if both limits beat the threshold, so
                    // reject on the cheap separation test and a single rim
                    // test before the search.
                    let separation = search.capacity(&points, candidate, i, f64::INFINITY);
                    if separation <= best_limit + 0.02
                        || !search.fits_at(candidate, profile, best_limit + 0.02)
                    {
                        continue;
                    }
                    let boundary = search.boundary_limit(candidate, profile);
                    let limit = separation.min(boundary);
                    if limit > best_limit + 0.02 {
                        best = Some(candidate);
                        best_boundary = boundary;
                        best_limit = limit;
                    }
                }
                if let Some(best) = best {
                    moved = true;
                    points[i] = best;
                }
                boundaries[i] = best_boundary;
            }
            if !moved {
                break;
            }
        }
    }
    let smallest = points
        .iter()
        .enumerate()
        .map(|(i, point)| search.capacity(&points, *point, i, boundaries[i]))
        .fold(f64::INFINITY, f64::min);
    let radius = 0.0_f64.max(smallest - 0.05);
    holes
        .iter()
        .zip(&points)
        .zip(&search.profiles)
        .map(|((hole, point), profile)| Hole {
            cx: point.x,
            cy: point.y,
            rx: js::fixed3(radius * profile.a),
            ry: js::fixed3(radius * profile.b),
            rotate: hole.rotate,
        })
        .collect()
}

/// The packed holes for a shape, count and seed. Counts above the shape's
/// [`Shape::max_holes`] are clamped, and seeds to ±1,000,000, as the
/// reference does; the same inputs always give the same holes.
pub fn layout(shape: Shape, count: u8, seed: i32) -> Vec<Hole> {
    let count = count.min(shape.max_holes());
    let seed = seed.clamp(-1_000_000, 1_000_000);
    maximize_areas(shape, initial_layout(shape, usize::from(count), seed))
}
