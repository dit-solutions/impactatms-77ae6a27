

# Fix: Camera Permission Blocked by Kiosk Lock Task Mode

## Root Cause

`startLockTask()` in `MainActivity.java` suppresses Android system dialogs — including the camera permission prompt. When the user taps "Open Camera," the `Html5Qrcode` library requests camera access, but Android silently blocks the permission dialog, so nothing happens and no error is thrown.

## Fix

### `MainActivity.java`

Request the camera permission **before** entering lock task mode. Add a runtime permission check in `onCreate()`:

```text
Flow:
1. onCreate() → check if CAMERA permission is granted
2. If NOT granted → request it (dialog appears before lock task)
3. After permission result (or if already granted) → startLockTask()
```

This ensures the permission dialog shows while the app is not yet pinned.

- Move `startLockTask()` out of `onCreate()` into `onPermissionResult()`
- Add `ActivityCompat.requestPermissions(this, {CAMERA}, REQUEST_CODE)` before lock task
- Override `onRequestPermissionsResult()` — call `startLockTask()` after permission is handled (granted or denied)
- If permission is already granted, call `startLockTask()` immediately

### No other files change

The web layer (`ProvisioningScreen.tsx`), manifest permissions, and everything else remain untouched.

## Files Changed

| File | Change |
|------|--------|
| `MainActivity.java` | Request CAMERA permission before `startLockTask()`, enter kiosk only after permission result |

