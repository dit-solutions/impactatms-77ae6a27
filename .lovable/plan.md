

# Fix: Remove Redundant Artifact Uploads to Unblock CI

## Why this is safe

The APK download flow is: GitHub Release → `version.json` downloadUrl → user installs APK. This path uses `softprops/action-gh-release`, which is **not** being removed. The `upload-artifact` step is a separate, redundant copy that counts against GitHub's Actions artifact storage quota (different from Releases storage).

## Changes

**File: `.github/workflows/android-build.yml`**

1. **Remove "Upload APK" step** (lines using `actions/upload-artifact@v4` for the APK) — redundant with the GitHub Release
2. **Remove "Upload build logs on failure" step** — also uses `upload-artifact` and hits the same quota
3. **Add inline failure logging** instead:
   ```yaml
   - name: Print build logs on failure
     if: failure()
     run: |
       echo "=== Build failure logs ==="
       cat android/app/build/outputs/logs/*.txt 2>/dev/null || true
       find android/app/build/reports -name "*.html" -exec echo "Report: {}" \; 2>/dev/null || true
   ```

## What stays the same

- GitHub Release with APK attached — **kept**
- `version.json` manifest update — **kept**
- OTA update flow — **unaffected**
- All APK download links — **still work**

## Files changed

| File | Change |
|------|--------|
| `.github/workflows/android-build.yml` | Remove 2 `upload-artifact` steps, add inline log printing |

