// swift-tools-version: 5.9

import PackageDescription

let package = Package(
  name: "HoleyShapes",
  platforms: [
    .iOS(.v16),
    .macOS(.v13),
    .tvOS(.v16),
    .visionOS(.v1),
  ],
  products: [
    .library(name: "HoleyShapes", targets: ["HoleyShapes"])
  ],
  targets: [
    .target(name: "HoleyShapes")
  ]
)
