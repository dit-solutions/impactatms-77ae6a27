

# Fix: Align API Client with Actual Backend Endpoints

## The Problem
The 404 error happens because the app is hitting **wrong API paths**. The app calls `/api/device/provision` but your backend expects `/api/v1/handheld/provision`. The request body format is also wrong -- the app wraps device info in a nested `device_fingerprint` object, but your backend expects flat fields.

## What's Wrong (Current vs Correct)

| Item | App Currently Sends | Backend Expects |
|------|-------------------|-----------------|
| Provision path | `/api/device/provision` | `/api/v1/handheld/provision` |
| Heartbeat path | `/api/device/heartbeat` | `/api/v1/handheld/heartbeat` |
| Provision body | `{ provisioning_token, device_fingerprint: { android_id, manufacturer, model, ... } }` | `{ provisioning_token, android_id, model, os_version, app_version }` |
| Provision response | `{ device_id, device_token, config: { ... } }` | `{ message, device_id, device_token }` |

## Changes

### 1. `src/data/remote/api-types.ts` -- Fix request/response types

- **ProvisionRequest**: Change from nested `device_fingerprint` object to flat fields matching the backend:
  ```
  provisioning_token, android_id, model, os_version, app_version
  ```
- **ProvisionResponse**: Change to match actual response:
  ```
  message, device_id, device_token
  ```
- Remove the `DeviceFingerprint` interface (no longer needed as a separate type)

### 2. `src/data/remote/api-client.ts` -- Fix endpoint paths

- Provision: `/api/device/provision` changes to `/api/v1/handheld/provision`
- Heartbeat: `/api/device/heartbeat` changes to `/api/v1/handheld/heartbeat`
- Add `Accept: application/json` header to all requests (matching Postman collection)

### 3. `src/pages/ProvisioningScreen.tsx` -- Fix provisioning call

- Instead of collecting a full `DeviceFingerprint` object, collect the individual fields (`android_id`, `model`, `os_version`, `app_version`) and send them flat in the request body
- Handle the simpler response (no `config` object in the provisioning response -- config may come from a separate call or not at all initially)

### 4. `src/security/device-fingerprint.ts` -- Simplify to return flat fields

- Update the function to return the 4 flat fields the backend needs: `android_id`, `model`, `os_version`, `app_version`
- Remove `manufacturer` and `app_signature_hash` which the backend doesn't use

### 5. `src/contexts/DeviceContext.tsx` -- Fix completeProvisioning

- The `completeProvisioning` function currently expects a `config` parameter from the provision response, but the backend doesn't return config during provisioning
- Update to work without config on initial provisioning (config can be fetched separately later)

## After This Fix
- QR scan will extract `backend_url` and `provisioning_token`
- App will POST to `{backend_url}/api/v1/handheld/provision` with the correct flat body
- App will save the returned `device_token` and `device_id` for all future authenticated API calls
- All subsequent API calls (heartbeat, etc.) will use `Authorization: Device {token}` header with the correct paths

