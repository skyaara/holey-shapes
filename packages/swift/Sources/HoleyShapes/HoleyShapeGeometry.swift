#if canImport(SwiftUI)
import CoreGraphics
import SwiftUI

enum ShapeGeometry {
  private final class PathStorage: @unchecked Sendable {
    let paths: [HoleyShape: CGPath]

    init() {
      paths = Dictionary(
        uniqueKeysWithValues: HoleyShape.allCases.map { ($0, makeBodyPath(for: $0)) }
      )
    }
  }

  private static let storage = PathStorage()

  static func bodyPath(for shape: HoleyShape) -> CGPath {
    storage.paths[shape]!
  }

  static func scaled(_ path: CGPath, into bounds: CGRect, offset: CGSize = .zero) -> Path {
    let scale = min(bounds.width, bounds.height) / 420
    var transform = CGAffineTransform(
      a: scale,
      b: 0,
      c: 0,
      d: scale,
      tx: bounds.midX - 210 * scale + offset.width * scale,
      ty: bounds.midY - 210 * scale + offset.height * scale
    )
    return Path(path.copy(using: &transform) ?? path)
  }

  /// The body with every hole added as a subpath, for an even-odd fill. Holes
  /// never overlap each other or the rim, so even-odd punches them out without
  /// offscreen layers or boolean path operations.
  /// Quarter turns about the 420-unit center, after an optional left-right
  /// mirror, matching the web package's `rotate(turn 210 210) translate(420 0)
  /// scale(-1 1)`. Exact matrices keep the turned outline crisp.
  static func orientation(turn: Int, mirrored: Bool) -> CGAffineTransform {
    let mirror = mirrored ? CGAffineTransform(a: -1, b: 0, c: 0, d: 1, tx: 420, ty: 0) : .identity
    let rotation: CGAffineTransform
    switch turn {
    case 90: rotation = CGAffineTransform(a: 0, b: 1, c: -1, d: 0, tx: 420, ty: 0)
    case 180: rotation = CGAffineTransform(a: -1, b: 0, c: 0, d: -1, tx: 420, ty: 420)
    case 270: rotation = CGAffineTransform(a: 0, b: -1, c: 1, d: 0, tx: 0, ty: 420)
    default: rotation = .identity
    }
    return mirror.concatenating(rotation)
  }

  static func punched(
    _ body: CGPath, holes: [Hole], scales: [Double], into bounds: CGRect, orientation: CGAffineTransform = .identity
  ) -> Path {
    let path = CGMutablePath()
    path.addPath(body)
    for (index, hole) in holes.enumerated() {
      let scale = index < scales.count ? scales[index] : 1
      addEllipse(
        to: path, cx: hole.cx, cy: hole.cy, rx: hole.rx * scale, ry: hole.ry * scale,
        rotation: hole.rotation)
    }
    var transform = orientation
    return scaled(path.copy(using: &transform) ?? path, into: bounds)
  }

  private static func makeBodyPath(for shape: HoleyShape) -> CGPath {
    switch shape {
    case .disc:
      ellipse(cx: 210, cy: 202, rx: 164, ry: 164)
    case .roundBlock:
      roundBlock()
    case .hex:
      polygon([(210, 36), (353, 119), (353, 285), (210, 368), (67, 285), (67, 119)])
    case .capsule:
      roundedRect(CGRect(x: 34, y: 112, width: 352, height: 190), radius: 95)
    case .prism:
      polygon([(210, 34), (370, 164), (309, 358), (111, 358), (50, 164)])
    case .cross:
      polygon([
        (151, 36), (269, 36), (269, 151), (384, 151), (384, 269), (269, 269), (269, 384),
        (151, 384), (151, 269), (36, 269), (36, 151), (151, 151),
      ])
    case .triangle:
      polygon([(210, 38), (382, 356), (38, 356)])
    case .diamond:
      polygon([(210, 28), (392, 210), (210, 392), (28, 210)])
    case .sunburst:
      polygon([
        (210, 28), (246, 78), (306, 50), (315, 112), (379, 113), (352, 171), (402, 208), (349, 244),
        (377, 303), (313, 304), (302, 368), (245, 338), (207, 390), (171, 339), (110, 368),
        (105, 304), (41, 300), (69, 243), (18, 207), (71, 172), (43, 112), (107, 111), (118, 49),
        (173, 78),
      ])
    case .octagon:
      polygon([
        (130, 40), (290, 40), (380, 130), (380, 290), (290, 380), (130, 380), (40, 290), (40, 130),
      ])
    case .chevron:
      polygon([(48, 76), (210, 181), (372, 76), (398, 150), (210, 353), (22, 150)])
    case .longBar:
      polygon([(30, 145), (390, 145), (390, 275), (30, 275)])
    case .flowerStar:
      flowerStar()
    case .bowtie:
      polygon([(40, 70), (380, 70), (286, 210), (380, 350), (40, 350), (134, 210)])
    }
  }

  private static func roundedRect(_ rect: CGRect, radius: CGFloat) -> CGPath {
    let path = CGMutablePath()
    path.addRoundedRect(in: rect, cornerWidth: radius, cornerHeight: radius)
    return path
  }

  private static func roundBlock() -> CGPath {
    let path = CGMutablePath()
    path.move(to: CGPoint(x: 121, y: 54))
    path.addLine(to: CGPoint(x: 299, y: 54))
    path.addQuadCurve(to: CGPoint(x: 365, y: 120), control: CGPoint(x: 365, y: 54))
    path.addLine(to: CGPoint(x: 365, y: 298))
    path.addQuadCurve(to: CGPoint(x: 299, y: 364), control: CGPoint(x: 365, y: 364))
    path.addLine(to: CGPoint(x: 121, y: 364))
    path.addQuadCurve(to: CGPoint(x: 55, y: 298), control: CGPoint(x: 55, y: 364))
    path.addLine(to: CGPoint(x: 55, y: 120))
    path.addQuadCurve(to: CGPoint(x: 121, y: 54), control: CGPoint(x: 55, y: 54))
    path.closeSubpath()
    return path
  }

  private static func flowerStar() -> CGPath {
    let path = CGMutablePath()
    path.move(to: CGPoint(x: 274.7, y: 121))
    path.addQuadCurve(to: CGPoint(x: 314.6, y: 244), control: CGPoint(x: 467.8, y: 126.3))
    path.addQuadCurve(to: CGPoint(x: 210, y: 320), control: CGPoint(x: 369.3, y: 429.2))
    path.addQuadCurve(to: CGPoint(x: 105.4, y: 244), control: CGPoint(x: 50.7, y: 429.2))
    path.addQuadCurve(to: CGPoint(x: 145.3, y: 121), control: CGPoint(x: -47.8, y: 126.3))
    path.addQuadCurve(to: CGPoint(x: 274.7, y: 121), control: CGPoint(x: 210, y: -61))
    path.closeSubpath()
    return path
  }

  private static func ellipse(
    cx: Double,
    cy: Double,
    rx: Double,
    ry: Double,
    rotation: Double = 0
  ) -> CGPath {
    let path = CGMutablePath()
    addEllipse(to: path, cx: cx, cy: cy, rx: rx, ry: ry, rotation: rotation)
    return path
  }

  private static func addEllipse(
    to path: CGMutablePath,
    cx: Double,
    cy: Double,
    rx: Double,
    ry: Double,
    rotation: Double = 0
  ) {
    var transform = CGAffineTransform(rotationAngle: CGFloat(rotation * .pi / 180))
    transform.tx = cx
    transform.ty = cy
    path.addEllipse(
      in: CGRect(x: -rx, y: -ry, width: rx * 2, height: ry * 2),
      transform: transform
    )
  }

  private static func polygon(_ points: [(Double, Double)]) -> CGPath {
    let path = CGMutablePath()
    guard let first = points.first else { return path }
    path.move(to: CGPoint(x: first.0, y: first.1))
    for point in points.dropFirst() {
      path.addLine(to: CGPoint(x: point.0, y: point.1))
    }
    path.closeSubpath()
    return path
  }
}

#endif
