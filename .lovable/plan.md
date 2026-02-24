

# Fix: Add Camera Permission for QR Scanning

## Problem
The Android manifest is missing the `CAMERA` permission. Without it, the WebView inside Capacitor silently denies camera access — no prompt is shown, and the app immediately displays "Camera access denied."

## Solution
Two changes:

### 1. `android/app/src/main/AndroidManifest.xml`
Add the camera permission and feature declaration:
```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-feature android:name="android.hardware.camera" android:required="false" />
```

### 2. `src/pages/ProvisioningScreen.tsx`
Improve the error message to distinguish between "permission denied" and other camera failures, and add a retry hint so the user knows they can tap the button again after granting permission in Android settings.

After this change, you will need to run `npx cap sync` on the device to pick up the updated manifest.

