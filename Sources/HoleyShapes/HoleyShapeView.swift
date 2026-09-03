import SwiftUI

/// A dependency-free SwiftUI renderer for the `holey-shapes` catalog.
public struct HoleyShapeView: View {
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @State private var spinTurns = 0

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
    let holes = HolePacking.layout(
      shape: configuration.shape,
      count: configuration.holes,
      seed: configuration.seed
    )

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
    .aspectRatio(1, contentMode: .fit)
    .rotationEffect(.degrees(reduceMotion ? 0 : Double(spinTurns) * 360))
    .animation(
      .timingCurve(0.33, 0, 0.2, 1, duration: configuration.duration),
      value: spinTurns
    )
    .contentShape(Rectangle())
    .onHover { inside in
      guard inside, configuration.animated, !reduceMotion else { return }
      spinTurns &+= 1
    }
    .accessibilityElement(children: .ignore)
    .accessibilityLabel("\(configuration.shape.name) with \(configuration.holes) holes")
    .accessibilityAddTraits(.isImage)
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
