

# Fix: Android Hardware Back Button Not Working Inside App

## Root Cause

The back button listener in `DeviceRouter.tsx` has a **stale closure race condition**. It re-registers on every `location.pathname` change, but `App.addListener` returns a Promise. The cleanup (`listener.then(l => l.remove())`) can race with the new listener being added — sometimes the old listener fires with a stale path, or no listener is active during the gap, causing Android's default behavior (exit/minimize app) to take over.

## Fix

**File: `src/components/device/DeviceRouter.tsx`**

Use a `useRef` to track the current pathname so the listener is registered **once** and always reads the latest path — no teardown/re-register race:

```typescript
const locationRef = useRef(location.pathname);
locationRef.current = location.pathname;

useEffect(() => {
  const listener = App.addListener('backButton', () => {
    const path = locationRef.current;
    if (path === '/diagnostics') {
      navigate('/');
    } else {
      App.minimizeApp();
    }
  });

  return () => {
    listener.then(l => l.remove());
  };
}, [navigate]); // register once, no pathname dep
```

This ensures:
- Listener is always active (no gap during re-registration)
- Always reads the current route via ref
- Cleanup only happens on unmount
- Back from `/diagnostics` → goes to main screen
- Back from root screens → minimizes app (standard Android behavior)

## Files Changed

| File | Change |
|------|--------|
| `src/components/device/DeviceRouter.tsx` | Use `useRef` for pathname, register listener once |

