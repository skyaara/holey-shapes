# Contributing to Holey Shapes

Thanks for helping improve the project. Bug reports, documentation fixes, examples, and code changes are welcome.

## Before changing code

Open an issue for a larger change so the public APIs and behavior can be discussed first. For a focused fix, a pull request is fine. Include a small reproduction for bugs and note which platform is affected: JavaScript, Swift, Android, or the website.

## Local setup

- Install Node.js 20.19 or newer, then run `npm ci` in `web/`. The published package itself supports Node.js 18 and newer.
- Run `npm run dev` from `web/` for the website.
- Run `npm run build` in `web/`. Run `npm test` and `npm pack --dry-run` in `packages/js/`; the pack command shows exactly what the JavaScript package would include.
- For browser mounting checks, open `/tests/browser.html` in the local Vite server.

For Swift work, use `swift build` from the repository root and the verification command in the [README](README.md#generate-layouts-in-swift-and-jvm-processes). For Android and Kotlin work, run `./gradlew :core:verifyPacking test assembleRelease lintRelease` from `packages/android/`. Android builds require a local Android SDK; `local.properties` is ignored by Git.

## Reporting security issues

Please report vulnerabilities privately as described in [SECURITY.md](SECURITY.md), not in a public issue.

## Project boundaries

- JavaScript package code and tests are in `packages/js/`. Keep `index.d.ts` in sync with public API changes.
- Swift package code is in `packages/swift/Sources/HoleyShapes/`. The Android library is in `packages/android/src/`, and its platform-independent Kotlin core is in `packages/android/core/`.
- Website code and assets live in `web/`. Changes to the website do not need to become package exports.
- `web/dist/`, build directories, and `artifacts/` are generated outputs. Regenerate them locally instead of adding them to a pull request.

Keep changes focused, add tests for behavior changes, and describe how you checked them. Do not include credentials or personal configuration in commits.
