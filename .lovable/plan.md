

# Fix: Login Screen Keyboard Scroll + Password Visibility Toggle

## Problems
1. **No scroll when keyboard opens**: The outer container uses `min-h-screen` with `flex justify-center`, which doesn't scroll. On Android when the soft keyboard pushes up, the password field and button get hidden behind it.
2. **No password visibility toggle**: Users can't verify what they typed.

## Changes

### `src/pages/LoginScreen.tsx`

**Keyboard scroll fix**:
- Change outer `div` from `min-h-screen flex items-center justify-center` to `min-h-screen overflow-y-auto` with padding
- This allows the content to scroll when the keyboard reduces available viewport height

**Password eye toggle**:
- Add `showPassword` state
- Replace the plain password `Input` with a wrapper containing the input + an `Eye`/`EyeOff` icon button
- Toggle between `type="password"` and `type="text"`

| File | Change |
|------|--------|
| `LoginScreen.tsx` | Make scrollable, add password show/hide toggle |

