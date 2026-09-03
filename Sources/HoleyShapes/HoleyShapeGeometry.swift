import CoreGraphics
import SwiftUI

struct Hole: Hashable, Sendable {
  let cx: Double
  let cy: Double
  let rx: Double
  let ry: Double
  let rotation: Double

  init(_ cx: Double, _ cy: Double, _ rx: Double, _ ry: Double, _ rotation: Double = 0) {
    self.cx = cx
    self.cy = cy
    self.rx = rx
    self.ry = ry
    self.rotation = rotation
  }
}

extension HoleyShape {
  var templates: [Hole] {
    switch self {
    case .disc:
      [
        Hole(138, 112, 19, 27, -24), Hole(247, 95, 24, 16, 12), Hole(310, 178, 17, 25, 25),
        Hole(285, 280, 20, 29, 32), Hole(166, 312, 25, 17, 8), Hole(93, 225, 16, 24, -8),
        Hole(196, 177, 18, 25, 18), Hole(245, 224, 22, 15, -18), Hole(145, 236, 16, 21, 30),
        Hole(211, 285, 15, 20, -12), Hole(293, 231, 13, 18, 10), Hole(108, 169, 13, 18, 22),
      ]
    case .roundBlock:
      [
        Hole(123, 116, 23, 17, -16), Hole(211, 105, 16, 23, 5), Hole(300, 125, 22, 16, 16),
        Hole(101, 207, 16, 23, -4), Hole(190, 190, 23, 16, 22), Hole(292, 211, 17, 25, 12),
        Hole(125, 300, 22, 16, -18), Hole(218, 293, 16, 23), Hole(306, 295, 21, 15, 13),
        Hole(153, 158, 13, 18, 21), Hole(249, 151, 15, 20, -14), Hole(245, 246, 13, 18, 8),
      ]
    case .hex:
      [
        Hole(207, 91, 15, 22), Hole(287, 140, 23, 15, 18), Hole(314, 226, 16, 23, 8),
        Hole(260, 304, 18, 25, 24), Hole(157, 305, 23, 16, -15), Hole(101, 229, 16, 23, -8),
        Hole(123, 146, 17, 24, 16), Hole(204, 162, 20, 14, -12), Hole(244, 231, 16, 22, 22),
        Hole(159, 237, 20, 14, 9), Hole(210, 274, 12, 17, -5),
      ]
    case .capsule:
      [
        Hole(91, 205, 15, 23), Hole(150, 164, 23, 15, -12), Hole(218, 211, 16, 24, 8),
        Hole(291, 165, 21, 15, 10), Hole(335, 222, 15, 22, -8), Hole(145, 252, 21, 14, 17),
        Hole(262, 260, 22, 15, -14), Hole(206, 154, 12, 17, 5),
      ]
    case .prism:
      [
        Hole(145, 129, 20, 15, -18), Hole(244, 108, 15, 21, 10), Hole(309, 173, 20, 15, 20),
        Hole(284, 270, 16, 23, 17), Hole(211, 317, 22, 15), Hole(130, 278, 16, 22, -18),
        Hole(100, 188, 20, 15, -12), Hole(197, 186, 15, 22, 8), Hole(237, 245, 20, 14, 18),
        Hole(151, 218, 13, 18, -5),
      ]
    case .cross:
      [
        Hole(210, 86, 15, 22), Hole(210, 135, 13, 18), Hole(327, 210, 22, 15),
        Hole(278, 210, 18, 13), Hole(210, 334, 15, 22), Hole(210, 285, 13, 18),
        Hole(91, 210, 22, 15), Hole(140, 210, 18, 13), Hole(210, 210, 21, 21),
      ]
    case .triangle:
      [
        Hole(210, 103, 14, 20), Hole(170, 170, 18, 13, -15), Hole(252, 172, 18, 13, 15),
        Hole(127, 257, 16, 22, -10), Hole(210, 248, 21, 15), Hole(294, 257, 16, 22, 10),
        Hole(89, 323, 18, 13), Hole(210, 319, 17, 12), Hole(330, 323, 18, 13),
      ]
    case .diamond:
      [
        Hole(210, 83, 16, 22), Hole(142, 142, 20, 14, -18), Hole(278, 142, 20, 14, 18),
        Hole(85, 210, 15, 21), Hole(210, 210, 22, 16), Hole(335, 210, 15, 21),
        Hole(143, 279, 20, 14, 18), Hole(277, 279, 20, 14, -18), Hole(210, 337, 16, 22),
        Hole(210, 145, 12, 17),
      ]
    case .sunburst:
      [
        Hole(210, 91, 16, 22), Hole(143, 126, 19, 14, -18), Hole(278, 126, 19, 14, 18),
        Hole(103, 197, 15, 22), Hole(210, 183, 21, 15), Hole(317, 197, 15, 22),
        Hole(112, 291, 18, 24, -8), Hole(210, 278, 22, 15), Hole(307, 291, 18, 24, 8),
        Hole(162, 224, 12, 17, 15),
      ]
    case .octagon:
      [
        Hole(137, 96, 19, 14, -15), Hole(229, 87, 14, 20), Hole(313, 131, 19, 14, 18),
        Hole(328, 221, 14, 20), Hole(298, 310, 19, 14, -18), Hole(207, 332, 14, 20),
        Hole(116, 306, 19, 14, 15), Hole(82, 216, 14, 20), Hole(119, 153, 14, 19, -8),
        Hole(208, 164, 20, 14, 12), Hole(271, 231, 15, 21, 18), Hole(171, 257, 20, 14, -14),
      ]
    case .chevron:
      [
        Hole(102, 126, 19, 14, 18), Hole(162, 161, 15, 21, -12), Hole(258, 160, 15, 21, 12),
        Hole(319, 126, 19, 14, -18), Hole(210, 223, 21, 15), Hole(161, 264, 16, 22, 18),
        Hole(210, 308, 19, 13), Hole(260, 264, 16, 22, -18),
      ]
    case .longBar:
      [
        Hole(146, 91, 20, 14, -12), Hole(255, 88, 15, 21, 8), Hole(103, 170, 14, 20),
        Hole(201, 158, 21, 15, 15), Hole(305, 172, 15, 22, -8), Hole(137, 246, 18, 25, 12),
        Hole(245, 238, 21, 15, -12), Hole(306, 299, 17, 23, 8), Hole(185, 324, 22, 15),
        Hole(272, 130, 12, 17, 15),
      ]
    case .flowerStar, .flower:
      [
        Hole(210, 104, 18, 24), Hole(304, 174, 23, 17, 20), Hole(269, 282, 18, 24, -22),
        Hole(151, 282, 22, 17, 18), Hole(116, 174, 17, 23, -18), Hole(210, 210, 23, 18),
        Hole(254, 211, 16, 21, 12), Hole(168, 210, 16, 21, -12),
      ]
    case .bowtie:
      [
        Hole(98, 126, 20, 15, -15), Hole(190, 116, 16, 22, 8), Hole(322, 126, 20, 15, 15),
        Hole(322, 294, 20, 15, -15), Hole(230, 304, 16, 22, -8), Hole(98, 294, 20, 15, 15),
        Hole(176, 210, 15, 20), Hole(244, 210, 15, 20),
      ]
    }
  }
}

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

  static func scaledHole(_ hole: Hole, into bounds: CGRect, offset: CGSize = .zero) -> Path {
    scaled(
      ellipse(cx: hole.cx, cy: hole.cy, rx: hole.rx, ry: hole.ry, rotation: hole.rotation),
      into: bounds, offset: offset)
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
    case .flower:
      flower()
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

  private static func flower() -> CGPath {
    let path = CGMutablePath()
    path.addEllipse(in: CGRect(x: 105, y: 105, width: 210, height: 210))
    addEllipse(to: path, cx: 210, cy: 110, rx: 60, ry: 90)
    addEllipse(to: path, cx: 296.6, cy: 160, rx: 60, ry: 90, rotation: 60)
    addEllipse(to: path, cx: 296.6, cy: 260, rx: 60, ry: 90, rotation: 120)
    addEllipse(to: path, cx: 210, cy: 310, rx: 60, ry: 90)
    addEllipse(to: path, cx: 123.4, cy: 260, rx: 60, ry: 90, rotation: 60)
    addEllipse(to: path, cx: 123.4, cy: 160, rx: 60, ry: 90, rotation: 120)
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
