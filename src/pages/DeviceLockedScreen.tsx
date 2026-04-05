import React from 'react';
import { useDevice } from '@/contexts/DeviceContext';
import { Lock, AlertTriangle } from 'lucide-react';
import logoLight from '@/assets/logo-light.png';
import AdminEscapeWrapper from '@/components/app/AdminEscapeWrapper';

/**
 * Shown when backend returns SUSPENDED status.
 * Heartbeat continues in background so backend can re-enable.
 */
const DeviceLockedScreen = () => {
  const { suspendMessage, deviceId } = useDevice();

  return (
    <div className="min-h-screen bg-destructive/5 flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-sm space-y-6">
        <img src={logoLight} alt="Impact ATMS" className="h-10 w-auto mx-auto dark:hidden" />

        <div className="flex items-center justify-center">
          <div className="h-20 w-20 rounded-full bg-destructive/15 flex items-center justify-center">
            <Lock className="h-10 w-10 text-destructive" />
          </div>
        </div>

        <div>
          <h1 className="text-2xl font-bold text-foreground">Device Suspended</h1>
          <p className="text-sm text-muted-foreground mt-2">
            This device has been suspended by the administrator.
          </p>
        </div>

        {suspendMessage && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm text-left">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{suspendMessage}</span>
          </div>
        )}

        {deviceId && (
          <p className="text-xs text-muted-foreground">
            Device ID: {deviceId}
          </p>
        )}

        <p className="text-xs text-muted-foreground">
          Contact your administrator to restore access. The device will automatically resume when re-enabled.
        </p>
      </div>
    </div>
  );
};

export default DeviceLockedScreen;
