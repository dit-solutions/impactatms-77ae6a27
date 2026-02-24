
## Resolve FASTag Remaining in `pending` by preserving full tag payload and surfacing sync failures

### What I found in your current code (root cause)

From the current code path, the app is scanning tags but dropping FASTag details before upload:

1. `use-rfid-reader.ts` correctly receives full FASTag data (`tid`, `epc`, `userData`) from:
   - `readTagDetails()`
   - `triggerScanResult`
2. But then it creates a reduced `basicTag` and calls `onTagDetected` with only:
   - `epc`, `rssi`, `timestamp`
3. `submit-read.ts` expects `tid` / `userData` from the tag object (`(tag as any).tid`, `(tag as any).userData`), so it ends up sending empty values.
4. If backend validation needs complete FASTag fields, requests fail and records stay `pending` forever in local queue.

This explains why scans are recorded locally (pending count increases) but not processed by backend.

---

## Implementation approach

### 1) Preserve FASTag details end-to-end (critical fix)

**Files:**
- `src/services/rfid/mivanta-rfid-plugin.ts`
- `src/hooks/use-rfid-reader.ts`
- `src/domain/use-cases/submit-read.ts`

**Changes:**
- Extend `RfidTagData` to include optional fields:
  - `tid?: string`
  - `userData?: string`
- In `use-rfid-reader.ts`, when handling `readSingleWithDetails` and `triggerScanResult`, pass full data to `onTagDetected` (not reduced object).
- In `submit-read.ts`, stop relying on `as any`; use typed fields directly:
  - `tid: tag.tid || ''`
  - `user_data: tag.userData || ''`

**Result:**
- Queue entries store full FASTag payload.
- Immediate upload + background sync send correct body for `/api/v1/handheld/rfid`.

---

### 2) Improve sync failure visibility (so pending does not look “silent”)

**Files:**
- `src/domain/use-cases/submit-read.ts`
- `src/workers/sync-worker.ts`

**Changes:**
- Add structured logs before submit:
  - localReadId, laneId, epc, tid length, userData length
- Improve catch handling for `ApiError` to log:
  - HTTP status
  - response body excerpt
- Keep existing retry behavior (offline-first), but make the reason for pending obvious in logs.

**Result:**
- You’ll be able to see exactly why a pending read is not syncing (401/422/network/etc.).

---

### 3) Handle already-queued old records safely

**File:**
- `src/workers/sync-worker.ts` (non-destructive behavior)

**Changes:**
- Keep retrying old pending reads, but explicitly log when payload is missing FASTag details (tid/userData empty), so they are identifiable.
- Do **not** auto-delete old pending entries in this pass (to avoid data loss).

**Result:**
- New scans will process correctly after fix.
- Existing stuck records remain traceable; we can add a separate “retry/discard invalid pending” action afterward if you want.

---

## Why this solves your current symptom

- Your pending queue is working.
- Sync worker is running every 5s and trying uploads.
- The remaining gap is payload correctness from scan event to API submit.
- Preserving TID/UserData through `onTagDetected -> captureRead -> submitRfidRead` closes that gap.

---

## Validation checklist after implementation

1. Scan one FASTag in normal flow.
2. Confirm logs show submit payload metadata with non-empty `tid/userData` lengths.
3. Confirm network request goes to `POST /api/v1/handheld/rfid` with:
   - `tag_id`
   - `tid`
   - `user_data`
   - `lane_id`
4. Confirm pending count decreases (or does not increase when online).
5. Offline test:
   - Disable network, scan tags (pending increases)
   - Re-enable network
   - Verify queued records move to synced and receive ALLOW/REJECT data.

---

## Technical notes

- The core issue is not queueing/scheduler anymore; it’s field loss during data mapping.
- This fix is backward-compatible with existing readers: `tid/userData` stay optional in type, but are now preserved when available.
- No API contract changes required.
