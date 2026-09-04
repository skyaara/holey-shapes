import SwiftUI

/// A dependency-free SwiftUI renderer for the `holey-shapes` catalog.
public struct HoleyShapeView: View {
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @State private var hovering = false
  @State private var hoverStartedAt = Date()

  public let configuration: HoleyShapeConfiguration

  public init(configuration: HoleyShapeConfiguration = HoleyShapeConfiguration()) {
    self.configuration = configuration
  }

  public init(
    _ shape: HoleyShape = .disc,
    faceColor: HoleyColor? = nil,
    shadowColor: HoleyColor? = nil,
    holes: Int? = nil,
    seed: Int = 0,
    animated: Bool = true,
    duration: Double = 0.9,
    shadowX: Double = 18,
    shadowY: Double = 21,
    shadowSteps: Int = 12
  ) {
    self.init(
      configuration: HoleyShapeConfiguration(
        shape: shape,
        faceColor: faceColor,
        shadowColor: shadowColor,
        holes: holes,
        seed: seed,
        animated: animated,
        duration: duration,
        shadowX: shadowX,
        shadowY: shadowY,
        shadowSteps: shadowSteps
      ))
  }

  public var body: some View {
    let bodyPath = ShapeGeometry.bodyPath(for: configuration.shape)
    let packedHoles = HolePacking.layout(
      shape: configuration.shape,
      count: configuration.holes,
      seed: configuration.seed
    )

    TimelineView(
      .animation(
        minimumInterval: 1 / 30,
        paused: !hovering || reduceMotion || !configuration.animated
      )
    ) { timeline in
      let progress = holeAnimationProgress(at: timeline.date)
      let holes = packedHoles.enumerated().map { index, hole in
        scaled(hole, by: holeScale(index: index, progress: progress))
      }

      Canvas(opaque: false, colorMode: .nonLinear, rendersAsynchronously: true) {
        context, canvasSize in
        let side = min(canvasSize.width, canvasSize.height)
        let bounds = CGRect(
          x: (canvasSize.width - side) / 2,
          y: (canvasSize.height - side) / 2,
          width: side,
          height: side
        )
        context.clip(to: Path(bounds))

        for step in stride(from: configuration.shadowSteps, through: 1, by: -1) {
          let ratio = Double(step) / Double(configuration.shadowSteps)
          drawMaskedShape(
            in: &context,
            body: bodyPath,
            holes: holes,
            bounds: bounds,
            offset: CGSize(
              width: configuration.shadowX * ratio,
              height: configuration.shadowY * ratio
            ),
            color: configuration.shadowColor.swiftUIColor
          )
        }

        drawMaskedShape(
          in: &context,
          body: bodyPath,
          holes: holes,
          bounds: bounds,
          offset: .zero,
          color: configuration.faceColor.swiftUIColor
        )
      }
    }
    .aspectRatio(1, contentMode: .fit)
    .contentShape(Rectangle())
    .onHover { inside in
      guard configuration.animated, !reduceMotion else { return }
      if inside { hoverStartedAt = Date() }
      hovering = inside
    }
    .accessibilityElement(children: .ignore)
    .accessibilityLabel("\(configuration.shape.name) with \(configuration.holes) holes")
    .accessibilityAddTraits(.isImage)
  }

  private func holeAnimationProgress(at date: Date) -> Double {
    guard hovering, configuration.animated, !reduceMotion else { return 1 }
    return min(1, max(0, date.timeIntervalSince(hoverStartedAt) / configuration.duration))
  }

  private func holeScale(index: Int, progress: Double) -> Double {
    guard progress < 1 else { return 1 }
    let first = holeNoise(index: index, salt: 0)
    let second = holeNoise(index: index, salt: 1)
    let start = 0.04 + first * 0.34
    let span = min(0.58, min(0.42 + second * 0.16, 0.96 - start))
    let local = (progress - start) / span
    guard local > 0, local < 1 else { return 1 }
    let pulse = sin(local * .pi)
    return 1 - 0.94 * pulse * pulse
  }

  private func holeNoise(index: Int, salt: Int) -> Double {
    var value = UInt64(truncatingIfNeeded: configuration.seed)
    value &+= UInt64(index + 1) &* 0x9E37_79B9_7F4A_7C15
    value &+= UInt64(salt + 1) &* 0xBF58_476D_1CE4_E5B9
    value = (value ^ (value >> 30)) &* 0xBF58_476D_1CE4_E5B9
    value = (value ^ (value >> 27)) &* 0x94D0_49BB_1331_11EB
    value ^= value >> 31
    return Double(value & 0xFFFF) / Double(0xFFFF)
  }

  private func scaled(_ hole: Hole, by scale: Double) -> Hole {
    Hole(hole.cx, hole.cy, hole.rx * scale, hole.ry * scale, hole.rotation)
  }

  private func drawMaskedShape(
    in context: inout GraphicsContext,
    body: CGPath,
    holes: [Hole],
    bounds: CGRect,
    offset: CGSize,
    color: Color
  ) {
    context.drawLayer { layer in
      layer.fill(ShapeGeometry.scaled(body, into: bounds, offset: offset), with: .color(color))
      layer.blendMode = .destinationOut
      for hole in holes {
        layer.fill(
          ShapeGeometry.scaledHole(hole, into: bounds, offset: offset), with: .color(.black))
      }
    }
  }
}
