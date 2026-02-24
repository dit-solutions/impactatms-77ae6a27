

# Enterprise Device Provisioning & Offline-First RFID Architecture

## Overview

Complete restructuring of the app from a local user/PIN-based system to an enterprise device provisioning model with QR-based setup, server-driven configuration, offline-first RFID reads, heartbeat monitoring, and kill-switch support.

## What Gets Removed

- **InitialSetup page** (device prefix/number + super admin + PIN creation)
- **Login page** (user selection + PIN entry)
- **UserManagement page** (create/edit/delete users with roles)
- **AdminPanel page** (remote unlock code generator)
- **AuthContext** (user/session/lockout state management)
- **auth-service.ts** (localStorage-based user/PIN system)
- **All auth components** (PinInput, NumericKeypad, UnlockCodeInput, UnlockCodeGenerator, UserMenu, ProtectedRoute)
- **Auth types** (User, Role, Permission, LockoutState, etc.)
- **Auth hooks** (use-auth, use-permissions)

## What Gets Added

### 1. Project Structure (new folders/modules)

```text
src/
  data/
    remote/        -- API client, DTOs, interceptor
      api-client.ts
      api-types.ts
    local/         -- IndexedDB (Dexie) for offline queue
      database.ts
      entities.ts
  domain/
    use-cases/
      provision-device.ts
      send-heartbeat.ts
      submit-read.ts
      sync-pending-reads.ts
      fetch-config.ts
  security/
    token-store.ts       -- Secure device token storage
    device-fingerprint.ts -- ANDROID_ID, model, OS, app hash
  workers/
    heartbeat-worker.ts  -- 30s heartbeat loop
    sync-worker.ts       -- Batch sync pending reads
  utils/
    logger.ts            -- Bounded rotating log
    network-status.ts    -- Online/offline detection
  pages/
    ProvisioningScreen.tsx  -- QR scan + provision
    ScanScreen.tsx          -- Main RFID scanning (replaces Index)
    DeviceLockedScreen.tsx  -- Shown when SUSPENDED
    DiagnosticsScreen.tsx   -- Replaces Settings (diagnostics + reader config)
    SplashScreen.tsx        -- Token check + status routing
  contexts/
    DeviceContext.tsx     -- Device state (ACTIVE/SUSPENDED/UNPROVISIONED)
```

### 2. NetworkContracts (API contract file)

A `NetworkContracts.md` documenting all endpoints:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/device/provision` | POST | QR-based provisioning, returns device_token |
| `/api/device/heartbeat` | POST | Every 30s, returns ACTIVE/SUSPENDED |
| `/api/device/config` | GET | Plaza/lane, reader config, sync intervals |
| `/api/device/fastag-read/batch` | POST | Batch upload of pending reads |

### 3. Provisioning Flow (Step 2 from prompt)

- **ProvisioningScreen**: Camera-based QR scanner (using `@aspect-build/capacitor-barcode-scanner` or web camera API)
- QR contains: `{ "backend_url": "https://...", "provisioning_token": "..." }`
- Calls `POST /api/device/provision` with device fingerprint
- Receives: `device_token`, `device_id`, config timers
- Stores `device_token` securely (Capacitor Preferences encrypted or localStorage with basic protection)
- Navigates to ScanScreen

### 4. API Client with Device Auth (Step 3)

- Every API call includes header: `Authorization: Device <device_token>`
- If token missing or 401 response, force back to ProvisioningScreen
- Centralized `apiClient` with interceptor pattern

### 5. Device Fingerprint (Step 4)

Collected during provisioning:
- `ANDROID_ID` (via Capacitor Device plugin)
- `manufacturer` + `model`
- `OS version`
- `app_version`
- `app_signature_hash` (from native plugin or build-time constant)

### 6. Heartbeat Worker (Step 5)

- Runs every 30 seconds via `setInterval` (with visibility API awareness)
- Sends: battery %, network type, reader status, app_version
- Backend response: `status: ACTIVE | SUSPENDED`, optional `message`
- If SUSPENDED: show DeviceLockedScreen, stop scanning/syncing
- Heartbeat continues even when suspended (so backend can re-enable)

### 7. Config Fetch (Step 6)

- On app start and periodically (interval from config itself)
- Response: plaza/lane assignment, reader power, RSSI threshold, scan mode, sync intervals
- Stored locally (IndexedDB or localStorage)
- Applied to RFID reader without app update

### 8. Offline-First Read Queue (Step 7)

- On tag detect: generate `local_read_id` (UUID), insert into IndexedDB as `pending`
- Attempt immediate upload if online
- Background sync worker batches pending reads every 1-2 minutes
- Backend idempotent via `local_read_id`
- Uses Dexie.js for IndexedDB (lightweight, promise-based)

### 9. FASTag Read Integration (Step 8)

- Existing RFID reader abstraction (`TagReader` interface) stays
- Each read submission payload: `local_read_id`, `epc`, `rssi`, `antenna`, `timestamp`, optional GPS
- Backend response: `action: ALLOW | REJECT`, `reason`, optional `display_message`
- UI shows large ALLOW/REJECT status with color coding

### 10. Reader Abstraction (Step 9)

- Keep existing `MivantaRfidPlugin` as the concrete implementation
- Create `TagReader` interface wrapper
- Web mock stays for development

### 11. Diagnostics Screen (Step 10)

Replaces current Settings, includes:
- Device ID + assigned Plaza/Lane
- App version + SDK version
- Last heartbeat time + response
- Last sync status + timestamp
- Pending reads count
- Reader connection status + config
- "Test API" button (pings /config + /heartbeat)
- "Reset Device" button (clears token, returns to provisioning)
- "Export Logs" button
- Reader controls (connect/disconnect, power, mode) from existing Settings

### 12. Logging (Step 11)

- Ring-buffer logger (last N entries or last N MB)
- Logs: provision success/fail, auth fail, heartbeat sent/response, read captured/queued/synced, suspend/activate transitions
- "Export logs" downloads as text file

### 13. App Navigation Flow (Step 12)

```text
App Start
    |
    v
[Check Token]
    |
    +-- No token --> ProvisioningScreen (scan QR)
    |
    +-- Has token --> Check heartbeat status
                        |
                        +-- ACTIVE --> ScanScreen
                        +-- SUSPENDED --> DeviceLockedScreen
                        +-- Network error --> ScanScreen (offline mode, show banner)
```

## New Dependencies

| Package | Purpose |
|---------|---------|
| `dexie` | IndexedDB wrapper for offline read queue |
| `@capacitor/device` | Device fingerprint (model, OS, ANDROID_ID) |
| `@capacitor/preferences` | Secure token storage |
| `@capacitor/browser` | Open URLs for updates |
| `@aspect-build/capacitor-barcode-scanner` or `html5-qrcode` | QR code scanning |
| `uuid` | Generate local_read_id for each read |

## Implementation Phases

### Phase 1: Core Infrastructure
- Create folder structure
- API client with auth interceptor
- Token store
- Device fingerprint service
- NetworkContracts.md

### Phase 2: Provisioning
- QR scanner component
- ProvisioningScreen
- Device context (replaces AuthContext)

### Phase 3: Heartbeat & Config
- Heartbeat worker
- Config fetch and storage
- DeviceLockedScreen
- Device state management (ACTIVE/SUSPENDED)

### Phase 4: Offline-First Reads
- Dexie database setup (pending_reads table)
- Read capture use-case (generate UUID, queue, attempt upload)
- Sync worker (batch upload every 1-2 min)
- Updated ScanScreen with ALLOW/REJECT display

### Phase 5: Diagnostics & Logging
- Logger utility with rotation
- DiagnosticsScreen (merged reader settings + device info + debug)
- Export logs functionality
- Reset device action

### Phase 6: Cleanup
- Remove old auth files, pages, components, hooks, types
- Update App.tsx routes
- Update exports

## Technical Notes

- Since this is a Capacitor web app (not pure native Android), we use:
  - **IndexedDB via Dexie** instead of Room DB
  - **setInterval + Page Visibility API** instead of WorkManager
  - **Capacitor Preferences** instead of EncryptedSharedPreferences
  - **Capacitor Device plugin** instead of Android-specific fingerprinting
- The RFID reader integration (MivantaRfidPlugin) remains unchanged
- The app-update service remains unchanged (version check + APK download)
- All business logic (ALLOW/REJECT/SUSPEND) comes from backend APIs -- app is a thin client

