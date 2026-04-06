

# Fix: OTA Update Not Working in Kiosk Mode

## Root Cause (Multiple Issues)

1. **`window.open(url, '_system')` doesn't work in Capacitor** — This is not a valid Capacitor API. It silently fails or gets blocked by kiosk mode's lock task.

2. **Missing `REQUEST_INSTALL_PACKAGES` permission** — Android 8+ requires this permission to install APKs from unknown sources.

3. **GitHub release URL may require authentication** — The repo `dit-solutions/impactatms-77ae6a27` appears to be private. The APK download URL won't work without auth headers.

4. **No native download + install logic** — Currently just tries to open a URL. Need a native plugin that actually downloads the APK file and triggers Android's package installer intent via FileProvider.

## Solution

Build a native **AppUpdatePlugin** (Java) that:
- Downloads the APK to internal storage using `DownloadManager`
- Triggers the Android package installer intent via `FileProvider`
- Works inside kiosk/lock task mode

### Changes

**1. `AndroidManifest.xml`** — Add permissions:
```xml
<uses-permission android:name="android.permission.REQUEST_INSTALL_PACKAGES" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" android:maxSdkVersion="28" />
```

**2. New: `android/app/src/main/java/com/impactatms/app/AppUpdatePlugin.java`**
- Capacitor plugin with a `downloadAndInstall(url)` method
- Uses `DownloadManager` to download the APK to app's cache directory
- Listens for download completion via `BroadcastReceiver`
- Creates an install intent using `FileProvider` (already configured)
- Temporarily stops lock task before launching installer, re-enters after

**3. `MainActivity.java`**
- Register `AppUpdatePlugin` alongside existing plugins
- Add helper method to temporarily exit/re-enter lock task for the install flow

**4. `src/services/app-update/app-update-service.ts`**
- Replace `window.open(url, '_system')` with a call to the native `AppUpdatePlugin.downloadAndInstall()` via Capacitor bridge
- Add fallback for web environment

**5. Re: Private GitHub repo** — The download URL points to a private GitHub repo. Two options:
  - Make releases public (simplest)
  - Or pass a GitHub token in the download request (the plugin would need to add an `Authorization` header)

## File Summary

| File | Change |
|------|--------|
| `AndroidManifest.xml` | Add `REQUEST_INSTALL_PACKAGES` permission |
| `AppUpdatePlugin.java` (new) | Native plugin: download APK + trigger install intent via FileProvider |
| `MainActivity.java` | Register `AppUpdatePlugin`, add lock task pause/resume helpers |
| `app-update-service.ts` | Call native plugin instead of `window.open` |
| `file_paths.xml` | Ensure cache-path is included (already present) |

