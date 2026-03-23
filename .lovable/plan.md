

# Remove Key Event Listener and Gun Trigger Code

## What's being removed

The "Last Physical Key Pressed" listener in the debug panel and the gun trigger scan integration — both introduced in recent builds and identified as the source of lag.

## Changes

### 1. `src/components/rfid/RfidDebugPanel.tsx`
- Remove the `keyEvent` listener `useEffect` (lines 23-34)
- Remove `lastKeyEvent` state (line 21)
- Remove the entire "Last Physical Key Pressed" UI block (lines 74-98)
- Remove `Keyboard` icon import and `KeyEventData` import

### 2. `src/hooks/use-rfid-reader.ts`
- Remove `handleTriggerScanResult` callback and its ref (lines 43-83)
- Remove `onTriggerPressed`, `onTriggerReleased`, `onTriggerScanResult` from `setCallbacks` (lines 102-110)
- Remove `lastFastTag`, `fastTagHistory` state and all trigger-related state updates
- Keep the core scanning flow (connect, disconnect, readSingle, readSingleWithDetails, startContinuous, stopContinuous, setPower, setMode, clearHistory) untouched

### 3. `src/services/rfid/rfid-service.ts`
- Remove `setupTriggerListeners()` method and its call in `connect()`
- Remove `triggerPressedHandle`, `triggerReleasedHandle`, `triggerScanResultHandle` fields
- Remove `onTriggerPressed`, `onTriggerReleased`, `onTriggerScanResult` from `RfidServiceCallbacks`
- Remove `TriggerScanResult` type export
- Keep all other service methods intact

### 4. `android/app/src/main/java/com/mivanta/rfid/MivantaRfidPlugin.java`
- Remove `keyEvent` emission from `handleKeyDown` (lines 139-148)
- Remove `triggerPressed`/`triggerReleased` event emissions
- Remove `performTriggerScan()`, `performSingleScanInternal()`, `startContinuousInternal()` methods
- Remove `handleKeyUp` trigger logic
- Keep: `handleKeyDown` still tracks `lastKeyCode` for debug info, but emits nothing to JS
- Keep: all `@PluginMethod` methods (connect, disconnect, readSingle, etc.) untouched

### 5. `MainActivity.java`
- Remove `onKeyUp` override entirely (no longer needed)
- Keep `onKeyDown` override but remove the rfidPlugin delegation (only keep back button handling if present)
- Actually: since gun trigger is removed, `onKeyDown`/`onKeyUp` can be simplified to not route to rfidPlugin at all. Keep the `onBackPressed` override.

### 6. `src/services/rfid/mivanta-rfid-plugin.ts`
- Remove `TriggerEventData`, `KeyEventData`, `TriggerScanResult` type exports
- Keep all plugin method interfaces

### 7. `src/services/rfid/index.ts`
- Remove trigger-related type exports

## What stays untouched
- All scanning via UI buttons (readSingle, readSingleWithDetails, readTagDetails)
- Continuous scanning via UI
- Connection/disconnection flow
- All data submission and sync
- Back button handler
- Debug panel SDK info (Load button still works)

| File | Change |
|------|--------|
| `RfidDebugPanel.tsx` | Remove key event listener and UI section |
| `use-rfid-reader.ts` | Remove trigger scan handling |
| `rfid-service.ts` | Remove trigger listener setup |
| `MivantaRfidPlugin.java` | Remove keyEvent/trigger emissions, keep plugin methods |
| `MainActivity.java` | Remove onKeyDown/onKeyUp rfid delegation |
| `mivanta-rfid-plugin.ts` | Remove trigger types |
| `index.ts` | Remove trigger type exports |

