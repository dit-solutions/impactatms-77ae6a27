/**
 * DeviceRouter — handles navigation based on device state + Android back button.
 */

import React, { useEffect, useRef } from 'react';
import { useDevice } from '@/contexts/DeviceContext';
import { heartbeatWorker } from '@/workers/heartbeat-worker';
import { syncWorker } from '@/workers/sync-worker';
import { configFetcher } from '@/domain/use-cases/fetch-config';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { App } from '@capacitor/app';
import { useToast } from '@/hooks/use-toast';
import { getAppVersion, isNativeApp, checkForUpdates, downloadAndInstallUpdate } from '@/services/app-update/app-update-service';
import SplashScreen from '@/pages/SplashScreen';
import ProvisioningScreen from '@/pages/ProvisioningScreen';
import LoginScreen from '@/pages/LoginScreen';
import ScanScreen from '@/pages/ScanScreen';
import DeviceLockedScreen from '@/pages/DeviceLockedScreen';
import DiagnosticsScreen from '@/pages/DiagnosticsScreen';

export function DeviceRouter() {
  const {
    deviceState,
    updateConfig,
    setLastHeartbeat,
    setLastSync,
    setPendingCount,
    handleConfigVersions,
    fetchLanes,
  } = useDevice();

  const location = useLocation();
  const navigate = useNavigate();
  const locationRef = useRef(location.pathname);
  locationRef.current = location.pathname;

  // Android hardware back button — registered once, reads path via ref
  useEffect(() => {
    const listener = App.addListener('backButton', () => {
      try {
        const path = locationRef.current;
        // On sub-pages, navigate home; on root pages, do nothing (stay in app)
        if (path !== '/' && path !== '/setup' && path !== '/login') {
          navigate('/');
        }
      } catch (e) {
        // Prevent ANR from unhandled native errors
      }
    });

    return () => {
      listener.then(l => l.remove());
    };
  }, [navigate]);

  // Start/stop workers based on device state
  useEffect(() => {
    if (deviceState === 'active') {
      heartbeatWorker.setCallbacks(handleConfigVersions, setLastHeartbeat);
      heartbeatWorker.start();

      configFetcher.setCallback(updateConfig);
      configFetcher.start();

      syncWorker.setCallbacks(setLastSync, setPendingCount);
      syncWorker.start();

      // Fetch lanes on login
      fetchLanes();
    }

    return () => {};
  }, [deviceState, handleConfigVersions, updateConfig, setLastHeartbeat, setLastSync, setPendingCount, fetchLanes]);

  if (deviceState === 'loading') {
    return <SplashScreen />;
  }

  return (
    <Routes>
      <Route
        path="/setup"
        element={
          deviceState === 'unprovisioned'
            ? <ProvisioningScreen />
            : <Navigate to="/" replace />
        }
      />

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

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
