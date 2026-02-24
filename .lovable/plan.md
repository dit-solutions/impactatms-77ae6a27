# Fix: Pending Reads Not Uploading + Offline Queue Support

## Problem

Scanned tags stay in "pending" status and never get sent to the backend. Three issues cause this:

1. **Sync worker waits 60 seconds before first sync** -- It never runs `syncPending()` immediately on start, so there's a long delay before anything uploads.
2. `**navigator.onLine` is unreliable in Android WebView** -- Both the immediate upload in `captureRead` and the sync worker check `networkStatus.isOnline` before sending. In Capacitor WebViews, this often returns `false` even when the device has internet, silently blocking all uploads.
3. **No retry nudge** -- When immediate upload fails, there's no trigger to make the sync worker try sooner.

## Offline Support (Already Working)

The offline queue is already in place -- reads are saved to IndexedDB first, then uploaded. The fix ensures the sync worker reliably drains that queue whenever connectivity is actually available, regardless of what `navigator.onLine` reports.

## Changes

### 1. `src/workers/sync-worker.ts`

- **Run sync immediately on start** -- Call `syncPending()` right away instead of only after the first interval
- **Remove `navigator.onLine` guard** -- Attempt the upload and let network errors fail naturally (catches the Capacitor WebView false-negative)
- **Reduce default interval from 60s to 5s** -- Faster retries for queued reads

### 2. `src/domain/use-cases/submit-read.ts`

- **Remove `networkStatus.isOnline` check** -- Always attempt immediate upload after queuing locally; if it fails, the read stays in the queue
- **Trigger `syncWorker.syncPending()` on failure** -- If immediate upload fails, nudge the sync worker to retry soon instead of waiting for the next interval

## Flow After Fix

```text
Tag scanned
  1. Save to local IndexedDB (always works, online or offline)
  2. Attempt immediate upload to POST /api/v1/handheld/rfid
     - Success: mark as "synced", show ALLOW/REJECT
     - Failure: stays "pending", nudge sync worker
  3. Sync worker runs every 5s, picks up any pending reads
     - Tries to upload each one individually
     - On success: marks "synced"
     - On network error: skips, retries next cycle
     - On auth error: stops (needs re-login)
```

## File Summary


| File                                  | Change                                                              |
| ------------------------------------- | ------------------------------------------------------------------- |
| `src/workers/sync-worker.ts`          | Immediate sync on start, remove online guard, 15s interval          |
| `src/domain/use-cases/submit-read.ts` | Remove online guard, always attempt upload, trigger sync on failure |
