# Contributing to Holey Shapes

Thanks for helping improve the project. Bug reports, documentation fixes, examples, and code changes are welcome. Everyone taking part agrees to the [code of conduct](CODE_OF_CONDUCT.md).

## Before changing code

Open an issue for a larger change so the public APIs and behavior can be discussed first. For a focused fix, a pull request is fine. Include a small reproduction for bugs and note which platform is affected: JavaScript, Rust, Swift, or Android. Website issues are welcome too, but its source is not in this repository.

## Local setup

- Install Node.js 20 or newer. The published package itself supports Node.js 18 and newer and has no dependencies, so there is nothing to install.
- Run `npm test` and `npm pack --dry-run` in `packages/js/`; the pack command shows exactly what the JavaScript package would include.
- If you change seeding or color, run `node scripts/seeding-vectors.mjs` and commit the updated `packages/seeding-vectors.tsv`. The Swift and Kotlin checks read the same file, so all three platforms must agree.

For Rust work, run `cargo fmt --check`, `cargo clippy --all-targets -- -D warnings` and `cargo test --release` in `packages/rust/`. If you change JavaScript output, run `node scripts/rust-fixtures.mjs` and commit the updated fixtures, since the Rust tests compare against them byte for byte.

For Swift work, use `swift build` from the repository root and the verification command in the [reference](docs/REFERENCE.md#generate-layouts-in-swift-and-jvm-processes). For Android and Kotlin work, run `./gradlew :core:verifyPacking test assembleRelease lintRelease` from `packages/android/`. Android builds require a local Android SDK; `local.properties` is ignored by Git.

## Pull requests

`main` is protected: changes land through pull requests, with a linear history. CI runs the JavaScript, Rust, Swift and Android checks on every pull request.

## Releases

Maintainers release with one tag; see [RELEASING.md](RELEASING.md).

## Reporting security issues

Please report vulnerabilities privately as described in [SECURITY.md](SECURITY.md), not in a public issue.

## Project boundaries

- JavaScript package code and tests are in `packages/js/`. Keep `index.d.ts` in sync with public API changes.
- The Rust crate is in `packages/rust/`; its tests read `packages/seeding-vectors.tsv` and fixtures generated from the JavaScript package.
- Swift package code is in `packages/swift/Sources/HoleyShapes/`. The Android library is in `packages/android/src/`, and its platform-independent Kotlin core is in `packages/android/core/`.
- Build directories and `artifacts/` are generated outputs. Regenerate them locally instead of adding them to a pull request.

Keep changes focused, add tests for behavior changes, and describe how you checked them. Do not include credentials or personal configuration in commits.
