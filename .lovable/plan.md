

# Fix: Admin Escape Accessible from All Screens

## Problem

The 10-tap admin escape to exit kiosk mode only exists on the **Diagnostics screen**, which is unreachable from the Setup and Login screens. If the device is in kiosk mode during provisioning or login, you're completely trapped — the navigation bars are hidden (immersive mode) and back button is overridden.

## Solution

Create a **global admin escape overlay** that works on every screen, triggered by tapping the app logo 10 times rapidly. Since every screen already shows the Impact ATMS logo, we attach the tap handler there via a shared wrapper component.

## Changes

### 1. New: `src/components/app/AdminEscapeWrapper.tsx`
- A wrapper component that renders its children (the logo) with an `onClick` tap counter
- 10 taps within 3 seconds triggers an AlertDialog: "Exit Kiosk Mode?"
- On confirm, calls `AdminEscape.exitKiosk()`
- This is reusable across all screens

### 2. `src/pages/ProvisioningScreen.tsx`
- Wrap the logo `<img>` with `AdminEscapeWrapper`

### 3. `src/pages/LoginScreen.tsx`
- Wrap the logo `<img>` with `AdminEscapeWrapper`

### 4. `src/pages/ScanScreen.tsx`
- Wrap the logo `<img>` with `AdminEscapeWrapper`

### 5. `src/pages/DiagnosticsScreen.tsx`
- Remove the existing About-card tap handler (`handleAboutTap`, `tapCountRef`, `tapTimerRef`, `showKioskExit` state, and the AlertDialog)
- Add the logo in the header wrapped with `AdminEscapeWrapper` (or wrap the existing back-arrow area)

### 6. `src/pages/DeviceLockedScreen.tsx`
- Wrap the logo with `AdminEscapeWrapper` (so locked devices can also be escaped)

## What stays the same
- All native Java code (MainActivity, AdminEscapePlugin, BootReceiver) — unchanged
- All kiosk mode behavior — unchanged
- All navigation, scanning, provisioning logic — unchanged

## File Summary

| File | Change |
|------|--------|
| `AdminEscapeWrapper.tsx` (new) | Shared 10-tap escape component with confirmation dialog |
| `ProvisioningScreen.tsx` | Wrap logo with escape wrapper |
| `LoginScreen.tsx` | Wrap logo with escape wrapper |
| `ScanScreen.tsx` | Wrap logo with escape wrapper |
| `DiagnosticsScreen.tsx` | Remove old tap handler, use shared wrapper |
| `DeviceLockedScreen.tsx` | Wrap logo with escape wrapper |

