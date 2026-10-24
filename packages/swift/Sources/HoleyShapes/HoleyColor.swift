import Foundation
#if canImport(SwiftUI)
import SwiftUI
#endif

/// A portable RGB color used by ``HoleyShapeView``.
public struct HoleyColor: Hashable, Sendable {
  public let red: UInt8
  public let green: UInt8
  public let blue: UInt8

  public init(red: UInt8, green: UInt8, blue: UInt8) {
    self.red = red
    self.green = green
    self.blue = blue
  }

  /// Creates a color from a six-digit RGB value such as `#6337FF`.
  public init?(hex: String) {
    let value = hex.hasPrefix("#") ? String(hex.dropFirst()) : hex
    guard value.count == 6, value.allSatisfy(\.isHexDigit), let rgb = UInt32(value, radix: 16) else {
      return nil
    }
    self.init(
      red: UInt8((rgb >> 16) & 0xff),
      green: UInt8((rgb >> 8) & 0xff),
      blue: UInt8(rgb & 0xff)
    )
  }

  public var hex: String {
    String(format: "#%02X%02X%02X", red, green, blue)
  }

  #if canImport(SwiftUI)
  public var swiftUIColor: Color {
    Color(
      red: Double(red) / 255,
      green: Double(green) / 255,
      blue: Double(blue) / 255
    )
  }

  #endif

  /// The face color for a hue in degrees, chosen in OKLCH so every hue looks
  /// equally bright. Matches `hueColor` in the JavaScript package.
  public init(hue: Double) {
    let distance = abs((((hue - 100).truncatingRemainder(dividingBy: 360) + 540).truncatingRemainder(dividingBy: 360)) - 180)
    let lift = distance < 60 ? pow(cos((distance / 60) * (Double.pi / 2)), 2) : 0
    let angle = hue * Double.pi / 180
    self = OKLab.color(lightness: 0.74 + 0.12 * lift, a: 0.19 * cos(angle), b: 0.19 * sin(angle))
  }

  /// The extrusion color for this face: the same hue at 56% of its OKLCH
  /// lightness and 70% of its chroma. Every platform darkens faces this way.
  public var extrusionColor: HoleyColor {
    let (r, g, b) = (OKLab.toLinear(red), OKLab.toLinear(green), OKLab.toLinear(blue))
    let l = cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
    let m = cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
    let s = cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
    let lightness = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s
    let a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s
    let bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
    return OKLab.color(lightness: lightness * 0.56, a: a * 0.7, b: bb * 0.7)
  }
}

/// OKLab conversions shared with the JavaScript and Kotlin packages. The steps
/// mirror `color.js` exactly so all platforms round to the same hex values.
private enum OKLab {
  static func toLinear(_ channel: UInt8) -> Double {
    let c = Double(channel) / 255
    return c <= 0.04045 ? c / 12.92 : pow((c + 0.055) / 1.055, 2.4)
  }

  private static func toGamma(_ c: Double) -> Double {
    c <= 0.0031308 ? 12.92 * c : 1.055 * pow(c, 1 / 2.4) - 0.055
  }

  private static func toLinearRGB(_ lightness: Double, _ a: Double, _ b: Double) -> (Double, Double, Double) {
    let l = lightness + 0.3963377774 * a + 0.2158037573 * b
    let m = lightness - 0.1055613458 * a - 0.0638541728 * b
    let s = lightness - 0.0894841775 * a - 1.291485548 * b
    let (l3, m3, s3) = (l * l * l, m * m * m, s * s * s)
    return (
      4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3,
      -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3,
      -0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3
    )
  }

  private static func inGamut(_ rgb: (Double, Double, Double)) -> Bool {
    [rgb.0, rgb.1, rgb.2].allSatisfy { $0 >= -0.0001 && $0 <= 1.0001 }
  }

  private static func color(_ rgb: (Double, Double, Double)) -> HoleyColor {
    func channel(_ value: Double) -> UInt8 {
      UInt8((toGamma(min(1, max(0, value))) * 255 + 0.5).rounded(.down))
    }
    return HoleyColor(red: channel(rgb.0), green: channel(rgb.1), blue: channel(rgb.2))
  }

  /// Keeps lightness and hue, and reduces chroma until the color fits in sRGB.
  static func color(lightness: Double, a: Double, b: Double) -> HoleyColor {
    let full = toLinearRGB(lightness, a, b)
    if inGamut(full) { return color(full) }
    var low = 0.0, high = 1.0
    for _ in 0..<24 {
      let mid = (low + high) / 2
      if inGamut(toLinearRGB(lightness, a * mid, b * mid)) { low = mid } else { high = mid }
    }
    return color(toLinearRGB(lightness, a * low, b * low))
  }
}
