# Releasing

One tag releases every package. npm is published by CI, Swift Package Manager and JitPack build straight from the tag, and the website deploys on every push to `main`.

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

The [Release workflow](.github/workflows/release.yml) then reruns CI and checks that the tag matches `packages/js/package.json`. It publishes `holey-shapes` to npm with provenance, creates the GitHub release from the changelog section and asks JitPack to build.

| Platform | Where it comes from | Install |
| --- | --- | --- |
| npm | Release workflow | `npm i holey-shapes` |
| Swift Package Manager | the `v2.1.0` tag | `.package(url: "https://github.com/skyaara/holey-shapes.git", from: "2.1.0")` |
| Android (JitPack) | the `v2.1.0` tag, built with `jitpack.yml` | `com.github.skyaara:holey-shapes:v2.1.0` |
| Kotlin JVM (JitPack) | same build | `com.github.skyaara.holey-shapes:holey-shapes-core:v2.1.0` |

## One-time setup

- **npm trusted publishing.** On npmjs.com, open the `holey-shapes` package settings and add a trusted publisher: GitHub Actions, repository `skyaara/holey-shapes`, workflow `release.yml`. No npm token is stored in the repository.
- **Cloudflare Pages.** Add the repository secrets `CLOUDFLARE_API_TOKEN` (a token with the *Cloudflare Pages: Edit* permission) and `CLOUDFLARE_ACCOUNT_ID`. The [Deploy workflow](.github/workflows/deploy.yml) uploads `web/dist` and `web/functions` to the `holey-shapes` Pages project.

## Website

The site is a static Vite build plus two Pages Functions for share links:

- `/@handle` serves the home page with Open Graph and X card tags for that handle.
- `/og/@handle.png` renders the 1200×630 preview card with resvg and caches it at the edge.

Run `npm run pages:dev` in `web/` to try both locally in the Cloudflare runtime, or `npm run deploy` to deploy by hand with Wrangler. When the card design changes, bump `CARD_VERSION` in `web/server/card.js`.
