import Foundation

// Pure geometry. Curved outlines are flattened within 0.01 viewBox units.
struct ShapeContainment: Sendable {
  private struct Edge: Sendable { let x: Double; let y: Double; let nx: Double; let ny: Double }
  private let bands: [Int: [Edge]]

  func contains(_ x: Double, _ y: Double) -> Bool {
    var winding = 0
    for e in bands[Int(floor(y / 8))] ?? [] {
      if (e.y > y) == (e.ny > y) { continue }
      if x < e.x + (y - e.y) * (e.nx - e.x) / (e.ny - e.y) {
        winding += e.ny > e.y ? 1 : -1
      }
    }
    return winding != 0
  }

  private final class Builder {
    var x = 0.0, y = 0.0, sx = 0.0, sy = 0.0
    var bands: [Int: [Edge]] = [:]
    func move(_ x: Double, _ y: Double) { self.x = x; self.y = y; sx = x; sy = y }
    func line(_ nx: Double, _ ny: Double) {
      if y != ny {
        let edge = Edge(x: x, y: y, nx: nx, ny: ny)
        for band in Int(floor(min(y, ny) / 8))...Int(floor(max(y, ny) / 8)) {
          bands[band, default: []].append(edge)
        }
      }
      x = nx; y = ny
    }
    func close() { line(sx, sy) }
    func quad(_ cx: Double, _ cy: Double, _ nx: Double, _ ny: Double) {
      if hypot(cx - (x + nx) / 2, cy - (y + ny) / 2) <= 0.02 { line(nx, ny); return }
      let ax = (x + cx) / 2, ay = (y + cy) / 2
      let bx = (cx + nx) / 2, by = (cy + ny) / 2
      let mx = (ax + bx) / 2, my = (ay + by) / 2
      quad(ax, ay, mx, my); quad(bx, by, nx, ny)
    }
    func arc(_ cx: Double, _ cy: Double, _ r: Double, _ start: Double, _ delta: Double) {
      let steps = Int(ceil(abs(delta) / (2 * acos(1 - 0.01 / r))))
      for step in 1...steps {
        let a = start + delta * Double(step) / Double(steps)
        line(cx + r * cos(a), cy + r * sin(a))
      }
    }
    func circle(_ cx: Double, _ cy: Double, _ r: Double) {
      move(cx + r, cy); arc(cx, cy, r, 0, .pi * 2); close()
    }
    func capsule() {
      move(129, 112); line(291, 112)
      arc(291, 207, 95, -.pi / 2, .pi); line(129, 302)
      arc(129, 207, 95, .pi / 2, .pi); close()
    }
  }

  private static let paths: [HoleyShape: ShapeContainment] = Dictionary(
    uniqueKeysWithValues: HoleyShape.allCases.map { ($0, make($0)) })
  static func path(for shape: HoleyShape) -> ShapeContainment { paths[shape]! }

  private static func make(_ shape: HoleyShape) -> ShapeContainment {
    let b = Builder()
    switch shape {
    case .disc:
      b.circle(210.0, 202.0, 164.0)
    case .roundBlock:
      b.move(121.0, 54.0)
      b.line(299.0, 54.0)
      b.quad(365.0, 54.0, 365.0, 120.0)
      b.line(365.0, 298.0)
      b.quad(365.0, 364.0, 299.0, 364.0)
      b.line(121.0, 364.0)
      b.quad(55.0, 364.0, 55.0, 298.0)
      b.line(55.0, 120.0)
      b.quad(55.0, 54.0, 121.0, 54.0)
      b.close()
    case .hex:
      b.move(210.0, 36.0)
      b.line(353.0, 119.0)
      b.line(353.0, 285.0)
      b.line(210.0, 368.0)
      b.line(67.0, 285.0)
      b.line(67.0, 119.0)
      b.close()
    case .capsule:
      b.capsule()
    case .prism:
      b.move(210.0, 34.0)
      b.line(370.0, 164.0)
      b.line(309.0, 358.0)
      b.line(111.0, 358.0)
      b.line(50.0, 164.0)
      b.close()
    case .cross:
      b.move(151.0, 36.0)
      b.line(269.0, 36.0)
      b.line(269.0, 151.0)
      b.line(384.0, 151.0)
      b.line(384.0, 269.0)
      b.line(269.0, 269.0)
      b.line(269.0, 384.0)
      b.line(151.0, 384.0)
      b.line(151.0, 269.0)
      b.line(36.0, 269.0)
      b.line(36.0, 151.0)
      b.line(151.0, 151.0)
      b.close()
    case .triangle:
      b.move(210.0, 38.0)
      b.line(382.0, 356.0)
      b.line(38.0, 356.0)
      b.close()
    case .diamond:
      b.move(210.0, 28.0)
      b.line(392.0, 210.0)
      b.line(210.0, 392.0)
      b.line(28.0, 210.0)
      b.close()
    case .sunburst:
      b.move(210.0, 28.0)
      b.line(246.0, 78.0)
      b.line(306.0, 50.0)
      b.line(315.0, 112.0)
      b.line(379.0, 113.0)
      b.line(352.0, 171.0)
      b.line(402.0, 208.0)
      b.line(349.0, 244.0)
      b.line(377.0, 303.0)
      b.line(313.0, 304.0)
      b.line(302.0, 368.0)
      b.line(245.0, 338.0)
      b.line(207.0, 390.0)
      b.line(171.0, 339.0)
      b.line(110.0, 368.0)
      b.line(105.0, 304.0)
      b.line(41.0, 300.0)
      b.line(69.0, 243.0)
      b.line(18.0, 207.0)
      b.line(71.0, 172.0)
      b.line(43.0, 112.0)
      b.line(107.0, 111.0)
      b.line(118.0, 49.0)
      b.line(173.0, 78.0)
      b.close()
    case .octagon:
      b.move(130.0, 40.0)
      b.line(290.0, 40.0)
      b.line(380.0, 130.0)
      b.line(380.0, 290.0)
      b.line(290.0, 380.0)
      b.line(130.0, 380.0)
      b.line(40.0, 290.0)
      b.line(40.0, 130.0)
      b.close()
    case .chevron:
      b.move(48.0, 76.0)
      b.line(210.0, 181.0)
      b.line(372.0, 76.0)
      b.line(398.0, 150.0)
      b.line(210.0, 353.0)
      b.line(22.0, 150.0)
      b.close()
    case .longBar:
      b.move(30.0, 145.0)
      b.line(390.0, 145.0)
      b.line(390.0, 275.0)
      b.line(30.0, 275.0)
      b.close()
    case .flowerStar:
      b.move(274.7, 121.0)
      b.quad(467.8, 126.3, 314.6, 244.0)
      b.quad(369.3, 429.2, 210.0, 320.0)
      b.quad(50.7, 429.2, 105.4, 244.0)
      b.quad(-47.8, 126.3, 145.3, 121.0)
      b.quad(210.0, -61.0, 274.7, 121.0)
      b.close()
    case .bowtie:
      b.move(40.0, 70.0)
      b.line(380.0, 70.0)
      b.line(286.0, 210.0)
      b.line(380.0, 350.0)
      b.line(40.0, 350.0)
      b.line(134.0, 210.0)
      b.close()
    }
    return ShapeContainment(bands: b.bands)
  }
}
