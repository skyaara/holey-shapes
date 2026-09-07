import Foundation

// A common area radius preserves oval proportions. Separating projections keep
// a 12-unit gap between ellipses; offset perimeter samples protect the rim.
enum HoleOptimization {
  private struct Point { let x: Double; let y: Double }
  private struct Edge { let x: Double; let y: Double; let nx: Double; let ny: Double }
  private struct Profile { let a: Double; let b: Double; let support: [Double]; let edge: [Edge] }
  private static let directions = (0..<48).map { i in
    Point(x: cos(Double(i) * .pi * 2 / 48), y: sin(Double(i) * .pi * 2 / 48))
  }

  private static let perimeterDirections = (0..<192).map { i in
    Point(x: cos(Double(i) * .pi * 2 / 192), y: sin(Double(i) * .pi * 2 / 192))
  }

  static func maximize(shape: HoleyShape, holes: [Hole]) -> [Hole] {
    guard !holes.isEmpty else { return holes }
    let path = ShapeContainment.path(for: shape)
    let gap = 12.0
    let profiles: [Profile] = holes.map { hole in
      let a = sqrt(hole.rx / hole.ry), b = 1 / a
      let angle = hole.rotation * .pi / 180
      let c = cos(angle), s = sin(angle)
      let support = directions.map { n in
        hypot(a * (n.x * c + n.y * s), b * (-n.x * s + n.y * c))
      }
      let edge = perimeterDirections.map { n in
        let nx = n.x / a, ny = n.y / b
        let length = hypot(nx, ny)
        return Edge(x: a * n.x * c - b * n.y * s, y: a * n.x * s + b * n.y * c,
                    nx: (nx * c - ny * s) / length, ny: (nx * s + ny * c) / length)
      }
      return Profile(a: a, b: b, support: support, edge: edge)
    }
    var points = holes.map { Point(x: $0.cx, y: $0.cy) }
    func contains(_ x: Double, _ y: Double) -> Bool {
      path.contains(Double(x), Double(y))
    }
    func boundaryLimit(_ point: Point, _ profile: Profile) -> Double {
      guard contains(point.x, point.y) else { return 0 }
      var low = 0.0, high = 180.0
      for _ in 0..<11 {
        let radius = (low + high) / 2
        // An extra rim unit covers the space between perimeter samples.
        let fits = profile.edge.allSatisfy { e in
          contains(point.x + radius * e.x + (gap + 1) * e.nx, point.y + radius * e.y + (gap + 1) * e.ny)
        }
        if fits { low = radius } else { high = radius }
      }
      return low
    }
    var boundaries = points.enumerated().map { boundaryLimit($0.element, profiles[$0.offset]) }
    func capacity(_ point: Point, _ index: Int, _ boundary: Double) -> Double {
      var limit = boundary
      for j in points.indices where j != index {
        var separation = 0.0
        for (k, n) in directions.enumerated() {
          let projection = abs((point.x - points[j].x) * n.x + (point.y - points[j].y) * n.y)
          separation = max(separation, (projection - gap) / (profiles[index].support[k] + profiles[j].support[k]))
        }
        limit = min(limit, separation)
      }
      return limit
    }
    let moves = [(1.0,0.0),(-1.0,0.0),(0.0,1.0),(0.0,-1.0),(1.0,1.0),(-1.0,1.0),(1.0,-1.0),(-1.0,-1.0)]
    for step in [12.0, 6.0, 3.0, 1.5] {
      for _ in 0..<3 {
        var moved = false
        for i in points.indices {
          let point = points[i]
          var best = point, bestBoundary = boundaries[i]
          var bestLimit = capacity(point, i, bestBoundary)
          for (dx, dy) in moves {
            let candidate = Point(x: point.x + dx * step, y: point.y + dy * step)
            let boundary = boundaryLimit(candidate, profiles[i])
            let limit = capacity(candidate, i, boundary)
            if limit > bestLimit + 0.02 {
              best = candidate; bestBoundary = boundary; bestLimit = limit
            }
          }
          if best.x != point.x || best.y != point.y { moved = true }
          points[i] = best; boundaries[i] = bestBoundary
        }
        if !moved { break }
      }
    }
    let radius = max(0, (points.indices.map { capacity(points[$0], $0, boundaries[$0]) }.min() ?? 0) - 0.05)
    return holes.enumerated().map { i, hole in
      Hole(points[i].x, points[i].y, radius * profiles[i].a, radius * profiles[i].b, hole.rotation)
    }
  }
}
