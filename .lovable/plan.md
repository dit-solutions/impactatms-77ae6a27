

# Fix: Error Message Overflow on Provisioning Screen

## Problem
API error messages (often containing long URLs or JSON) render as a single unbroken line, overflowing the card horizontally.

## Fix

### `src/pages/ProvisioningScreen.tsx` (lines 176-187)
Add `overflow-hidden` and `break-words` to the error container so long text wraps within the card:

```tsx
<div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm overflow-hidden">
  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
  <div className="min-w-0 break-all">
```

Also apply the same fix to the LoginScreen error block (line 91-94) for consistency.

| File | Change |
|------|--------|
| `ProvisioningScreen.tsx` | Add `overflow-hidden` to error container, `min-w-0 break-all` to text div |
| `LoginScreen.tsx` | Same overflow fix on error block |

