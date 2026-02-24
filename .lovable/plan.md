

# Switch FASTag Submission to `/api/v1/handheld/rfid`

## What's Changing

The current app sends scanned tags to a **batch** endpoint (`/api/v1/handheld/fastag-read/batch`) with fields like `epc`, `rssi`, `timestamp`, etc. Your backend actually expects individual tag submissions to **`/api/v1/handheld/rfid`** with a simpler payload:

```text
POST /api/v1/handheld/rfid
Headers: Device: HHM {token}, Authorization: Bearer {token}
Body: { "tag_id": "", "tid": "", "user_data": "", "lane_id": "" }
```

## Technical Changes (6 files)

### 1. `src/data/remote/api-types.ts`
Add new request/response types for the RFID endpoint:
- `RfidSubmitRequest`: `{ tag_id: string; tid: string; user_data: string; lane_id: string }`
- `RfidSubmitResponse`: flexible response type (keep existing `ReadAction` for result handling)
- Keep old batch types for now (no breaking removal)

### 2. `src/data/remote/api-client.ts`
Add new method `submitRfidRead(req: RfidSubmitRequest)` that POSTs to `/api/v1/handheld/rfid`. The existing `submitReadsBatch` stays but is no longer called.

### 3. `src/data/local/entities.ts`
Add `laneId?: string` field to `PendingRead` so the selected lane is stored with each queued read for offline sync.

### 4. `src/domain/use-cases/submit-read.ts`
- Update `captureRead` to accept `(tag: RfidTagData, laneId: string)`
- Store `laneId` in the local `PendingRead` record
- On immediate upload, call `apiClient.submitRfidRead()` with `{ tag_id: tag.epc, tid: tag.tid, user_data: tag.userData, lane_id: laneId }`
- Map the response to the existing ALLOW/REJECT display

### 5. `src/workers/sync-worker.ts`
- Update `syncPending()` to call the new endpoint per-read instead of batching
- For each pending read, POST to `/api/v1/handheld/rfid` with the stored `laneId`

### 6. `src/pages/ScanScreen.tsx`
- Pass `selectedLane.id` into `captureRead` when a tag is detected:
  ```typescript
  const handleTagDetected = useCallback(async (tag: RfidTagData) => {
    if (selectedLane) {
      await captureRead(tag, selectedLane.id);
    }
  }, [captureRead, selectedLane]);
  ```

## Flow After Changes

```text
Tag scanned --> captureRead(tag, laneId)
  1. Save to IndexedDB with laneId
  2. If online: POST /api/v1/handheld/rfid { tag_id, tid, user_data, lane_id }
  3. Show result (ALLOW/REJECT) from response
  4. If offline: stays in queue, sync worker retries later
```

