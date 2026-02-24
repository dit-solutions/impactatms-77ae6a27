/**
 * Submit Read use-case.
 * Captures a tag read, queues it locally, attempts immediate upload.
 */

import { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { db } from '@/data/local/database';
import { apiClient, ApiAuthError } from '@/data/remote/api-client';
import { networkStatus } from '@/utils/network-status';
import { logger } from '@/utils/logger';
import type { PendingRead } from '@/data/local/entities';
import type { RfidTagData } from '@/services/rfid';

export interface ReadResultDisplay {
  action: 'ALLOW' | 'REJECT';
  reason?: string;
  displayMessage?: string;
}

export function useReadCapture() {
  const [lastResult, setLastResult] = useState<ReadResultDisplay | null>(null);

  const captureRead = useCallback(async (tag: RfidTagData) => {
    const localReadId = uuidv4();
    const now = Date.now();

    const read: PendingRead = {
      localReadId,
      epc: tag.epc,
      rssi: tag.rssi || 0,
      timestamp: new Date(tag.timestamp || now).toISOString(),
      syncStatus: 'pending',
      createdAt: now,
    };

    // Queue locally first
    await db.add(read);
    logger.info(`Read queued: ${tag.epc} (${localReadId})`);

    // Attempt immediate upload if online
    if (networkStatus.isOnline) {
      try {
        const response = await apiClient.submitReadsBatch({
          reads: [{
            local_read_id: localReadId,
            epc: read.epc,
            tid: read.tid,
            user_data: read.userData,
            rssi: read.rssi,
            timestamp: read.timestamp,
            gps: read.gps,
          }],
        });

        const result = response.results?.[0];
        if (result) {
          await db.updateByLocalReadId(localReadId, {
            syncStatus: 'synced',
            action: result.action,
            reason: result.reason,
            displayMessage: result.display_message,
            syncedAt: Date.now(),
          });

          setLastResult({
            action: result.action,
            reason: result.reason,
            displayMessage: result.display_message,
          });

          logger.info(`Read synced: ${result.action} — ${result.reason}`);
        }
      } catch (err) {
        if (err instanceof ApiAuthError) {
          logger.error('Auth failed during read submission');
        } else {
          logger.warn(`Read upload failed, staying in queue: ${err}`);
        }
      }
    } else {
      logger.info('Offline — read queued for later sync');
    }
  }, []);

  return { captureRead, lastResult };
}
