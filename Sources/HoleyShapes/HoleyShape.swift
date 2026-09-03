/// Every shape included in the original `holey-shapes` catalog.
public enum HoleyShape: String, CaseIterable, Identifiable, Sendable {
  case disc
  case roundBlock = "round-block"
  case hex
  case capsule
  case prism
  case cross
  case triangle
  case diamond
  case sunburst
  case octagon
  case chevron
  case longBar = "long-bar"
  case flowerStar = "flower-star"
  case flower
  case bowtie

  public var id: String { rawValue }

  public var name: String {
    switch self {
    case .disc: "Perforated disc"
    case .roundBlock: "Round block"
    case .hex: "Hex slab"
    case .capsule: "Capsule"
    case .prism: "Cut prism"
    case .cross: "Cross block"
    case .triangle: "Triangle plate"
    case .diamond: "Diamond tile"
    case .sunburst: "Sunburst slab"
    case .octagon: "Octagon"
    case .chevron: "Bent chevron"
    case .longBar: "Long bar"
    case .flowerStar: "Five-point bloom"
    case .flower: "Daisy flower"
    case .bowtie: "Bowtie slab"
    }
  }

  public var color: HoleyColor {
    switch self {
    case .disc: HoleyColor(red: 0x63, green: 0x37, blue: 0xFF)
    case .roundBlock: HoleyColor(red: 0x9B, green: 0xED, blue: 0x00)
    case .hex: HoleyColor(red: 0xFF, green: 0x08, blue: 0x78)
    case .capsule: HoleyColor(red: 0x28, green: 0x78, blue: 0xFF)
    case .prism: HoleyColor(red: 0xFF, green: 0x6A, blue: 0x00)
    case .cross: HoleyColor(red: 0x00, green: 0xDB, blue: 0xFF)
    case .triangle: HoleyColor(red: 0x00, green: 0xD6, blue: 0x9F)
    case .diamond: HoleyColor(red: 0xFF, green: 0xD0, blue: 0x00)
    case .sunburst: HoleyColor(red: 0xB9, green: 0x4C, blue: 0xFF)
    case .octagon: HoleyColor(red: 0xFF, green: 0x38, blue: 0x38)
    case .chevron: HoleyColor(red: 0x00, green: 0xC9, blue: 0xF2)
    case .longBar: HoleyColor(red: 0xFF, green: 0x4F, blue: 0xA3)
    case .flowerStar: HoleyColor(red: 0xFF, green: 0x76, blue: 0x57)
    case .flower: HoleyColor(red: 0xC9, green: 0x4D, blue: 0xFF)
    case .bowtie: HoleyColor(red: 0x00, green: 0xD7, blue: 0xB9)
    }
  }

  public var backgroundColor: HoleyColor {
    switch self {
    case .disc: HoleyColor(red: 0xD7, green: 0xCE, blue: 0xFF)
    case .roundBlock: HoleyColor(red: 0xE7, green: 0xFF, blue: 0x92)
    case .hex: HoleyColor(red: 0xFF, green: 0xD6, blue: 0xE4)
    case .capsule: HoleyColor(red: 0xCC, green: 0xED, blue: 0xFF)
    case .prism: HoleyColor(red: 0xFF, green: 0xD4, blue: 0xA3)
    case .cross: HoleyColor(red: 0xD8, green: 0xD5, blue: 0xCF)
    case .triangle: HoleyColor(red: 0xB9, green: 0xF4, blue: 0xDF)
    case .diamond: HoleyColor(red: 0xFF, green: 0xF0, blue: 0xA6)
    case .sunburst: HoleyColor(red: 0xE6, green: 0xD4, blue: 0xFA)
    case .octagon: HoleyColor(red: 0xFF, green: 0xD0, blue: 0xC8)
    case .chevron: HoleyColor(red: 0xC9, green: 0xF3, blue: 0xFF)
    case .longBar: HoleyColor(red: 0xFF, green: 0xE0, blue: 0xEE)
    case .flowerStar: HoleyColor(red: 0xFF, green: 0xE1, blue: 0xD8)
    case .flower: HoleyColor(red: 0xF2, green: 0xD8, blue: 0xFF)
    case .bowtie: HoleyColor(red: 0xD0, green: 0xF7, blue: 0xF0)
    }
  }

  public var defaultHoleCount: Int {
    switch self {
    case .disc, .hex, .cross, .diamond, .sunburst, .longBar, .flowerStar: 5
    case .roundBlock, .capsule, .prism, .triangle, .chevron: 4
    case .octagon, .flower, .bowtie: 6
    }
  }

  public var maximumHoleCount: Int {
    8
  }
}

public struct HoleyShapeInfo: Hashable, Identifiable, Sendable {
  public let shape: HoleyShape
  public let name: String
  public let color: HoleyColor

  public var id: String { shape.rawValue }
}

public enum HoleyShapes {
  public static let catalog: [HoleyShapeInfo] = HoleyShape.allCases.map {
    HoleyShapeInfo(shape: $0, name: $0.name, color: $0.color)
  }
}
