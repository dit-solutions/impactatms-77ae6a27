
# Multi-Fix: Logout Bug, Back Button, Heartbeat, Lanes, Tag Log, UI Cleanup

## Summary

Fix the auto-login-after-logout bug, add Android back button handling, update heartbeat to match actual API, add lane fetching and selection, move dangerous actions to Debug tab, and add a scanned tags log.

---

## 1. Fix Logout Auto-Redirect Bug

**Root cause**: When the user logs out, the heartbeat and config workers keep running. The heartbeat calls `setDeviceStatus('ACTIVE')` which resets `deviceState` to `active`, bypassing the login screen.

**Fix in `src/contexts/DeviceContext.tsx`**:
- Import `heartbeatWorker`, `syncWorker`, `configFetcher`
- In `logout()`: stop all three workers before clearing the user session
- Call `apiClient.logout()` (best-effort, don't block on failure)

**Fix in `src/data/remote/api-client.ts`**:
- Add `logout()` method: `POST /api/v1/handheld/auth/logout` (best-effort call)

---

## 2. Move Actions and Reset Device to Debug Tab

**In `src/pages/DiagnosticsScreen.tsx`**:
- Remove the "Actions" card (Test API, Export Logs, Reset Device) from the **Device** tab
- Add these buttons to the **Debug** tab:
  - Test API Connection
  - Export Logs
  - Reset Device (in a danger section at the bottom, with confirmation dialog)

The Device tab keeps only: Device Info and About cards.

---

## 3. Android Back Button Handling

**In `src/components/device/DeviceRouter.tsx`**:
- Import `App` from `@capacitor/app`
- Add a `useEffect` that registers a `backButton` listener:
  - If on `/diagnostics`, navigate back to `/`
  - If on root (`/`, `/login`, `/setup`), call `App.minimizeApp()` to minimize instead of closing

---

## 4. Update Heartbeat Response Format

The backend returns `{ message, config_versions: { lanes: number } }`, not `{ status, message, reason }`.

**In `src/data/remote/api-types.ts`**:
- Change `HeartbeatResponse` to:
  ```
  {
    message: string;
    config_versions: {
      lanes: number;
    };
  }
  ```
- Remove `DeviceStatus` type (no longer returned by heartbeat)
- Add `LanesResponse` type for the lanes fetch endpoint

**In `src/workers/heartbeat-worker.ts`**:
- Remove the `onStatusChange` callback (heartbeat no longer returns device status)
- Add an `onConfigVersions` callback that passes `config_versions` to the caller
- The caller (DeviceRouter/DeviceContext) compares `config_versions.lanes` against a stored version; if changed, re-fetches lanes

**In `src/contexts/DeviceContext.tsx`**:
- Remove `setDeviceStatus` (heartbeat no longer drives this)
- Add `lanes` state array and `selectedLane` state
- Add `storedLaneVersion` to detect changes from heartbeat
- Add `fetchLanes()` function that calls `apiClient.fetchLanes()` and stores result
- On heartbeat `config_versions.lanes` change, call `fetchLanes()`

---

## 5. Lanes Fetch API

**Endpoint**: `GET /api/v1/handheld/lanes`
- Headers: `Device: HHM <device_token>`
- Response: Array of lane objects (exact shape from your backend)

**In `src/data/remote/api-client.ts`**:
- Add `fetchLanes()` method: `GET /api/v1/handheld/lanes`
- Update `getConfig()` path from `/api/device/config` to `/api/v1/handheld/config` (consistency)

**In `src/data/remote/api-types.ts`**:
- Add `Lane` interface: `{ id: string; name: string; lane_number?: number }`
- Add `LanesResponse` as `Lane[]` or `{ lanes: Lane[] }` (will match actual response)

**Lane storage**:
- Store lanes in localStorage as cache
- Store `lane_config_version` number to compare with heartbeat

---

## 6. Lane Selection on Scan Screen

**In `src/pages/ScanScreen.tsx`**:
- Add a lane selector dropdown at the top (below header)
- If no lane is selected, disable the "Read Tag" button
- Store selected lane in context/state so it can be included with tag read submissions later (when you share the processing API)
- Show current lane name in the header subtitle

---

## 7. Scanned Tags Log in Debug Tab

**In `src/data/local/database.ts`**:
- Add `getRecentReads(days: number)` method that queries all reads from the last N days, sorted newest first

**In `src/pages/DiagnosticsScreen.tsx`** (Debug tab):
- Add a "Scanned Tags Log" card below the existing debug panel
- Shows a scrollable list of recent reads (last 30 days) with: EPC (truncated), timestamp, sync status badge (pending/synced), action (ALLOW/REJECT)
- Add "Clear Old Logs" button to purge entries older than 30 days

---

## File-by-File Summary

| File | Changes |
|------|---------|
| `src/data/remote/api-types.ts` | Update `HeartbeatResponse` to `{ message, config_versions }`. Add `Lane`, `LanesResponse`. Remove `DeviceStatus`. |
| `src/data/remote/api-client.ts` | Add `logout()`, `fetchLanes()`. Fix `getConfig()` path. Fix `submitReadsBatch()` path. |
| `src/security/token-store.ts` | No changes needed (user session methods already exist). |
| `src/contexts/DeviceContext.tsx` | Stop workers on logout. Add `lanes`, `selectedLane`, `fetchLanes()`. Remove `setDeviceStatus`. Add lane version tracking. |
| `src/workers/heartbeat-worker.ts` | Replace `onStatusChange` with `onConfigVersions` callback. Update to use new response format. |
| `src/domain/use-cases/fetch-config.ts` | Update config endpoint path to `/api/v1/handheld/config`. |
| `src/components/device/DeviceRouter.tsx` | Add `@capacitor/app` back button handler. Update heartbeat callback wiring (remove `setDeviceStatus`, add lane version check). |
| `src/pages/ScanScreen.tsx` | Add lane selector dropdown. Disable scan if no lane selected. |
| `src/pages/DiagnosticsScreen.tsx` | Move Actions + Reset to Debug tab. Add scanned tags log section. |
| `src/data/local/database.ts` | Add `getRecentReads(days)` and `deleteOlderThan(days)` methods. |
| `NetworkContracts.md` | Update heartbeat response format and add lanes endpoint documentation. |

---

## Technical: Back Button Logic

```text
backButton pressed:
  /diagnostics  --> navigate to /
  /             --> App.minimizeApp()
  /login        --> App.minimizeApp()
  /setup        --> App.minimizeApp()
```

## Technical: Heartbeat Flow (Updated)

```text
heartbeat response: { message, config_versions: { lanes: N } }
  --> compare N with stored lane_config_version
  --> if different: call fetchLanes(), update stored version
  --> no device status change from heartbeat
```

## Technical: Logout Flow (Fixed)

```text
User clicks Logout:
  1. heartbeatWorker.stop()
  2. syncWorker.stop()
  3. configFetcher.stop()
  4. apiClient.logout() (best-effort)
  5. tokenStore.clearUserSession()
  6. setCurrentUser(null)
  7. setDeviceState('provisioned')
  --> Workers are stopped, so nothing can reset state back to 'active'
```
