/// Validated rendering options for a holey shape.
///
/// `duration` is expressed in seconds. Hole counts and rendering values are
/// clamped to the same limits as the JavaScript package. `turn` rotates the face
/// by quarter turns and `mirrored` flips it; the extrusion keeps its direction.
public struct HoleyShapeConfiguration: Hashable, Sendable {
  public let shape: HoleyShape
  public let faceColor: HoleyColor
  public let shadowColor: HoleyColor
  public let holes: Int
  public let seed: Int
  public let turn: Int
  public let mirrored: Bool
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
    turn: Int = 0,
    mirrored: Bool = false,
    animated: Bool = true,
    duration: Double = 0.9,
    shadowX: Double = 18,
    shadowY: Double = 21,
    shadowSteps: Int = 12
  ) {
    let resolvedFace = faceColor ?? shape.color
    self.shape = shape
    self.faceColor = resolvedFace
    self.shadowColor = shadowColor ?? resolvedFace.extrusionColor
    self.holes = min(max(holes ?? shape.defaultHoleCount, 0), shape.maximumHoleCount)
    self.seed = min(max(seed, -1_000_000), 1_000_000)
    // Nearest quarter turn, rounding halves up as JavaScript's Math.round does.
    let quarters = Int((Double(min(max(turn, -36_000), 36_000)) / 90 + 0.5).rounded(.down))
    self.turn = (quarters % 4 + 4) % 4 * 90
    self.mirrored = mirrored
    self.animated = animated
    self.duration = duration.isFinite ? min(max(duration, 0.1), 10) : 0.9
    self.shadowX = shadowX.isFinite ? min(max(shadowX, -80), 80) : 18
    self.shadowY = shadowY.isFinite ? min(max(shadowY, -80), 80) : 21
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
      turn: turn,
      mirrored: mirrored,
      animated: animated,
      duration: duration,
      shadowX: shadowX,
      shadowY: shadowY,
      shadowSteps: shadowSteps
    )
  }

  /// FNV-1a 64 hash of the UTF-8 identity as 16 lowercase hex digits, matching
  /// `identityHash` in the JavaScript package. `seeded(_:)` starts from it.
  public static func identityHash(_ identity: String) -> String {
    let hex = String(fnv1a64(identity), radix: 16)
    return String(repeating: "0", count: 16 - hex.count) + hex
  }

  private static func fnv1a64(_ identity: String) -> UInt64 {
    var hash: UInt64 = 14_695_981_039_346_656_037
    for byte in identity.utf8 {
      hash ^= UInt64(byte)
      hash &*= 1_099_511_628_211
    }
    return hash
  }

  /// Creates a stable holey for an identity such as a user ID, matching
  /// `seededHoleyOptions` in the JavaScript package. The identity hash is mixed
  /// once and read as mixed-radix digits, so every field gets its own bits.
  public static func seeded(_ identity: String, animated: Bool = true) -> HoleyShapeConfiguration {
    var rest = SplitMix64.mix(fnv1a64(identity))
    func take(_ count: Int) -> Int {
      let digit = Int(rest % UInt64(count))
      rest /= UInt64(count)
      return digit
    }
    let shape = HoleyShape.allCases[take(HoleyShape.allCases.count)]
    let fewest = max(2, shape.defaultHoleCount - 1)
    let most = min(shape.maximumHoleCount, shape.defaultHoleCount + 1)
    let holes = fewest + take(most - fewest + 1)
    let turn = take(4) * 90
    let mirrored = take(2) == 1
    let face = HoleyColor(hue: Double(take(3600)) / 10)
    let seed = take(1_000_001)
    return HoleyShapeConfiguration(
      shape: shape, faceColor: face, holes: holes, seed: seed, turn: turn, mirrored: mirrored, animated: animated)
  }
}

private enum SplitMix64 {
  /// The SplitMix64 finalizer: a bijection on 64-bit values.
  static func mix(_ input: UInt64) -> UInt64 {
    var value = input
    value = (value ^ (value >> 30)) &* 0xBF58_476D_1CE4_E5B9
    value = (value ^ (value >> 27)) &* 0x94D0_49BB_1331_11EB
    return value ^ (value >> 31)
  }
}
