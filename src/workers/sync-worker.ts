/**
 * Sync Worker
 * Periodically uploads pending reads individually via /api/v1/handheld/rfid.
 */

import { db } from '@/data/local/database';
import { apiClient, ApiAuthError } from '@/data/remote/api-client';
import { networkStatus } from '@/utils/network-status';
import { logger } from '@/utils/logger';

type SyncCallback = (date: Date) => void;
type PendingCountCallback = (count: number) => void;

class SyncWorker {
  private intervalId: number | null = null;
  private intervalMs = 5000;
  private onSynced: SyncCallback | null = null;
  private onPendingCount: PendingCountCallback | null = null;

  setInterval(seconds: number) {
    this.intervalMs = seconds * 1000;
    if (this.intervalId) {
      this.stop();
      this.start();
    }
  }

  setCallbacks(onSynced: SyncCallback, onPendingCount: PendingCountCallback) {
    this.onSynced = onSynced;
    this.onPendingCount = onPendingCount;
  }

  start() {
    if (this.intervalId) return;
    this.syncPending();
    this.intervalId = window.setInterval(() => {
      this.syncPending();
    }, this.intervalMs);
    logger.info(`Sync worker started (${this.intervalMs / 1000}s)`);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  async syncPending() {
    if (!networkStatus.isOnline) {
      return;
    }

    try {
      const pending = await db.getPending(50);

      if (pending.length === 0) {
        this.updatePendingCount();
        return;
      }

      logger.info(`Syncing ${pending.length} pending reads individually`);
      let syncedCount = 0;

      for (const r of pending) {
        try {
          if (!r.tid && !r.userData) {
            logger.warn(`Sync: read ${r.localReadId} missing tid/userData (legacy record)`);
          }
          const response = await apiClient.submitRfidRead({
            tag_id: r.epc,
            tid: r.tid || '',
            user_data: r.userData || '',
            lane_id: r.laneId || '',
          });

          await db.updateByLocalReadId(r.localReadId, {
            syncStatus: 'synced',
            action: response.action as 'ALLOW' | 'REJECT' | undefined,
            reason: response.reason || response.message,
            displayMessage: response.display_message,
            syncedAt: Date.now(),
          });
          syncedCount++;
        } catch (err) {
          if (err instanceof ApiAuthError) {
            logger.error('Sync auth failed — stopping batch');
            break;
          }
          const status = (err as any)?.status || (err as any)?.response?.status || 'unknown';
          logger.warn(`Failed to sync read ${r.localReadId}: status=${status} ${err}`);
        }
      }

      if (syncedCount > 0) {
        this.onSynced?.(new Date());
        logger.info(`Synced ${syncedCount} reads`);
      }
    } catch (err) {
      logger.warn(`Sync cycle failed: ${err}`);
    }

    this.updatePendingCount();
  }

  private async updatePendingCount() {
    try {
      const count = await db.countPending();
      this.onPendingCount?.(count);
    } catch {}
  }
}

export const syncWorker = new SyncWorker();
