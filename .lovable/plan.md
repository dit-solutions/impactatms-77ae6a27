

# Fix App Lag Introduced in Recent Builds

## Root Cause

The lag was introduced by the **trigger gun integration** changes in `MivantaRfidPlugin.java`. Specifically, lines 138-145 of `handleKeyDown()`:

```java
// Emit keyEvent for ALL physical keys (so debug panel can show them)
JSObject keyEventData = new JSObject();
keyEventData.put("keyCode", keyCode);
keyEventData.put("action", "down");
keyEventData.put("isMainTrigger", isMainTriggerKey(keyCode));
keyEventData.put("isSideButton", isSideButton(keyCode));
keyEventData.put("timestamp", System.currentTimeMillis());
notifyListeners("keyEvent", keyEventData);
```

**Every single physical key press** on the device (volume up/down, back, navigation, home, etc.) now crosses the Capacitor bridge via `notifyListeners`. On Android handheld devices, system keys fire frequently — this floods the JS bridge with events, creating lag across the entire WebView (button clicks, navigation, rendering).

Before the trigger gun changes, `MainActivity` did not override `onKeyDown`/`onKeyUp` at all, so no key events reached the Capacitor bridge.

## Fix (1 file change, no core logic affected)

### `MivantaRfidPlugin.java` — Only emit `keyEvent` for trigger and side buttons

Move the `keyEvent` emission inside a guard so it only fires for relevant keys (trigger + side buttons), not every system key:

```java
public boolean handleKeyDown(int keyCode, KeyEvent event) {
    lastKeyCode = keyCode;

    // Only emit keyEvent for trigger/side buttons (not volume, back, etc.)
    if (isMainTriggerKey(keyCode) || isSideButton(keyCode)) {
        JSObject keyEventData = new JSObject();
        keyEventData.put("keyCode", keyCode);
        keyEventData.put("action", "down");
        keyEventData.put("isMainTrigger", isMainTriggerKey(keyCode));
        keyEventData.put("isSideButton", isSideButton(keyCode));
        keyEventData.put("timestamp", System.currentTimeMillis());
        notifyListeners("keyEvent", keyEventData);
    }

    // Rest of the method stays exactly the same
    if (isMainTriggerKey(keyCode) && isConnected) { ... }
    ...
}
```

Also reduce the verbose `Log.d` on every key press to only log for relevant keys.

## What stays untouched
- All scanning, reading, tag processing logic
- All data submission and sync worker logic
- All UI components and routing
- The back button handler in DeviceRouter
- The trigger scan flow (triggerPressed, triggerScanResult events)

## Why this is the cause
- The app was fine before the trigger gun integration
- That integration added `onKeyDown`/`onKeyUp` overrides in `MainActivity` which route **every** key to the plugin
- The plugin then fires a Capacitor bridge event for **every** key
- Capacitor bridge calls are not free — each one serializes a JSObject, crosses the WebView bridge, and triggers JS event handlers
- Volume keys, back key, and other system keys fire constantly during normal device use

