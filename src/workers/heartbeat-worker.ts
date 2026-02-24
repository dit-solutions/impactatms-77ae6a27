/**
 * Heartbeat Worker
 * Runs every 30s (configurable via server config).
 * Uses setInterval with Page Visibility API awareness.
 */

import { apiClient, ApiAuthError } from '@/data/remote/api-client';
import { networkStatus } from '@/utils/network-status';
import { logger } from '@/utils/logger';
import { getAppVersion } from '@/services/app-update/app-update-service';
import { rfidService } from '@/services/rfid';
import type { ConfigVersions } from '@/data/remote/api-types';

type ConfigVersionsCallback = (versions: ConfigVersions) => void;
type HeartbeatTimeCallback = (date: Date) => void;

class HeartbeatWorker {
  private intervalId: number | null = null;
  private intervalMs = 30000;
  private onConfigVersions: ConfigVersionsCallback | null = null;
  private onHeartbeatSent: HeartbeatTimeCallback | null = null;

  setInterval(seconds: number) {
    this.intervalMs = seconds * 1000;
    if (this.intervalId) {
      this.stop();
      this.start();
    }
  }

  setCallbacks(onVersions: ConfigVersionsCallback, onSent: HeartbeatTimeCallback) {
    this.onConfigVersions = onVersions;
    this.onHeartbeatSent = onSent;
  }

  start() {
    if (this.intervalId) return;

    this.send();

    this.intervalId = window.setInterval(() => {
      if (document.visibilityState === 'hidden') return;
      this.send();
    }, this.intervalMs);

    logger.info(`Heartbeat started (${this.intervalMs / 1000}s)`);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      logger.info('Heartbeat stopped');
    }
  }

  private async send() {
    if (!networkStatus.isOnline) return;

    try {
      const appVersion = await getAppVersion();
      const readerStatus = rfidService.getStatus();

      const response = await apiClient.heartbeat({
        battery_percent: await getBatteryPercent(),
        network_type: networkStatus.getNetworkType(),
        reader_status: readerStatus.connected ? 'connected' : 'disconnected',
        app_version: appVersion.version,
      });

      this.onHeartbeatSent?.(new Date());

      if (response.config_versions) {
        this.onConfigVersions?.(response.config_versions);
      }

      logger.info(`Heartbeat OK — ${response.message}`);
    } catch (err) {
      if (err instanceof ApiAuthError) {
        logger.error('Heartbeat auth failed');
      } else {
        logger.warn(`Heartbeat failed: ${err}`);
      }
    }
  }
}

async function getBatteryPercent(): Promise<number> {
  try {
    const battery = await (navigator as any).getBattery?.();
    if (battery) return Math.round(battery.level * 100);
  } catch {}
  return -1;
}

export const heartbeatWorker = new HeartbeatWorker();
