import CoreGraphics
import Foundation

enum HolePacking {
  private struct Candidate: Equatable {
    let x: Double
    let y: Double
    let clearance: Double
  }

  private final class CandidateBox {
    let value: [Candidate]
    init(_ value: [Candidate]) { self.value = value }
  }

  private final class LayoutBox {
    let value: [Hole]
    init(_ value: [Hole]) { self.value = value }
  }

  private final class CacheStorage: @unchecked Sendable {
    let candidates = NSCache<NSString, CandidateBox>()
    let layouts = NSCache<NSString, LayoutBox>()

    init() {
      candidates.countLimit = HoleyShape.allCases.count
      layouts.countLimit = 512
    }
  }

  private static let cache = CacheStorage()

  static func layout(shape: HoleyShape, count: Int, seed: Int) -> [Hole] {
    let cacheKey = "\(shape.rawValue):\(count):\(seed)" as NSString
    if let cached = cache.layouts.object(forKey: cacheKey) {
      return cached.value
    }

    let value = makeLayout(shape: shape, count: count, seed: seed)
    cache.layouts.setObject(LayoutBox(value), forKey: cacheKey, cost: value.count)
    return value
  }

  private static func makeLayout(shape: HoleyShape, count: Int, seed: Int) -> [Hole] {
    guard count > 0 else { return [] }
    let candidates = packingCandidates(for: shape)
    guard !candidates.isEmpty else {
      let templates = shape.templates
      let start = positiveModulo(seed, templates.count)
      return (0..<count).map { templates[(start + $0) % templates.count] }
    }

    let maximumClearance = candidates.lazy.map(\.clearance).max() ?? 0
    let starterPool = candidates.filter { $0.clearance >= maximumClearance * 0.72 }
    let first: Candidate
    if seed == 0 {
      first =
        starterPool.min {
          hypot($0.x - 210, $0.y - 210) < hypot($1.x - 210, $1.y - 210)
        } ?? starterPool[0]
    } else {
      let position = floor(
        seededNoise(Double(seed), Double(count), Double(seed)) * Double(starterPool.count))
      first = starterPool[min(starterPool.count - 1, Int(position))]
    }

    var selected = [first]
    var remaining = candidates
    if let index = remaining.firstIndex(of: first) {
      remaining.remove(at: index)
    }

    while selected.count < count, !remaining.isEmpty {
      var bestIndex = 0
      var bestScore = -Double.infinity
      for (index, candidate) in remaining.enumerated() {
        let nearest =
          selected.lazy
          .map { hypot(candidate.x - $0.x, candidate.y - $0.y) }
          .min() ?? 0
        let packingRadius = min(candidate.clearance - 12, nearest / 2 - 5)
        let variation =
          seed == 0 ? 1 : 0.92 + seededNoise(candidate.x, candidate.y, Double(seed)) * 0.16
        let score = packingRadius * variation
        if score > bestScore {
          bestScore = score
          bestIndex = index
        }
      }
      selected.append(remaining.remove(at: bestIndex))
    }

    for _ in 0..<8 {
      let cells = assignVoronoiCells(points: selected, candidates: candidates)
      selected = cells.enumerated().map { index, cell in
        guard !cell.isEmpty else { return selected[index] }
        let centroidX = cell.reduce(0) { $0 + $1.x } / Double(cell.count)
        let centroidY = cell.reduce(0) { $0 + $1.y } / Double(cell.count)
        return cell.min {
          squaredDistance($0.x, $0.y, centroidX, centroidY)
            < squaredDistance($1.x, $1.y, centroidX, centroidY)
        } ?? selected[index]
      }
    }

    let cells = assignVoronoiCells(points: selected, candidates: candidates)
    let templates = shape.templates
    return selected.enumerated().map { index, point in
      let nearest =
        selected.count == 1
        ? Double.infinity
        : selected.enumerated()
          .filter { $0.offset != index }
          .lazy
          .map { hypot(point.x - $0.element.x, point.y - $0.element.y) }
          .min() ?? Double.infinity
      let style = templates[positiveModulo(index + seed, templates.count)]
      let styleRadius = max(style.rx, style.ry)
      let aspectArea = (style.rx / styleRadius) * (style.ry / styleRadius)
      let territoryArea = Double(cells[index].count) * 144
      let territoryRadius = sqrt((territoryArea * 0.56) / (.pi * aspectArea))
      let safeRadius = min(point.clearance - 12, nearest / 2 - 6)
      let radius = max(10, min(safeRadius, territoryRadius))
      return Hole(
        point.x,
        point.y,
        (radius * style.rx / styleRadius).rounded(),
        (radius * style.ry / styleRadius).rounded(),
        style.rotation
      )
    }
  }

  private static func packingCandidates(for shape: HoleyShape) -> [Candidate] {
    let key = shape.rawValue as NSString
    if let cached = cache.candidates.object(forKey: key) {
      return cached.value
    }

    let path = ShapeGeometry.bodyPath(for: shape)
    var candidates: [Candidate] = []
    for y in stride(from: 50, through: 370, by: 12) {
      for x in stride(from: 50, through: 370, by: 12) {
        guard path.contains(CGPoint(x: x, y: y), using: .winding) else { continue }
        let clearance = boundaryClearance(path, Double(x), Double(y))
        if clearance >= 17 {
          candidates.append(Candidate(x: Double(x), y: Double(y), clearance: clearance))
        }
      }
    }
    cache.candidates.setObject(CandidateBox(candidates), forKey: key, cost: candidates.count)
    return candidates
  }

  private static func boundaryClearance(_ path: CGPath, _ cx: Double, _ cy: Double) -> Double {
    guard path.contains(CGPoint(x: cx, y: cy), using: .winding) else { return 0 }
    var low = 0.0
    var high = 180.0
    for _ in 0..<9 {
      let radius = (low + high) / 2
      if circleFits(path, cx, cy, radius) {
        low = radius
      } else {
        high = radius
      }
    }
    return low
  }

  private static func circleFits(_ path: CGPath, _ cx: Double, _ cy: Double, _ radius: Double)
    -> Bool
  {
    for step in 0..<32 {
      let angle = Double.pi * 2 * Double(step) / 32
      let point = CGPoint(x: cx + cos(angle) * radius, y: cy + sin(angle) * radius)
      if !path.contains(point, using: .winding) {
        return false
      }
    }
    return true
  }

  private static func assignVoronoiCells(points: [Candidate], candidates: [Candidate])
    -> [[Candidate]]
  {
    var cells = Array(repeating: [Candidate](), count: points.count)
    for candidate in candidates {
      var closestIndex = 0
      var closestDistance = Double.infinity
      for (index, point) in points.enumerated() {
        let distance = squaredDistance(candidate.x, candidate.y, point.x, point.y)
        if distance < closestDistance {
          closestDistance = distance
          closestIndex = index
        }
      }
      cells[closestIndex].append(candidate)
    }
    return cells
  }

  private static func seededNoise(_ x: Double, _ y: Double, _ seed: Double) -> Double {
    let value = sin(x * 12.9898 + y * 78.233 + seed * 41.137) * 43_758.5453
    return value - floor(value)
  }

  private static func squaredDistance(_ x1: Double, _ y1: Double, _ x2: Double, _ y2: Double)
    -> Double
  {
    let dx = x1 - x2
    let dy = y1 - y2
    return dx * dx + dy * dy
  }

  private static func positiveModulo(_ value: Int, _ divisor: Int) -> Int {
    let result = value % divisor
    return result >= 0 ? result : result + divisor
  }
}
