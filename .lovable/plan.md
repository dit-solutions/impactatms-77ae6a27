

# Add User Login After Device Provisioning

## Overview

Currently, after a successful QR provisioning, the app jumps straight to the Scan screen. You need a **login step** in between: once the device is provisioned, the user must sign in with their email/phone and password before accessing the app.

## Flow Change

```text
QR Scan --> Provision --> Login Screen --> App (Scan, etc.)
           (saves device_token)    (email + password)
```

## API Details (from screenshots)

- **Endpoint**: `POST /api/v1/handheld/auth/login`
- **Headers**:
  - `Content-Type: application/json`
  - `Accept: application/json`
  - `Device: HHM <device_token>` (uses the token saved during provisioning)
- **Body**: `{ "login": "user@example.com", "password": "pass123" }`
- **Response**: Expected to return user/session data (the app will store this to mark the user as logged in)

**Important**: The `Device` header format is `HHM <token>`, not `Authorization: Device <token>`. This needs to be updated across the API client.

## Technical Changes

### 1. `src/data/remote/api-types.ts` -- Add login types

Add new interfaces:
- `LoginRequest`: `{ login: string; password: string }`
- `LoginResponse`: `{ message: string; user: { id: string; name: string; email: string } }` (will adjust based on actual response)

### 2. `src/data/remote/api-client.ts` -- Fix auth header and add login endpoint

- Change the auth header from `Authorization: Device <token>` to `Device: HHM <token>` to match the backend
- Add a `login()` method that POSTs to `/api/v1/handheld/auth/login` with the device token header (no user auth needed yet, only device auth)

### 3. `src/security/token-store.ts` -- Add user session storage

- Add `setUserToken()`, `getUserToken()`, `hasUserToken()`, `clearUserToken()` methods
- Store user session data so the app knows someone is logged in

### 4. `src/contexts/DeviceContext.tsx` -- Add new "provisioned" state

- Add `'provisioned'` to the `DeviceState` type (between `unprovisioned` and `active`)
- `completeProvisioning()` now sets state to `provisioned` (not `active`)
- Add new `completeLogin()` action that sets state to `active`
- Add `logout()` action that clears user token and returns to `provisioned` state
- On init: if device token exists but no user token, set state to `provisioned`

### 5. New file: `src/pages/LoginScreen.tsx` -- Login form

- Simple form with email/phone input + password input
- Calls `apiClient.login()` on submit
- On success, calls `completeLogin()` from DeviceContext
- Shows error messages on failure
- Branded with Impact ATMS logo (same style as provisioning screen)

### 6. `src/components/device/DeviceRouter.tsx` -- Add login route

- Add `/login` route that shows `LoginScreen` when state is `provisioned`
- When state is `provisioned`, redirect `/` to `/login`
- When state is `active`, redirect `/login` to `/`
- Workers (heartbeat, sync, config) only start after login (state = `active`)

### 7. `src/pages/ScanScreen.tsx` -- Add logout option

- Add a logout button (in the header or diagnostics) so the user can sign out and return to login

## State Machine (Updated)

```text
loading --> unprovisioned --> provisioned --> active
                                  ^            |
                                  |-- logout --|
                              suspended (from heartbeat)
```

## Files Changed

| File | Change |
|------|--------|
| `src/data/remote/api-types.ts` | Add `LoginRequest`, `LoginResponse` types |
| `src/data/remote/api-client.ts` | Fix `Device: HHM` header; add `login()` endpoint |
| `src/security/token-store.ts` | Add user session storage methods |
| `src/contexts/DeviceContext.tsx` | Add `provisioned` state, `completeLogin()`, `logout()` |
| `src/pages/LoginScreen.tsx` | New login screen with email/phone + password form |
| `src/components/device/DeviceRouter.tsx` | Add login route, update state routing |
| `src/pages/ScanScreen.tsx` | Add logout action in header |

