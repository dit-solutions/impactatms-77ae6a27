

# Fix: Replace 404 catch-all with redirect to device flow

## Problem
The app is stuck on `/login` (a deleted route) showing a 404 page. The catch-all route renders `NotFound` instead of redirecting to the new device provisioning flow.

## Solution
One small change in `src/components/device/DeviceRouter.tsx`:

- **Line 95**: Replace `<Route path="*" element={<NotFound />} />` with `<Route path="*" element={<Navigate to="/" replace />} />`
- **Line 17**: Remove the unused `NotFound` import

This ensures any old/unknown URL (like `/login`) redirects to `/`, where the `DeviceRouter` logic takes over:
- No token? Redirects to `/setup` (provisioning via QR scan)
- Active? Shows `ScanScreen`
- Suspended? Shows `DeviceLockedScreen`

No mock APIs, no extra steps -- just the real device provisioning flow as designed.
