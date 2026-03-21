

# Fix: Connect Reader Navigation + Back Button Crash

## Issue 1: "Connect Reader" Goes to Wrong Tab

**File: `src/components/rfid/RfidReaderPanel.tsx`** (line 86-89)

Currently links to `/diagnostics` which opens on the "Device" tab. The connect button is on the "Reader" tab.

**Fix**: Link to `/diagnostics?tab=reader` instead.

**File: `src/pages/DiagnosticsScreen.tsx`**

Currently uses `defaultValue="device"` for Tabs. Need to read the `tab` query param and use it as the default/controlled value.

- Read `?tab=` from URL search params
- Use it as the active tab (defaulting to `"device"` if not specified)
- Valid values: `device`, `reader`, `debug`

## Issue 2: Back Button Exits App + Crash

**File: `src/components/device/DeviceRouter.tsx`** (lines 37-44)

Current logic:
```
if path === '/diagnostics' → navigate('/')
else → App.minimizeApp()
```

This means if the user is on `/diagnostics` with the reader tab open, back works. But if any unexpected path is hit, `minimizeApp()` fires immediately, exiting the app. The crash/ANR likely happens because `App.minimizeApp()` is called while the WebView is still processing, or because the listener fires multiple times.

**Fix**:
- Change logic: only minimize on root paths (`/`, `/setup`, `/login`). For all other paths, navigate to `/`.
- Wrap in try-catch to prevent ANR from unhandled native errors.

```typescript
useEffect(() => {
  const listener = App.addListener('backButton', () => {
    try {
      const path = locationRef.current;
      if (path === '/' || path === '/setup' || path === '/login') {
        App.minimizeApp();
      } else {
        navigate('/');
      }
    } catch (e) {
      // Prevent ANR
    }
  });

  return () => {
    listener.then(l => l.remove());
  };
}, [navigate]);
```

## Files Changed

| File | Change |
|------|--------|
| `src/components/rfid/RfidReaderPanel.tsx` | Link to `/diagnostics?tab=reader` |
| `src/pages/DiagnosticsScreen.tsx` | Read `?tab=` param to set active tab |
| `src/components/device/DeviceRouter.tsx` | Invert back button logic: minimize only on root paths, navigate home otherwise |

