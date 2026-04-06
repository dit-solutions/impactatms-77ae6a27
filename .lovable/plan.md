

# Fix: OTA Update Check + App Version Display

## Problems Found

1. **`public/version.json` is stuck at build 101** — The CI workflow creates GitHub releases but never updates `version.json`. So when the app fetches `https://impactatms.lovable.app/version.json`, it still shows build 101. If the installed APK is build 156+, the comparison `101 > 156` is false, so "no update available."

2. **App version may show wrong** — `App.getInfo()` from `@capacitor/app` should return the real native version, but if it throws (plugin not registered, etc.), the catch block silently falls back to `1.0.0 (web)`. No feedback is shown to the user.

## Fix

### 1. CI Workflow: Auto-update `version.json` on every release

Add a step in `.github/workflows/android-build.yml` that:
- Updates `public/version.json` with the new build number, version, and download URL
- Commits and pushes it back to the repo
- This ensures the published app at `impactatms.lovable.app` always serves the latest manifest after you click "Publish"

### 2. Update `version.json` now to the latest build

Set it to the current latest release (you said 156+, so we'll point to the newest release). You'll need to publish the app afterward for it to go live.

### 3. Add error feedback for update check

In the `checkUpdate` function, show a toast on success ("You're up to date") or failure, so tapping "Check for updates" gives visible feedback instead of silently doing nothing.

## File Changes

| File | Change |
|------|--------|
| `.github/workflows/android-build.yml` | Add step to update `public/version.json` and push commit after release |
| `public/version.json` | Update to latest build number (will ask you for the exact number) |
| `src/hooks/use-app-version.ts` | Add toast feedback: "Up to date" when no update found, error toast on failure |
| `src/components/app/AppVersionBadge.tsx` | Show "Up to date ✓" text after successful check with no update |

## Important Note

After CI pushes the updated `version.json`, you must **Publish** the app in Lovable so the live URL (`impactatms.lovable.app/version.json`) serves the new manifest. The native app fetches from that URL.

