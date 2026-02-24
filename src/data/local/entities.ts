/** Local database entity types (IndexedDB via Dexie) */

export type ReadSyncStatus = 'pending' | 'synced' | 'failed';

export interface PendingRead {
  /** Auto-incremented ID */
  id?: number;
  /** UUID v4 — used for backend idempotency */
  localReadId: string;
  epc: string;
  tid?: string;
  userData?: string;
  rssi: number;
  antenna?: number;
  /** ISO-8601 timestamp */
  timestamp: string;
  gps?: { latitude: number; longitude: number } | null;
  /** Sync state */
  syncStatus: ReadSyncStatus;
  /** Backend response after sync */
  action?: 'ALLOW' | 'REJECT';
  reason?: string;
  displayMessage?: string;
  /** Selected lane ID for this read */
  laneId?: string;
  /** When it was created locally */
  createdAt: number;
  /** When it was last synced */
  syncedAt?: number;
}
