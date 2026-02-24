/**
 * DeviceContext — replaces AuthContext.
 * Manages device provisioning state, heartbeat, and config.
 */
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { tokenStore } from '@/security/token-store';
import { apiClient, ApiAuthError } from '@/data/remote/api-client';
import type { DeviceConfigResponse, DeviceStatus } from '@/data/remote/api-types';
import { logger } from '@/utils/logger';

export type DeviceState = 'loading' | 'unprovisioned' | 'active' | 'suspended' | 'offline';

interface DeviceContextType {
  deviceState: DeviceState;
  deviceId: string | null;
  config: DeviceConfigResponse | null;
  suspendMessage: string | null;
  isOnline: boolean;
  lastHeartbeat: Date | null;
  lastSync: Date | null;
  pendingCount: number;

  // Actions
  completeProvisioning: (deviceId: string, token: string, backendUrl: string, config: any) => Promise<void>;
  resetDevice: () => Promise<void>;
  setDeviceStatus: (status: DeviceStatus, message?: string | null) => void;
  updateConfig: (config: DeviceConfigResponse) => void;
  setLastSync: (date: Date) => void;
  setPendingCount: (count: number) => void;
  setLastHeartbeat: (date: Date) => void;
}

const DeviceContext = createContext<DeviceContextType | undefined>(undefined);

export function DeviceProvider({ children }: { children: React.ReactNode }) {
  const [deviceState, setDeviceState] = useState<DeviceState>('loading');
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [config, setConfig] = useState<DeviceConfigResponse | null>(null);
  const [suspendMessage, setSuspendMessage] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastHeartbeat, setLastHeartbeat] = useState<Date | null>(null);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [pendingCount, setPendingCount] = useState(0);

  // Initialize
  useEffect(() => {
    const init = async () => {
      await tokenStore.init();
      await apiClient.init();

      const hasToken = await tokenStore.hasToken();
      if (hasToken) {
        const id = await tokenStore.getDeviceId();
        setDeviceId(id);
        setDeviceState('active');
        logger.info('Device initialized — token found');
      } else {
        setDeviceState('unprovisioned');
        logger.info('Device not provisioned');
      }
    };
    init();
  }, []);

  // Network status listeners
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const completeProvisioning = useCallback(async (
    newDeviceId: string, token: string, backendUrl: string, configTimers: any
  ) => {
    apiClient.persistBaseUrl(backendUrl);
    await tokenStore.setToken(token);
    await tokenStore.setDeviceId(newDeviceId);
    setDeviceId(newDeviceId);
    setDeviceState('active');
    logger.info(`Provisioned as ${newDeviceId}`);
  }, []);

  const resetDevice = useCallback(async () => {
    await tokenStore.clear();
    apiClient.clearBaseUrl();
    localStorage.removeItem('device_config');
    setDeviceId(null);
    setConfig(null);
    setDeviceState('unprovisioned');
    logger.info('Device reset — returning to provisioning');
  }, []);

  const setDeviceStatus = useCallback((status: DeviceStatus, message?: string | null) => {
    if (status === 'SUSPENDED') {
      setDeviceState('suspended');
      setSuspendMessage(message || 'Device suspended by administrator');
      logger.warn(`Device SUSPENDED: ${message || 'no reason'}`);
    } else {
      setDeviceState('active');
      setSuspendMessage(null);
      logger.info('Device ACTIVE');
    }
  }, []);

  const updateConfig = useCallback((newConfig: DeviceConfigResponse) => {
    setConfig(newConfig);
    localStorage.setItem('device_config', JSON.stringify(newConfig));
    logger.info(`Config updated — Plaza: ${newConfig.plaza.name}, Lane: ${newConfig.lane.name}`);
  }, []);

  const value: DeviceContextType = {
    deviceState,
    deviceId,
    config,
    suspendMessage,
    isOnline,
    lastHeartbeat,
    lastSync,
    pendingCount,
    completeProvisioning,
    resetDevice,
    setDeviceStatus,
    updateConfig,
    setLastSync,
    setPendingCount,
    setLastHeartbeat,
  };

  return (
    <DeviceContext.Provider value={value}>
      {children}
    </DeviceContext.Provider>
  );
}

export function useDevice() {
  const ctx = useContext(DeviceContext);
  if (!ctx) throw new Error('useDevice must be used within DeviceProvider');
  return ctx;
}
