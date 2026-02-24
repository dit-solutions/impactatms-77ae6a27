/**
 * Sync Worker
 * Periodically batches and uploads pending reads.
 */

import { db } from '@/data/local/database';
import { apiClient, ApiAuthError } from '@/data/remote/api-client';
import { networkStatus } from '@/utils/network-status';
import { logger } from '@/utils/logger';

type SyncCallback = (date: Date) => void;
type PendingCountCallback = (count: number) => void;

class SyncWorker {
  private intervalId: number | null = null;
  private intervalMs = 60000;
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
    this.updatePendingCount();
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
    if (!networkStatus.isOnline) return;

    try {
      const pending = await db.getPending(50);

      if (pending.length === 0) {
        this.updatePendingCount();
        return;
      }

      logger.info(`Syncing ${pending.length} pending reads`);

      const response = await apiClient.submitReadsBatch({
        reads: pending.map(r => ({
          local_read_id: r.localReadId,
          epc: r.epc,
          tid: r.tid,
          user_data: r.userData,
          rssi: r.rssi,
          antenna: r.antenna,
          timestamp: r.timestamp,
          gps: r.gps,
        })),
      });

      for (const result of response.results) {
        await db.updateByLocalReadId(result.local_read_id, {
          syncStatus: 'synced',
          action: result.action,
          reason: result.reason,
          displayMessage: result.display_message,
          syncedAt: Date.now(),
        });
      }

      this.onSynced?.(new Date());
      logger.info(`Synced ${response.results.length} reads`);
    } catch (err) {
      if (err instanceof ApiAuthError) {
        logger.error('Sync auth failed');
      } else {
        logger.warn(`Sync failed: ${err}`);
      }
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
