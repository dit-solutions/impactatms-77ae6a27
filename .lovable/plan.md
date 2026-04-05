

# Fix: Top Content Overlapped by System Bar in Kiosk Mode

## Problem
In kiosk/immersive mode, the Android status bar area overlaps the app's top content (logo, settings icon). The app uses `p-4` padding which doesn't account for the system bar safe area inset.

## Fix

### `src/index.css`
Add a CSS utility that uses `env(safe-area-inset-top)` to push content below the system bar overlay:
```css
:root {
  --safe-area-top: env(safe-area-inset-top, 0px);
}
```

### All screen containers — add top safe-area padding
Update the outermost `div` on each screen to use `pt-[env(safe-area-inset-top)]` or add a calculated top padding:

| File | Current | Change |
|------|---------|--------|
| `ScanScreen.tsx` | `p-4` | `p-4 pt-[max(1rem,env(safe-area-inset-top))]` |
| `LoginScreen.tsx` | `p-4` | Same safe-area top padding |
| `ProvisioningScreen.tsx` | `p-6` | Same approach |
| `DiagnosticsScreen.tsx` | top padding | Same approach |
| `DeviceLockedScreen.tsx` | `p-6` | Same approach |

### `index.html`
Add viewport meta for safe areas (if not already present):
```html
<meta name="viewport" content="..., viewport-fit=cover">
```

This ensures content respects the system bar inset on all screens without breaking non-kiosk layouts (the `env()` value falls back to `0px`).

