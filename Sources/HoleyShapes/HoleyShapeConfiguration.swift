/// Validated rendering options for a holey shape.
///
/// `duration` is expressed in seconds. Hole counts and rendering values are
/// clamped to the same limits as the JavaScript package.
public struct HoleyShapeConfiguration: Hashable, Sendable {
  public let shape: HoleyShape
  public let faceColor: HoleyColor
  public let shadowColor: HoleyColor
  public let holes: Int
  public let seed: Int
  public let animated: Bool
  public let duration: Double
  public let shadowX: Double
  public let shadowY: Double
  public let shadowSteps: Int

  public init(
    shape: HoleyShape = .disc,
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
    let resolvedFace = faceColor ?? shape.color
    self.shape = shape
    self.faceColor = resolvedFace
    self.shadowColor = shadowColor ?? resolvedFace.darkened()
    self.holes = min(max(holes ?? shape.defaultHoleCount, 0), shape.maximumHoleCount)
    self.seed = min(max(seed, -1_000_000), 1_000_000)
    self.animated = animated
    self.duration = min(max(duration, 0.1), 10)
    self.shadowX = min(max(shadowX, -80), 80)
    self.shadowY = min(max(shadowY, -80), 80)
    self.shadowSteps = min(max(shadowSteps, 1), 32)
  }

  public func shuffled() -> HoleyShapeConfiguration {
    let nextSeed = seed == 1_000_000 ? -1_000_000 : seed + 1
    return HoleyShapeConfiguration(
      shape: shape,
      faceColor: faceColor,
      shadowColor: shadowColor,
      holes: holes,
      seed: nextSeed,
      animated: animated,
      duration: duration,
      shadowX: shadowX,
      shadowY: shadowY,
      shadowSteps: shadowSteps
    )
  }
}
