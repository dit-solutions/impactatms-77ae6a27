

# Kiosk Mode Implementation

## Overview

Lock the Android device so it runs only the Impact ATMS app — full screen, auto-launch on boot, screen always on, no escape except a hidden admin gesture (10 taps on "About" section in Device settings).

## Changes

### 1. `MainActivity.java` — Lock Task Mode + Immersive + Keep Screen On

```java
// In onCreate, after super:
startLockTask();                          // Pin the app (kiosk)
getWindow().addFlags(FLAG_KEEP_SCREEN_ON); // Prevent screen sleep

// Immersive sticky mode:
getWindow().getDecorView().setSystemUiVisibility(
    SYSTEM_UI_FLAG_IMMERSIVE_STICKY | SYSTEM_UI_FLAG_FULLSCREEN 
    | SYSTEM_UI_FLAG_HIDE_NAVIGATION | SYSTEM_UI_FLAG_LAYOUT_STABLE
    | SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION | SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
);

// Re-apply immersive on focus change via onWindowFocusChanged
```

Add `stopLockTask()` method callable from a Capacitor plugin bridge so the admin escape can unlock.

### 2. `AdminEscapePlugin.java` — New Capacitor plugin

Simple plugin with one method `exitKiosk()` that calls `activity.stopLockTask()`. Called from the web layer after admin 10-tap verification.

### 3. `AndroidManifest.xml`

- Add `RECEIVE_BOOT_COMPLETED` and `FOREGROUND_SERVICE` permissions
- Register `BootReceiver` broadcast receiver for `BOOT_COMPLETED`
- Add `android:lockTaskMode="if_whitelisted"` to the activity (allows device owner to whitelist; falls back to screen pinning otherwise)

### 4. `BootReceiver.java` — Auto-launch after reboot

```java
public class BootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        if (Intent.ACTION_BOOT_COMPLETED.equals(intent.getAction())) {
            Intent i = new Intent(context, MainActivity.class);
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(i);
        }
    }
}
```

### 5. `DiagnosticsScreen.tsx` — Hidden 10-tap admin escape

Add a tap counter on the "About" card header. After 10 rapid taps (within 3 seconds), show an AlertDialog confirming "Exit Kiosk Mode?". On confirm, call `AdminEscapePlugin.exitKiosk()` via Capacitor bridge.

### 6. `src/services/admin-escape-plugin.ts` — Capacitor plugin interface

```typescript
import { registerPlugin } from '@capacitor/core';
interface AdminEscapePlugin { exitKiosk(): Promise<void>; }
const AdminEscape = registerPlugin<AdminEscapePlugin>('AdminEscape');
export { AdminEscape };
```

### 7. `DeviceRouter.tsx` — Back button already handled

Back button is already blocked natively (`onBackPressed` doesn't call super) and the JS listener navigates within the app. No changes needed.

## File Summary

| File | Change |
|------|--------|
| `MainActivity.java` | Add lock task, immersive mode, keep screen on, register AdminEscapePlugin |
| `AdminEscapePlugin.java` (new) | Capacitor plugin to call `stopLockTask()` |
| `BootReceiver.java` (new) | Auto-launch app on device boot |
| `AndroidManifest.xml` | Add permissions, boot receiver, lockTaskMode attribute |
| `DiagnosticsScreen.tsx` | Hidden 10-tap on "About" card → exit kiosk dialog |
| `src/services/admin-escape-plugin.ts` (new) | Capacitor bridge interface for admin escape |

## Note on Device Owner

`startLockTask()` works in two modes:
- **Without device owner**: Shows a "Screen pinning" confirmation dialog once — user taps OK and the app is pinned
- **With device owner (DPC)**: Fully silent kiosk, no user prompt. Requires `adb dpm set-device-owner com.impactatms.app/.AdminReceiver` one-time setup on each device

The implementation works either way. You can set up device owner later for fully silent kiosk.

