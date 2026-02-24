/**
 * DeviceRouter — handles navigation based on device state.
 */

import React, { useEffect } from 'react';
import { useDevice } from '@/contexts/DeviceContext';
import { heartbeatWorker } from '@/workers/heartbeat-worker';
import { syncWorker } from '@/workers/sync-worker';
import { configFetcher } from '@/domain/use-cases/fetch-config';
import { Routes, Route, Navigate } from 'react-router-dom';
import SplashScreen from '@/pages/SplashScreen';
import ProvisioningScreen from '@/pages/ProvisioningScreen';
import LoginScreen from '@/pages/LoginScreen';
import ScanScreen from '@/pages/ScanScreen';
import DeviceLockedScreen from '@/pages/DeviceLockedScreen';
import DiagnosticsScreen from '@/pages/DiagnosticsScreen';


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
      heartbeatWorker.setCallbacks(setDeviceStatus, setLastHeartbeat);
      heartbeatWorker.start();

      configFetcher.setCallback(updateConfig);
      configFetcher.start();
    }

    if (deviceState === 'active') {
      syncWorker.setCallbacks(setLastSync, setPendingCount);
      syncWorker.start();
    } else {
      syncWorker.stop();
    }

    return () => {};
  }, [deviceState, setDeviceStatus, updateConfig, setLastHeartbeat, setLastSync, setPendingCount]);

  // Loading / splash
  if (deviceState === 'loading') {
    return <SplashScreen />;
  }

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

      {/* Login */}
      <Route
        path="/login"
        element={
          deviceState === 'provisioned'
            ? <LoginScreen />
            : deviceState === 'unprovisioned'
              ? <Navigate to="/setup" replace />
              : <Navigate to="/" replace />
        }
      />

      {/* Main scan screen */}
      <Route
        path="/"
        element={
          deviceState === 'unprovisioned'
            ? <Navigate to="/setup" replace />
            : deviceState === 'provisioned'
              ? <Navigate to="/login" replace />
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
            : deviceState === 'provisioned'
              ? <Navigate to="/login" replace />
              : <DiagnosticsScreen />
        }
      />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
