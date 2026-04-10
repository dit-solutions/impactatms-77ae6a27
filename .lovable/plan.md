

# Performance Optimizations — Safe, No Core Impact

All changes are rendering/UI-only. The RFID read → API submit → sync pipeline is completely untouched.

## Changes

### 1. Memoize DeviceContext value (`src/contexts/DeviceContext.tsx`)
Wrap the `value` object in `useMemo` to stop unnecessary re-renders of every component using `useDevice()`.
- **Impact on core features:** None. Same data, same functions, just fewer React re-render cycles.

### 2. Optimize sync worker (`src/workers/sync-worker.ts`)
- Increase default polling from 5s → 15s
- Early-exit when `countPending()` is 0
- **Impact on core features:** None. When reads ARE pending, they still sync immediately via `captureRead` and the worker still drains the queue. Only idle polling is reduced.

### 3. Fix callback ref in `use-rfid-reader.ts`
- Line 118: change `onTagDetected?.(fullTag)` → `onTagDetectedRef.current?.(fullTag)`
- Cap tag history from 100 → 20 items
- **Impact on core features:** None. The callback fires the same function. History cap only affects the in-memory display list, not what gets submitted to the backend.

### 4. Reduce ScanScreen re-renders (`src/pages/ScanScreen.tsx`)
- Destructure only needed values from `useDevice()`
- **Impact on core features:** None. Pure rendering optimization.

## What remains completely unchanged
- `src/services/rfid/rfid-service.ts` — tag reading logic
- `src/services/rfid/mivanta-rfid-plugin.ts` — hardware communication
- `src/domain/use-cases/submit-read.ts` — API submission
- `src/data/remote/api-client.ts` — HTTP calls to backend
- `src/data/local/database.ts` — IndexedDB storage

