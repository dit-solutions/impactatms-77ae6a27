import { useState, useEffect, useCallback } from 'react';
import { rfidService, RfidReadMode } from '@/services/rfid';

/**
 * Shared hook for RFID reader settings (power, mode)
 * Can be used from Settings page or anywhere else
 */
export function useRfidSettings() {
  const [power, setPowerState] = useState(30);
  const [mode, setModeState] = useState<RfidReadMode>('single');
  const [isConnected, setIsConnected] = useState(false);

  const refreshStatus = useCallback(async () => {
    const status = await rfidService.refreshStatus();
    setIsConnected(status.connected);
    setPowerState(status.power);
  }, []);

  // Sync with service status on mount
  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  const setPower = useCallback(async (newPower: number) => {
    setPowerState(newPower);
    // If connected, apply immediately
    const status = await rfidService.refreshStatus();
    if (status.connected) {
      await rfidService.setPower(newPower);
    }
  }, []);

  const setMode = useCallback((newMode: RfidReadMode) => {
    setModeState(newMode);
  }, []);

  return {
    power,
    mode,
    isConnected,
    setPower,
    setMode,
    refreshStatus
  };
}
