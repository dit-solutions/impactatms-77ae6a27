

# Fix ANR (App Not Responding) on Rapid Tag Scanning

## Root Cause

When a tag is scanned, `captureRead` runs the full chain **synchronously on the main thread**:
1. IndexedDB write (`db.add`)
2. Network fetch to backend (`apiClient.submitRfidRead`) — waits for response
3. IndexedDB update (`db.updateByLocalReadId`)

If the user scans a second tag before the previous API call completes, another full chain starts. On a slow network or slow backend, these pile up — multiple concurrent `fetch` calls + IndexedDB transactions overwhelm the WebView's JS thread on the low-powered handheld device, causing ANR.

Additionally, on API failure, `syncWorker.syncPending()` is called immediately (line 103 in submit-read.ts), which triggers *another* round of DB reads + network calls — compounding the problem.

## Fix: Decouple DB Write from Network Call

Split `captureRead` into two phases:
1. **Fast path (blocking):** Write to IndexedDB + update UI → returns immediately
2. **Background (fire-and-forget):** Network upload runs via `setTimeout(0)` so it yields back to the UI thread between operations

This ensures the scan button is responsive immediately after each scan. The API call still happens right away, just without blocking the next user interaction.

## Changes

### File: `src/domain/use-cases/submit-read.ts`
- Move the `try/catch` block (API call + DB update) into a `setTimeout(() => { ... }, 0)` wrapper so it runs as a separate task, not blocking the current microtask queue
- Remove the `syncWorker.syncPending()` call on failure — the sync worker's 15-second interval will pick up failed reads naturally, preventing a cascade of retries
- Add a simple in-flight guard: if a submission for the same EPC is already in progress, skip the duplicate (prevents rapid double-scans of the same tag from firing two API calls)

### File: `src/hooks/use-rfid-reader.ts`
- In `readSingleWithDetails`, don't call `onTagDetectedRef.current?.(fullTag)` until after state updates are done — minor reorder to ensure UI updates first

### No other files change
- Database schema, API client, sync worker, and UI components stay the same

## Technical Detail

```
BEFORE (blocks UI):
  scan → db.add() → await fetch() → db.update() → UI ready

AFTER (non-blocking):
  scan → db.add() → UI ready
                  ↘ setTimeout → fetch() → db.update()
```

