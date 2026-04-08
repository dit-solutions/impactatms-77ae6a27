
What’s happening now

- Under the current code, `1.0.158` is treated as the app version because Android is set to:
  - `versionCode = GITHUB_RUN_NUMBER`
  - `versionName = "1.0.${GITHUB_RUN_NUMBER}"`
- So yes: with the current setup, build 158 will display as `1.0.158`.
- But you are also correct that this is not proper semantic versioning. Right now the build counter is being used like the patch version.

Why this is confusing

- `android/app/build.gradle` makes the displayed version depend on the CI run number.
- `.github/workflows/android-build.yml` writes the same value into `public/version.json`.
- `package.json` is still `0.0.0`, so there is no real “source of truth” for semantic versions.
- For local/manual builds, `build.gradle` falls back to a timestamp if `GITHUB_RUN_NUMBER` is missing, which can make the installed APK version look wrong and can also confuse OTA update comparisons.

Recommended fix

1. Separate semantic version from build number
   - Semantic version: `MAJOR.MINOR.PATCH` (example `1.2.3`)
   - Build number: monotonically increasing internal number (example `158`)
   - UI should show: `v1.2.3 (Build 158)`

2. Create one source of truth for semantic version
   - Recommended: use `package.json.version` or a dedicated `app-version.json`
   - Example:
     ```text
     SemVer = 1.0.2
     Build = 158
     Display = v1.0.2 (Build 158)
     ```

3. Update Android versioning
   - `versionName` should come from the semantic version source
   - `versionCode` should remain the numeric build number for Android updates
   - Remove the current `1.0.${build}` pattern

4. Update OTA manifest and release naming
   - `public/version.json` should keep both fields separately:
     - `"version": "1.0.2"`
     - `"build": 158`
   - CI should read semantic version from the source file, then inject the current build number
   - Release filenames/tags can include both, e.g. `ImpactATMS-v1.0.2-b158.apk`

5. Fix the app’s displayed version state
   - Keep using `App.getInfo()` for native values
   - Improve fallback behavior so it does not silently pretend to be `1.0.0 (web)` when native version lookup fails
   - Optionally show a clearer label for local/debug builds so they are not mistaken for release builds

6. Prevent local/manual build confusion
   - Stop using timestamp as the visible app version
   - Either:
     - require an explicit build number for manually installed release APKs, or
     - mark local builds clearly as non-release so OTA logic does not compare them like production builds

Files to update

| File | Change |
|------|--------|
| `android/app/build.gradle` | Split `versionName` (semver) from `versionCode` (build number) |
| `package.json` or new `app-version.json` | Add real semantic version source |
| `.github/workflows/android-build.yml` | Read semver from source, keep build from CI run number, generate proper release names + manifest |
| `public/version.json` | Store semver and build separately |
| `src/services/app-update/app-update-service.ts` | Keep OTA comparison based on build number only |
| `src/hooks/use-app-version.ts` | Improve version load/fallback handling |
| `src/components/app/AppVersionBadge.tsx` | Show `vX.Y.Z (Build N)` clearly |

Expected result

- Big changes: bump major, e.g. `2.0.0`
- New features: bump minor, e.g. `1.1.0`
- Bug fixes: bump patch, e.g. `1.1.1`
- CI release/build counter stays separate, e.g. `Build 158`

So the short answer is:

- Under the current codebase, `1.0.158` is “correct” for build 158.
- But from a versioning standards perspective, it is not correct semver.
- The proper fix is to separate semantic versioning from build numbering across Android, OTA manifest, CI, and the UI.
