

# Disable Offline Queuing — Show "Device Offline" Instead

## Current Behavior
When the device is offline, tag reads are still queued locally in IndexedDB and the sync worker retries uploading them every 5 seconds. The offline banner says "Offline — reads are queued locally."

## Proposed Change
When offline, **block tag submission entirely** and show a toast saying "Device Offline" so no reads are sent or queued. The sync worker should also skip its cycle when offline.

## Changes

### 1. `src/domain/use-cases/submit-read.ts`
- At the top of `captureRead`, check `networkStatus.isOnline`
- If offline, show a destructive toast "Device Offline — tag not submitted" and `return` early (don't queue, don't call API)

### 2. `src/workers/sync-worker.ts`
- At the top of `syncPending()`, add an early return if `!networkStatus.isOnline` (this was previously removed for reliability, but now aligns with the new requirement)

### 3. `src/pages/ScanScreen.tsx`
- Update offline banner text from "Offline — reads are queued locally" to "Device Offline"

| File | Change |
|------|--------|
| `src/domain/use-cases/submit-read.ts` | Early return + toast when offline, skip queuing |
| `src/workers/sync-worker.ts` | Skip sync cycle when offline |
| `src/pages/ScanScreen.tsx` | Update banner text to "Device Offline" |

