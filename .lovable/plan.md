

# Fix: App Lag from Unstable useEffect Dependencies

## Root Cause

The lag was introduced by the trigger gun integration changes to `use-rfid-reader.ts`. The `useEffect` at line 79 has dependencies `[onTagDetected, handleTriggerScanResult]` that are **unstable** — they change on nearly every re-render, causing the effect to re-run repeatedly. Each re-run:

1. Calls `rfidService.clearCallbacks()` (cleanup)
2. Calls `rfidService.setCallbacks(...)` (new setup)
3. Calls `rfidService.refreshStatus()` → `MivantaRfid.getStatus()` → **crosses the Capacitor bridge**

On a slow handheld device WebView, this bridge-crossing loop creates cumulative lag on every interaction (any state change triggers re-render → effect re-runs → bridge call → more state changes). Rapid taps queue up multiple bridge calls, causing the ANR dialog.

**Before the trigger gun changes**, the effect had fewer/more stable dependencies and no `handleTriggerScanResult` callback in the dep array.

## Fix — 1 file change

### `src/hooks/use-rfid-reader.ts`

Stabilize the effect by using **refs** for callbacks instead of putting them in the dependency array:

```typescript
// Store callbacks in refs so the effect doesn't re-run when they change
const onTagDetectedRef = useRef(onTagDetected);
onTagDetectedRef.current = onTagDetected;

const handleTriggerScanResultRef = useRef(handleTriggerScanResult);
handleTriggerScanResultRef.current = handleTriggerScanResult;
```

Then change the `useEffect` to:
- Use `onTagDetectedRef.current` and `handleTriggerScanResultRef.current` inside callbacks
- Remove `onTagDetected` and `handleTriggerScanResult` from the dependency array
- Make the effect run **once** (empty deps `[]`)

This means `setCallbacks` and `refreshStatus` only run once on mount, not on every re-render. The refs ensure the latest callback versions are always called.

## What stays untouched

- All scanning, reading, tag processing logic — unchanged
- All native Java code — unchanged
- All data submission, sync workers — unchanged
- All UI components — unchanged
- Back button handler — unchanged

## Files Changed

| File | Change |
|------|--------|
| `src/hooks/use-rfid-reader.ts` | Stabilize useEffect deps with refs to prevent re-render cascade |

