

# Battery Indicator + Low Battery Warning

## Changes

### 1. New: `src/hooks/use-battery.ts`
- Hook using `navigator.getBattery()` API
- Listens to `levelchange` and `chargingchange` events (event-driven, no polling)
- Returns `{ percent: number | null, isCharging: boolean }`
- Fires a destructive toast once when battery drops below 15% (tracks threshold crossing with a ref)

### 2. `src/pages/ScanScreen.tsx`
- Import `useBattery` and `BatteryLow`, `BatteryCharging`, `Battery` icons
- Add battery indicator in the header next to Settings button showing percent + icon
- Color coding: green (>50%), yellow (15-50%), red (<15%)

### 3. `src/pages/DiagnosticsScreen.tsx`
- Add battery percentage row in the Device Info card (after "Pending Reads" row around line 168)

| File | Change |
|------|--------|
| `src/hooks/use-battery.ts` | New hook — event-driven battery monitoring + low battery toast |
| `src/pages/ScanScreen.tsx` | Battery icon + percent in header |
| `src/pages/DiagnosticsScreen.tsx` | Battery row in Device Info card |

