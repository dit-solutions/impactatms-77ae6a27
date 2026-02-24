/**
 * DeviceRouter — handles navigation based on device state.
 * Replaces ProtectedRoute/PublicRoute from old auth system.
 */

import React, { useEffect } from 'react';
import { useDevice } from '@/contexts/DeviceContext';
import { heartbeatWorker } from '@/workers/heartbeat-worker';
import { syncWorker } from '@/workers/sync-worker';
import { configFetcher } from '@/domain/use-cases/fetch-config';
import { Routes, Route, Navigate } from 'react-router-dom';
import SplashScreen from '@/pages/SplashScreen';
import ProvisioningScreen from '@/pages/ProvisioningScreen';
import ScanScreen from '@/pages/ScanScreen';
import DeviceLockedScreen from '@/pages/DeviceLockedScreen';
import DiagnosticsScreen from '@/pages/DiagnosticsScreen';
import NotFound from '@/pages/NotFound';

export function DeviceRouter() {
  const {
    deviceState,
    setDeviceStatus,
    updateConfig,
    setLastHeartbeat,
    setLastSync,
    setPendingCount,
  } = useDevice();

  // Start/stop workers based on device state
  useEffect(() => {
    if (deviceState === 'active' || deviceState === 'suspended') {
      // Heartbeat always runs (even when suspended, so backend can re-enable)
      heartbeatWorker.setCallbacks(setDeviceStatus, setLastHeartbeat);
      heartbeatWorker.start();

      // Config fetcher
      configFetcher.setCallback(updateConfig);
      configFetcher.start();
    }

    if (deviceState === 'active') {
      // Sync worker only when active
      syncWorker.setCallbacks(setLastSync, setPendingCount);
      syncWorker.start();
    } else {
      syncWorker.stop();
    }

    return () => {
      // Don't stop heartbeat on cleanup — it should keep running
    };
  }, [deviceState, setDeviceStatus, updateConfig, setLastHeartbeat, setLastSync, setPendingCount]);

  // Loading / splash
  if (deviceState === 'loading') {
    return <SplashScreen />;
  }

  // Route based on state
  return (
    <Routes>
      {/* Provisioning */}
      <Route
        path="/setup"
        element={
          deviceState === 'unprovisioned'
            ? <ProvisioningScreen />
            : <Navigate to="/" replace />
        }
      />

      {/* Main scan screen */}
      <Route
        path="/"
        element={
          deviceState === 'unprovisioned'
            ? <Navigate to="/setup" replace />
            : deviceState === 'suspended'
              ? <DeviceLockedScreen />
              : <ScanScreen />
        }
      />

      {/* Diagnostics */}
      <Route
        path="/diagnostics"
        element={
          deviceState === 'unprovisioned'
            ? <Navigate to="/setup" replace />
            : <DiagnosticsScreen />
        }
      />

      {/* Catch-all */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
