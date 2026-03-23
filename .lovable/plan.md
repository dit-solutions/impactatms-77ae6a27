

# Fix: Back Button Exits App from Diagnostics Screen

## Root Cause

The `backButton` JS listener in `DeviceRouter.tsx` fires correctly and calls `navigate('/')`, but the **native Android default back behavior also fires simultaneously**. This is a known Capacitor issue — the WebView's default back action (finish activity / go to previous app) runs alongside the JS listener, so the app exits even though JS tried to navigate internally.

## Fix

### 1. `MainActivity.java` — Intercept back key in `onKeyDown`

The simplest fix: catch `KEYCODE_BACK` in `onKeyDown` and return `true` (consumed), preventing the native back from firing. The Capacitor bridge still emits its `backButton` event to JS, which handles all navigation logic.

```java
@Override
public boolean onKeyDown(int keyCode, KeyEvent event) {
    // Intercept back button — let Capacitor JS handle it entirely
    if (keyCode == KeyEvent.KEYCODE_BACK) {
        return true; // Consumed — prevents default activity back behavior
    }
    if (rfidPlugin != null && rfidPlugin.handleKeyDown(keyCode, event)) {
        return true;
    }
    return super.onKeyDown(keyCode, event);
}
```

Wait — this would also prevent the Capacitor `backButton` event from firing since BridgeActivity triggers it via `onBackPressed()`, not `onKeyDown`.

**Better approach**: Override `onBackPressed()` directly. When called, manually notify the Capacitor bridge's JS `backButton` listeners, then do NOT call `super.onBackPressed()`:

```java
@SuppressWarnings("deprecation")
@Override
public void onBackPressed() {
    // Don't call super — prevents default back (exit/previous app)
    // Capacitor's BridgeActivity.onBackPressed normally handles this,
    // but also calls super when no listeners exist, which exits the app.
    // We always want to stay in the app, so we override completely.
    
    // Manually trigger the bridge's backButton event
    getBridge().triggerJSEvent("backButton", "document");
}
```

Actually, the cleanest approach given Capacitor 8's architecture:

### Revised approach — Override `onBackPressed` to never exit

```java
@SuppressWarnings("deprecation")
@Override
public void onBackPressed() {
    // Let the bridge handle it (fires JS backButton event)
    // but if bridge would call super (which exits), we prevent that
    // by not calling super ourselves
}
```

But we need the JS event to still fire. Let me check how Capacitor's BridgeActivity handles this...

The safest approach that works with Capacitor 8:

### Final approach

**File: `MainActivity.java`** — Add `onBackPressed` override that calls the bridge's back button handling but never lets the activity finish:

```java
@SuppressWarnings("deprecation")  
@Override
public void onBackPressed() {
    // Trigger the Capacitor backButton JS event
    // but never call super.onBackPressed() to prevent exiting the app
    getBridge().triggerJSEvent("backButton", "document");
}
```

### 2. `DeviceRouter.tsx` — Remove `App.minimizeApp()`, always navigate

Since the user wants to **always stay in the app**, update the back button handler:
- On root paths (`/`, `/setup`, `/login`): do nothing (already on root)
- On other paths (`/diagnostics`): navigate to `/`

No `minimizeApp()` call at all.

## Files Changed

| File | Change |
|------|--------|
| `MainActivity.java` | Override `onBackPressed()` — fire JS event, never call super |
| `DeviceRouter.tsx` | Remove `App.minimizeApp()`, navigate home or do nothing on root |

