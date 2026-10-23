#if canImport(SwiftUI)
import SwiftUI

/// A dependency-free SwiftUI renderer for the `holey-shapes` catalog.
///
/// Hole layouts are computed off the main thread the first time a
/// shape, count and seed combination is seen, then cached.
public struct HoleyShapeView: View {
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @State private var computed: LayoutResult?
  @State private var playStartedAt: Date?

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

  private var layoutKey: LayoutKey {
    LayoutKey(shape: configuration.shape, count: configuration.holes, seed: configuration.seed)
  }

  private var canAnimate: Bool { configuration.animated && !reduceMotion }

  public var body: some View {
    let key = layoutKey
    let holes =
      computed.flatMap { $0.key == key ? $0.holes : nil }
      ?? HolePacking.cachedLayout(shape: key.shape, count: key.count, seed: key.seed) ?? []
    let timings = HoleTiming.make(count: holes.count, seed: configuration.seed, duration: configuration.duration)
    let playing = playStartedAt != nil && canAnimate

    TimelineView(.animation(minimumInterval: 1 / 60, paused: !playing)) { timeline in
      let elapsed = playStartedAt.map { timeline.date.timeIntervalSince($0) } ?? .infinity
      let scales = timings.map { $0.scale(at: elapsed) }
      canvas(holes: holes, scales: scales)
    }
    .aspectRatio(1, contentMode: .fit)
    .contentShape(Rectangle())
    .onHover { inside in
      if inside { play() } else { playStartedAt = nil }
    }
    .simultaneousGesture(TapGesture().onEnded { play() })
    .task(id: playStartedAt) {
      guard let started = playStartedAt else { return }
      let remaining = timings.window - Date().timeIntervalSince(started)
      if remaining > 0 { try? await Task.sleep(nanoseconds: UInt64(remaining * 1_000_000_000)) }
      if !Task.isCancelled, playStartedAt == started { playStartedAt = nil }
    }
    .task(id: key) {
      if HolePacking.cachedLayout(shape: key.shape, count: key.count, seed: key.seed) != nil { return }
      let holes = await Task.detached(priority: .userInitiated) {
        HolePacking.layout(shape: key.shape, count: key.count, seed: key.seed)
      }.value
      if !Task.isCancelled { computed = LayoutResult(key: key, holes: holes) }
    }
    .accessibilityElement(children: .ignore)
    .accessibilityLabel("\(configuration.shape.name) with \(configuration.holes) holes")
    .accessibilityAddTraits(.isImage)
  }

  private func play() {
    guard canAnimate else { return }
    playStartedAt = Date()
  }

  private func canvas(holes: [Hole], scales: [Double]) -> some View {
    Canvas(opaque: false, colorMode: .nonLinear, rendersAsynchronously: true) { context, size in
      let side = min(size.width, size.height)
      let bounds = CGRect(x: (size.width - side) / 2, y: (size.height - side) / 2, width: side, height: side)
      context.clip(to: Path(bounds))
      let path = ShapeGeometry.punched(
        ShapeGeometry.bodyPath(for: configuration.shape), holes: holes, scales: scales, into: bounds)
      let unit = side / 420
      let style = FillStyle(eoFill: true)
      let shadow = GraphicsContext.Shading.color(configuration.shadowColor.swiftUIColor)
      for step in stride(from: configuration.shadowSteps, through: 1, by: -1) {
        let ratio = Double(step) / Double(configuration.shadowSteps)
        var layer = context
        layer.translateBy(x: configuration.shadowX * ratio * unit, y: configuration.shadowY * ratio * unit)
        layer.fill(path, with: shadow, style: style)
      }
      context.fill(path, with: .color(configuration.faceColor.swiftUIColor), style: style)
    }
  }
}

private struct LayoutKey: Hashable, Sendable {
  let shape: HoleyShape
  let count: Int
  let seed: Int
}

private struct LayoutResult {
  let key: LayoutKey
  let holes: [Hole]
}

/// Per-hole timing that mirrors the JavaScript package's CSS animation:
/// scale 1 → 0.06 → 1, with `cubic-bezier(.33, 0, .2, 1)` on each half.
private struct HoleTiming {
  let delay: Double
  let length: Double

  static func make(count: Int, seed: Int, duration: Double) -> [HoleTiming] {
    let milliseconds = duration * 1000
    return (0..<count).map { index in
      let x = Double(index + 1), s = Double(seed)
      let length = (milliseconds * (0.42 + HolePacking.seededNoise(x, 17, s) * 0.16)).rounded() / 1000
      let delay = (milliseconds * (0.04 + HolePacking.seededNoise(x, 43, s) * 0.34)).rounded() / 1000
      return HoleTiming(delay: delay, length: length)
    }
  }

  func scale(at elapsed: Double) -> Double {
    let u = (elapsed - delay) / length
    guard u > 0, u < 1 else { return 1 }
    return u < 0.5 ? 1 - 0.94 * Self.ease(u * 2) : 0.06 + 0.94 * Self.ease(u * 2 - 1)
  }

  private static func ease(_ x: Double) -> Double {
    let (x1, y1, x2, y2) = (0.33, 0.0, 0.2, 1.0)
    func bezier(_ t: Double, _ a: Double, _ b: Double) -> Double {
      3 * (1 - t) * (1 - t) * t * a + 3 * (1 - t) * t * t * b + t * t * t
    }
    var low = 0.0, high = 1.0, t = x
    for _ in 0..<24 {
      t = (low + high) / 2
      if bezier(t, x1, x2) < x { low = t } else { high = t }
    }
    return bezier(t, y1, y2)
  }
}

extension Array where Element == HoleTiming {
  fileprivate var window: Double { map { $0.delay + $0.length }.max() ?? 0 }
}

#endif
