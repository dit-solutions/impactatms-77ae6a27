

# Remove Artifact Uploads, Use GitHub Release for APK

## Problem
GitHub Actions artifact storage is full (0.5 GB / 0.5 GB) and not refreshing, blocking builds.

## Solution
- Remove both `upload-artifact` steps (APK and failure logs)
- Replace APK upload with a **GitHub Release** — this uses a different storage quota (Git LFS / Releases, not Actions artifacts), so the APK will still be downloadable
- Keep the existing "Print build logs on failure" step for inline logs in the workflow console

## Changes to `.github/workflows/android-build.yml`

**Remove** lines 82-96 (both `upload-artifact` steps).

**Replace** with a single GitHub Release step:

```yaml
- name: Create GitHub Release with APK
  if: success()
  uses: softprops/action-gh-release@v2
  with:
    tag_name: v${{ env.VERSION }}
    name: ImpactATMS V${{ env.VERSION }}
    files: android/app/build/outputs/apk/debug/ImpactATMS-V${{ env.VERSION }}.apk
    make_latest: true
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

This creates a tagged release with the APK attached — downloadable from the repo's Releases page. No artifact storage consumed.

The "Print build logs on failure" step (lines 98-103) stays as-is for inline failure diagnostics.

| File | Change |
|------|--------|
| `.github/workflows/android-build.yml` | Remove upload-artifact steps, add GitHub Release step |

