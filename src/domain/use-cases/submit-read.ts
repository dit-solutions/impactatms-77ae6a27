/**
 * Submit Read use-case.
 * Captures a tag read, queues it locally, attempts immediate upload via /api/v1/handheld/rfid.
 */

import { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { db } from '@/data/local/database';
import { apiClient, ApiAuthError } from '@/data/remote/api-client';
import { logger } from '@/utils/logger';
import { syncWorker } from '@/workers/sync-worker';
import type { PendingRead } from '@/data/local/entities';
import type { RfidTagData } from '@/services/rfid';

export interface ReadResultDisplay {
  action: 'ALLOW' | 'REJECT';
  reason?: string;
  displayMessage?: string;
}

export function useReadCapture() {
  const [lastResult, setLastResult] = useState<ReadResultDisplay | null>(null);

  const captureRead = useCallback(async (tag: RfidTagData, laneId: string) => {
    const localReadId = uuidv4();
    const now = Date.now();

    const read: PendingRead = {
      localReadId,
      epc: tag.epc,
      rssi: tag.rssi || 0,
      tid: tag.tid || '',
      userData: tag.userData || '',
      timestamp: new Date(tag.timestamp || now).toISOString(),
      syncStatus: 'pending',
      laneId,
      createdAt: now,
    };

    // Queue locally first
    await db.add(read);
    logger.info(`Read queued: ${tag.epc} (${localReadId}) lane=${laneId} tid=${(tag.tid || '').length}chars userData=${(tag.userData || '').length}chars`);

    // Always attempt immediate upload
    try {
      const response = await apiClient.submitRfidRead({
        tag_id: read.epc,
        tid: read.tid || '',
        user_data: read.userData || '',
        lane_id: laneId,
      });

      const action = response.action || (response.message ? 'ALLOW' : undefined);
      if (action) {
        await db.updateByLocalReadId(localReadId, {
          syncStatus: 'synced',
          action: action as 'ALLOW' | 'REJECT',
          reason: response.reason || response.message,
          displayMessage: response.display_message,
          syncedAt: Date.now(),
        });

        setLastResult({
          action: action as 'ALLOW' | 'REJECT',
          reason: response.reason || response.message,
          displayMessage: response.display_message,
        });

        logger.info(`Read synced: ${action} — ${response.reason || response.message}`);
      } else {
        await db.updateByLocalReadId(localReadId, {
          syncStatus: 'synced',
          syncedAt: Date.now(),
        });
        logger.info(`Read submitted, no action in response`);
      }
    } catch (err) {
      if (err instanceof ApiAuthError) {
        logger.error('Auth failed during read submission');
      } else {
        logger.warn(`Read upload failed, staying in queue: ${err}`);
        // Nudge sync worker to retry soon
        syncWorker.syncPending();
      }
    }
  }, []);

  return { captureRead, lastResult };
}
