/**
 * Fetch Config use-case.
 * Fetches server config on startup and periodically.
 */

import { apiClient, ApiAuthError } from '@/data/remote/api-client';
import { logger } from '@/utils/logger';
import { networkStatus } from '@/utils/network-status';
import type { DeviceConfigResponse } from '@/data/remote/api-types';

type ConfigCallback = (config: DeviceConfigResponse) => void;

class ConfigFetcher {
  private intervalId: number | null = null;
  private intervalMs = 300000; // default 5 min
  private onConfigReceived: ConfigCallback | null = null;

  setInterval(seconds: number) {
    this.intervalMs = seconds * 1000;
    if (this.intervalId) {
      this.stop();
      this.start();
    }
  }

  setCallback(cb: ConfigCallback) {
    this.onConfigReceived = cb;
  }

  start() {
    if (this.intervalId) return;
    
    // Fetch immediately
    this.fetch();

    this.intervalId = window.setInterval(() => {
      this.fetch();
    }, this.intervalMs);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  async fetch() {
    if (!networkStatus.isOnline) return;

    try {
      const config = await apiClient.getConfig();
      this.onConfigReceived?.(config);
      logger.info('Config fetched successfully');
    } catch (err) {
      if (err instanceof ApiAuthError) {
        logger.error('Config fetch auth failed');
      } else {
        logger.warn(`Config fetch failed: ${err}`);
      }
    }
  }

  /** Load cached config from localStorage */
  getCachedConfig(): DeviceConfigResponse | null {
    try {
      const raw = localStorage.getItem('device_config');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }
}

export const configFetcher = new ConfigFetcher();
