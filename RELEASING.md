# Releasing

One tag releases every package. npm and crates.io are published by CI, and Swift Package Manager and JitPack build straight from the tag.

## Release steps

1. Set the version everywhere it is written down:

   ```sh
   node scripts/set-version.mjs 2.1.0
   ```

2. Rename `## Unreleased` in `CHANGELOG.md` to the new version.
3. Commit, push to `main` and wait for CI to pass.
4. Tag and push:

   ```sh
   git tag v2.1.0
   git push origin v2.1.0
   ```

The [Release workflow](.github/workflows/release.yml) then reruns CI and checks that the tag matches `packages/js/package.json`. It publishes `holey-shapes` to npm with provenance, creates the GitHub release from the changelog section and asks JitPack to build. A separate job checks that the tag matches `packages/rust/Cargo.toml` and publishes the crate to crates.io.

| Platform | Where it comes from | Install |
| --- | --- | --- |
| npm | Release workflow | `npm i holey-shapes` |
| crates.io | Release workflow | `holey-shapes = "2.1.0"` |
| Swift Package Manager | the `v2.1.0` tag | `.package(url: "https://github.com/skyaara/holey-shapes.git", from: "2.1.0")` |
| Android (JitPack) | the `v2.1.0` tag, built with `jitpack.yml` | `com.github.skyaara:holey-shapes:v2.1.0` |
| Kotlin JVM (JitPack) | same build | `com.github.skyaara.holey-shapes:holey-shapes-core:v2.1.0` |

## One-time setup

- **npm trusted publishing.** On npmjs.com, open the `holey-shapes` package settings and add a trusted publisher: GitHub Actions, repository `skyaara/holey-shapes`, workflow `release.yml`. No npm token is stored in the repository.
- **crates.io trusted publishing.** Trusted publishing only applies to a crate that already exists, so publish the first version by hand: `cargo login`, then `cargo publish` in `packages/rust/`. Then, on crates.io, open the `holey-shapes` crate settings and add a trusted publisher: GitHub, repository `skyaara/holey-shapes`, workflow `release.yml`. No crates.io token is stored in the repository.
- **Tag protection.** Release tags `v*.*.*` are protected by a repository ruleset: they cannot be moved or deleted once pushed.
