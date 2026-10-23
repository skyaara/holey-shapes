// swift-tools-version: 5.9
import PackageDescription
let package = Package(
  name: "VerifyHoleyShapes",
  platforms: [.macOS(.v13)],
  dependencies: [.package(path: "../../..")],
  targets: [.executableTarget(name: "Verify", dependencies: [.product(name: "HoleyShapes", package: "holey-shapes")])]
)
