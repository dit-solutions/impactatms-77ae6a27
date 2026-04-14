

# Enhance Scans Log with API Status & Remove API Activity Section

## Summary
Each scan in "Last 20 Scans" will show the HTTP status code (201/404/422/etc.) as a colored badge, and expand on tap to show the response body. The separate "API Activity" card will be removed.

## Changes

### 1. Add `httpStatus` and `responseBody` fields to `PendingRead` entity
**File:** `src/data/local/entities.ts`
- Add `httpStatus?: number` — stores 201, 404, 422, etc.
- Add `responseBody?: string` — stores the raw response text

### 2. Store HTTP status and response in submit-read use-case
**File:** `src/domain/use-cases/submit-read.ts`
- The `apiClient.submitRfidRead()` call currently doesn't expose HTTP status. Need to capture it.
- Modify `apiClient.submitRfidRead()` to return status code alongside the parsed body (or use a wrapper).
- On success: store `httpStatus: 201` and `responseBody` in the DB update.
- On `ApiError` catch: store `httpStatus: err.status` and `responseBody: err.body`.

### 3. Expose HTTP status from ApiClient
**File:** `src/data/remote/api-client.ts`
- Add a new method or modify `submitRfidRead` to return `{ status, data }` instead of just data, OR add a variant `submitRfidReadRaw()` that returns both.
- Simpler approach: make `submitRfidRead` return an enriched response type that includes `_httpStatus`.

### 4. Update Diagnostics UI — enhance scans, remove API Activity
**File:** `src/pages/DiagnosticsScreen.tsx`
- Each scan row gets a colored status badge: green for 201, yellow for 404, red for 422, gray for pending/no status.
- Each scan row becomes a `Collapsible` — tapping expands to show the response body (formatted JSON).
- Remove the entire "API Activity Log" card (lines 370-453).
- Remove related state variables (`apiLog`, `apiLogLoaded`, `expandedLogId` for API log) and the `apiActivityLog` import.
- Repurpose `expandedLogId` state for scan expansion (or rename to `expandedScanId`).

### 5. Clean up unused API Activity Log utility
**File:** `src/utils/api-activity-log.ts` — can optionally be kept (still used for instrumentation in api-client) or removed along with its usage in `api-client.ts`. Since the user said it's not needed, remove both the file and the instrumentation from `api-client.ts`.

## Technical Detail

The key challenge is that `submitRfidRead` currently throws on non-2xx, so the caller never sees the status. The fix:
- In `submit-read.ts`, catch `ApiError` and extract `.status` and `.body` from it to store in the DB.
- For success (2xx), the status is implicitly 200/201 — store it directly.

No IndexedDB schema migration needed since we're adding optional fields to existing records.

