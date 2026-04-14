

# Add API Activity Log to Diagnostics

Show full request/response details for every API call made by the app — tag submissions, heartbeats, config fetches, etc.

## Approach

Create an in-memory API activity log that the `ApiClient` populates on every request, then display it in a new "API Log" section on the Debug tab.

## Changes

### 1. Create API Activity Store (`src/utils/api-activity-log.ts`)
- A simple singleton that stores the last 30 API calls in memory (not persisted)
- Each entry captures: timestamp, method, URL, request body, response status, response body, duration (ms), and error if any
- Exposes `getEntries()` and `clear()`

### 2. Instrument `ApiClient.request()` (`src/data/remote/api-client.ts`)
- Before `fetch`, record the request details (method, URL, body)
- After `fetch`, capture response status and clone + read the response body (up to 2KB)
- On error, capture the error message
- Push each entry to the activity log

### 3. Add API Log viewer to Debug tab (`src/pages/DiagnosticsScreen.tsx`)
- New card "API Activity" in the Debug tab with a "Load API Log" button (same lazy pattern as scanned tags)
- Each entry shows: timestamp, method, URL, status code (color-coded), duration
- Tapping an entry expands to show request body and response body (JSON-formatted)
- "Clear" button to reset the log

## What stays unchanged
- No changes to RFID reading, tag submission logic, or sync worker behavior
- The logging is read-only observation of existing API calls

