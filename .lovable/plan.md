

# Fix OTA Update Check — Two Issues Found

## Problem 1: Stale Published Manifest (Root Cause)

The app fetches `version.json` from `https://impactatms.lovable.app/version.json`. Right now, that URL returns **build 160** (the old version), even though the local file says build 162. This is because the Lovable app hasn't been **re-published** since `version.json` was updated — frontend changes require clicking "Update" in the publish dialog to go live.

**Fix:** You need to click **Publish → Update** in the Lovable editor so the latest `version.json` (build 162) becomes live. This is an operational step, not a code change.

## Problem 2: CI Workflow Creates Indented JSON

In `.github/workflows/android-build.yml` line 105-113, the `cat > public/version.json << EOF` block is indented inside a `run:` step, which means the generated JSON has leading whitespace on every line. While `JSON.parse` usually handles this, it's fragile and could cause issues with some CDN caches or parsers.

**Fix:** Remove the indentation from the heredoc content so the JSON is clean.

## Problem 3: No Auto-Check on App Start

Currently, auto-check only triggers in `AppVersionBadge` when it mounts on the Diagnostics screen. If users never visit Diagnostics, they never see update prompts. There should be an automatic check on app startup (e.g., in `DeviceContext` or `DeviceRouter`).

**Fix:** Add an automatic update check on app launch that shows a toast if an update is available, independent of visiting the Diagnostics page.

## Changes

| File | Change |
|------|--------|
| `.github/workflows/android-build.yml` | Fix heredoc indentation for clean JSON output |
| `src/components/device/DeviceRouter.tsx` | Add auto update check on app startup for native builds |
| **Manual step** | Click Publish → Update to push current `version.json` live |

### Step 1: Fix CI heredoc (`.github/workflows/android-build.yml`)
Replace the indented heredoc block (lines 105-113) with properly formatted JSON — no leading spaces.

### Step 2: Add startup update check (`src/components/device/DeviceRouter.tsx`)
Import and call `checkForUpdates` + `getAppVersion` on mount. If an update is found, show a toast notification prompting the user. This runs once on app launch regardless of which screen the user is on.

