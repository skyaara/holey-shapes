import Foundation
import SwiftUI

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
    guard value.count == 6, let rgb = UInt32(value, radix: 16) else { return nil }
    self.init(
      red: UInt8((rgb >> 16) & 0xff),
      green: UInt8((rgb >> 8) & 0xff),
      blue: UInt8(rgb & 0xff)
    )
  }

  public var hex: String {
    String(format: "#%02X%02X%02X", red, green, blue)
  }

  public var swiftUIColor: Color {
    Color(
      red: Double(red) / 255,
      green: Double(green) / 255,
      blue: Double(blue) / 255
    )
  }

  func darkened(by factor: Double = 0.52) -> HoleyColor {
    func channel(_ value: UInt8) -> UInt8 {
      UInt8((Double(value) * factor).rounded())
    }
    return HoleyColor(red: channel(red), green: channel(green), blue: channel(blue))
  }
}
