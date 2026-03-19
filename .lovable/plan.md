

# Configure Main Gun Button for RFID Scanning

## Current State

The trigger button pipeline is **already fully implemented** end-to-end:
- Java: `handleKeyDown` → `isTriggerKey` → `performTriggerScan` → emits `triggerScanResult`
- JS: `rfid-service.ts` listens for `triggerScanResult` → `use-rfid-reader.ts` processes and calls `onTagDetected`

However, `isTriggerKey()` currently treats **all** physical buttons (gun + both side buttons) identically, including keycodes 520 (left side) and 521 (right side). The user wants **only the main gun button** to trigger scans.

## Problem

Two potential issues:
1. The main gun trigger's actual keycode may not be in the current list (or may differ from expected 280/139)
2. Side buttons (520, 521) are triggering scans when they shouldn't

## Changes

### 1. `MivantaRfidPlugin.java` — Separate gun trigger from side buttons

- Create `isMainTriggerKey()` that only matches the gun trigger keycodes (280, 139, 293)
- Keep `isTriggerKey()` as-is for future use but only call `isMainTriggerKey()` from `handleKeyDown`/`handleKeyUp`
- Add **enhanced keycode logging** on ALL key events (not just recognized ones) so we can identify the exact gun keycode from device logs if it differs

```text
handleKeyDown:
  - Log EVERY keycode received (even unrecognized)
  - Only proceed with scan if isMainTriggerKey(keyCode)
  - Side buttons (520, 521) are passed through to Android default behavior
```

### 2. `MivantaRfidPlugin.java` — Add a `setTriggerKeyCodes` plugin method

- Allow the web app to dynamically configure which keycodes are treated as the gun trigger
- Useful for debugging: if 280 isn't the right code, the user can update it from the diagnostics screen without rebuilding the APK

### 3. `src/components/rfid/RfidDebugPanel.tsx` — Show last keycode pressed

- Display the last physical keycode received in the debug panel so the user can identify which keycode the gun button actually sends
- Add a listener for a new `keyEvent` notification from the plugin

## File Summary

| File | Change |
|------|--------|
| `MivantaRfidPlugin.java` | Separate gun trigger from side buttons, log all keycodes, add `setTriggerKeyCodes` method |
| `src/services/rfid/mivanta-rfid-plugin.ts` | Add `setTriggerKeyCodes` and `keyEvent` listener types |
| `src/services/rfid/rfid-service.ts` | Forward `keyEvent` to callbacks |
| `src/components/rfid/RfidDebugPanel.tsx` | Show last keycode for debugging |

