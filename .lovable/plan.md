

# Trigger New CI Build

## Context

The back button fix (DeviceRouter.tsx) and physical trigger gun integration (rfid-service, use-rfid-reader) are **already committed** to the codebase. The GitHub Actions builds failed only at the artifact upload step — the code itself is fine.

## What needs to happen

A small commit to trigger a fresh CI build now that you've cleared the artifact storage. The simplest approach: add the `upload-artifact` steps back with your preferred retention settings, which also serves as the code change that triggers the build.

## Changes

**File: `.github/workflows/android-build.yml`**

Add two steps after the "Rename APK with version" step (before the failure logging step):

```yaml
- name: Upload APK
  if: success()
  uses: actions/upload-artifact@v4
  with:
    name: ImpactATMS-V${{ env.VERSION }}
    path: android/app/build/outputs/apk/debug/ImpactATMS-V${{ env.VERSION }}.apk
    retention-days: 7

- name: Upload build logs on failure
  if: failure()
  uses: actions/upload-artifact@v4
  with:
    name: build-logs-${{ github.run_number }}
    path: android/**/build/reports/**
    retention-days: 2
```

## Result

- This commit triggers a new build that includes all your previous changes (back button, trigger gun)
- APK artifacts auto-expire in 7 days to prevent future quota issues
- Build logs kept for 2 days only

| File | Change |
|------|--------|
| `.github/workflows/android-build.yml` | Re-add upload-artifact steps with 7-day and 2-day retention |

