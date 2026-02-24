/**
 * DeviceContext — manages device provisioning state, user login, lanes, heartbeat, and config.
 */
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { tokenStore } from '@/security/token-store';
import { apiClient, ApiAuthError } from '@/data/remote/api-client';
import { heartbeatWorker } from '@/workers/heartbeat-worker';
import { syncWorker } from '@/workers/sync-worker';
import { configFetcher } from '@/domain/use-cases/fetch-config';
import type { DeviceConfigResponse, LoginUser, Lane, ConfigVersions } from '@/data/remote/api-types';
import { logger } from '@/utils/logger';

export type DeviceState = 'loading' | 'unprovisioned' | 'provisioned' | 'active' | 'suspended' | 'offline';

const LANES_KEY = 'device_lanes';
const LANE_VERSION_KEY = 'device_lane_config_version';
const SELECTED_LANE_KEY = 'device_selected_lane';

interface DeviceContextType {
  deviceState: DeviceState;
  deviceId: string | null;
  config: DeviceConfigResponse | null;
  suspendMessage: string | null;
  isOnline: boolean;
  lastHeartbeat: Date | null;
  lastSync: Date | null;
  pendingCount: number;
  currentUser: LoginUser | null;
  lanes: Lane[];
  selectedLane: Lane | null;

  // Actions
  completeProvisioning: (deviceId: string, token: string, backendUrl: string) => Promise<void>;
  completeLogin: (user: LoginUser, token: string) => Promise<void>;
  logout: () => Promise<void>;
  resetDevice: () => Promise<void>;
  updateConfig: (config: DeviceConfigResponse) => void;
  setLastSync: (date: Date) => void;
  setPendingCount: (count: number) => void;
  setLastHeartbeat: (date: Date) => void;
  setSelectedLane: (lane: Lane | null) => void;
  fetchLanes: () => Promise<void>;
  handleConfigVersions: (versions: ConfigVersions) => void;
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
  const [currentUser, setCurrentUser] = useState<LoginUser | null>(null);
  const [lanes, setLanes] = useState<Lane[]>([]);
  const [selectedLane, setSelectedLaneState] = useState<Lane | null>(null);
  const laneVersionRef = useRef<number>(0);

  // Load cached lanes
  useEffect(() => {
    try {
      const cached = localStorage.getItem(LANES_KEY);
      if (cached) setLanes(JSON.parse(cached));
      const cachedVersion = localStorage.getItem(LANE_VERSION_KEY);
      if (cachedVersion) laneVersionRef.current = Number(cachedVersion);
      const cachedSelected = localStorage.getItem(SELECTED_LANE_KEY);
      if (cachedSelected) setSelectedLaneState(JSON.parse(cachedSelected));
    } catch {}
  }, []);

  // Initialize
  useEffect(() => {
    const init = async () => {
      await tokenStore.init();
      await apiClient.init();

      const hasToken = await tokenStore.hasToken();
      if (hasToken) {
        const id = await tokenStore.getDeviceId();
        setDeviceId(id);

        const hasUser = await tokenStore.hasUserSession();
        if (hasUser) {
          const session = await tokenStore.getUserSession();
          if (session) setCurrentUser(session as unknown as LoginUser);
          setDeviceState('active');
          logger.info('Device initialized — token + user session found');
        } else {
          setDeviceState('provisioned');
          logger.info('Device provisioned but no user session — showing login');
        }
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

  const fetchLanes = useCallback(async () => {
    try {
      const result = await apiClient.fetchLanes();
      const normalized = result.map(l => ({ ...l, id: String(l.id) }));
      setLanes(normalized);
      localStorage.setItem(LANES_KEY, JSON.stringify(normalized));
      logger.info(`Fetched ${normalized.length} lanes`);
    } catch (err) {
      logger.warn(`Failed to fetch lanes: ${err}`);
    }
  }, []);

  const handleConfigVersions = useCallback((versions: ConfigVersions) => {
    if (versions.lanes !== laneVersionRef.current) {
      laneVersionRef.current = versions.lanes;
      localStorage.setItem(LANE_VERSION_KEY, String(versions.lanes));
      fetchLanes();
    }
  }, [fetchLanes]);

  const setSelectedLane = useCallback((lane: Lane | null) => {
    setSelectedLaneState(lane);
    if (lane) {
      localStorage.setItem(SELECTED_LANE_KEY, JSON.stringify(lane));
    } else {
      localStorage.removeItem(SELECTED_LANE_KEY);
    }
  }, []);

  const completeProvisioning = useCallback(async (
    newDeviceId: string, token: string, backendUrl: string
  ) => {
    apiClient.persistBaseUrl(backendUrl);
    await tokenStore.setToken(token);
    await tokenStore.setDeviceId(newDeviceId);
    setDeviceId(newDeviceId);
    setDeviceState('provisioned');
    logger.info(`Provisioned as ${newDeviceId} — awaiting user login`);
  }, []);

  const completeLogin = useCallback(async (user: LoginUser, token: string) => {
    await tokenStore.setUserToken(token);
    await tokenStore.setUserSession(user as unknown as Record<string, unknown>);
    setCurrentUser(user);
    setDeviceState('active');
    logger.info(`User logged in: ${user.name} (${user.email})`);
  }, []);

  const logout = useCallback(async () => {
    // Stop all workers first to prevent state resets
    heartbeatWorker.stop();
    syncWorker.stop();
    configFetcher.stop();

    // Best-effort server logout
    await apiClient.logout();

    await tokenStore.clearUserSession();
    setCurrentUser(null);
    setDeviceState('provisioned');
    logger.info('User logged out — workers stopped, returning to login');
  }, []);

  const resetDevice = useCallback(async () => {
    heartbeatWorker.stop();
    syncWorker.stop();
    configFetcher.stop();

    await tokenStore.clear();
    apiClient.clearBaseUrl();
    localStorage.removeItem('device_config');
    localStorage.removeItem(LANES_KEY);
    localStorage.removeItem(LANE_VERSION_KEY);
    localStorage.removeItem(SELECTED_LANE_KEY);
    setDeviceId(null);
    setConfig(null);
    setCurrentUser(null);
    setLanes([]);
    setSelectedLaneState(null);
    setDeviceState('unprovisioned');
    logger.info('Device reset — returning to provisioning');
  }, []);

  const updateConfig = useCallback((newConfig: DeviceConfigResponse) => {
    setConfig(newConfig);
    localStorage.setItem('device_config', JSON.stringify(newConfig));
    logger.info(`Config updated — Plaza: ${newConfig?.plaza?.name ?? 'unknown'}`);
  }, []);

  const value: DeviceContextType = {
    deviceState, deviceId, config, suspendMessage, isOnline,
    lastHeartbeat, lastSync, pendingCount, currentUser,
    lanes, selectedLane,
    completeProvisioning, completeLogin, logout, resetDevice,
    updateConfig, setLastSync, setPendingCount, setLastHeartbeat,
    setSelectedLane, fetchLanes, handleConfigVersions,
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
