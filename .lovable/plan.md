

# Move Logout to Device Settings with Confirmation

## Changes

### 1. `src/pages/ScanScreen.tsx`
- Remove the logout button (lines 52-54) and the `LogOut` icon import
- Remove `logout` from the `useDevice()` destructure

### 2. `src/pages/DiagnosticsScreen.tsx`
- Import `LogOut` from lucide-react, `logout` from `useDevice()`, and `AlertDialog` components
- Add a "Sign Out" section at the bottom of the **Device** tab (after the "About" card, before `</TabsContent>`):
  - A danger-zone card with a destructive "Sign Out" button
  - Wrapped in an `AlertDialog` requiring confirmation ("Are you sure you want to sign out? You will need to sign in again.")
  - Cancel and confirm actions

### Layout in Device tab
```text
┌─────────────────────┐
│ Device Info card     │
│ About card           │
│                      │
│ ┌─ Danger Zone ────┐ │
│ │  [Sign Out]      │ │  ← destructive button with AlertDialog confirmation
│ └──────────────────┘ │
└─────────────────────┘
```

| File | Change |
|------|--------|
| `ScanScreen.tsx` | Remove logout button from header |
| `DiagnosticsScreen.tsx` | Add Sign Out with confirmation in Device tab |

