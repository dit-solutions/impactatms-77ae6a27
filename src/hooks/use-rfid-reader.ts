import { useState, useEffect, useCallback } from 'react';
import { rfidService, RfidTagData, RfidStatus, RfidReadMode, FastTagData } from '@/services/rfid';
import { toast } from '@/hooks/use-toast';

interface UseRfidReaderReturn {
  // Status
  isConnected: boolean;
  isScanning: boolean;
  power: number;
  mode: RfidReadMode;
  
  // Tag data
  lastTag: RfidTagData | null;
  lastFastTag: FastTagData | null;
  tagHistory: RfidTagData[];
  fastTagHistory: FastTagData[];
  
  // Actions
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  readSingle: () => Promise<void>;
  readTagDetails: () => Promise<FastTagData | null>;
  startContinuous: () => Promise<void>;
  stopContinuous: () => Promise<void>;
  setPower: (power: number) => Promise<void>;
  setMode: (mode: RfidReadMode) => void;
  clearHistory: () => void;
}

/**
 * React hook for RFID reader operations
 * Provides easy integration with UI components
 */
export function useRfidReader(
  onTagDetected?: (tag: RfidTagData) => void
): UseRfidReaderReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [power, setPowerState] = useState(30);
  const [mode, setMode] = useState<RfidReadMode>('single');
  const [lastTag, setLastTag] = useState<RfidTagData | null>(null);
  const [lastFastTag, setLastFastTag] = useState<FastTagData | null>(null);
  const [tagHistory, setTagHistory] = useState<RfidTagData[]>([]);
  const [fastTagHistory, setFastTagHistory] = useState<FastTagData[]>([]);

  // Set up service callbacks
  useEffect(() => {
    rfidService.setCallbacks({
      onTagDetected: (tag) => {
        setLastTag(tag);
        setTagHistory(prev => [tag, ...prev].slice(0, 100)); // Keep last 100 tags
        onTagDetected?.(tag);
      },
      onConnectionChange: setIsConnected,
      onScanningChange: setIsScanning,
      onError: (error) => {
        toast({
          title: 'RFID Error',
          description: error.message,
          variant: 'destructive'
        });
      }
    });

    // Initial status sync
    const syncStatus = async () => {
      const status = await rfidService.refreshStatus();
      setIsConnected(status.connected);
      setIsScanning(status.scanning);
      setPowerState(status.power);
    };
    syncStatus();

    return () => {
      rfidService.clearCallbacks();
    };
  }, [onTagDetected]);

  const connect = useCallback(async () => {
    const success = await rfidService.connect();
    if (success) {
      toast({
        title: 'Connected',
        description: 'RFID reader connected successfully'
      });
    }
  }, []);

  const disconnect = useCallback(async () => {
    await rfidService.disconnect();
    toast({
      title: 'Disconnected',
      description: 'RFID reader disconnected'
    });
  }, []);

  const readSingle = useCallback(async () => {
    const tag = await rfidService.readSingle();
    if (tag) {
      toast({
        title: 'Tag Detected',
        description: `EPC: ${tag.epc.substring(0, 16)}...`
      });
    }
  }, []);

  const readTagDetails = useCallback(async (): Promise<FastTagData | null> => {
    const fastTag = await rfidService.readTagDetails();
    if (fastTag) {
      setLastFastTag(fastTag);
      setFastTagHistory(prev => [fastTag, ...prev].slice(0, 100));
      toast({
        title: 'FASTag Read',
        description: `TID: ${fastTag.tid.substring(0, 12)}...`
      });
    } else {
      toast({
        title: 'No Tag Found',
        description: 'No FASTag detected. Try again.',
        variant: 'destructive'
      });
    }
    return fastTag;
  }, []);

  const startContinuous = useCallback(async () => {
    await rfidService.startContinuous();
  }, []);

  const stopContinuous = useCallback(async () => {
    await rfidService.stopContinuous();
  }, []);

  const setPower = useCallback(async (newPower: number) => {
    const success = await rfidService.setPower(newPower);
    if (success) {
      setPowerState(newPower);
    }
  }, []);

  const clearHistory = useCallback(() => {
    setTagHistory([]);
    setFastTagHistory([]);
    setLastTag(null);
    setLastFastTag(null);
  }, []);

  return {
    isConnected,
    isScanning,
    power,
    mode,
    lastTag,
    lastFastTag,
    tagHistory,
    fastTagHistory,
    connect,
    disconnect,
    readSingle,
    readTagDetails,
    startContinuous,
    stopContinuous,
    setPower,
    setMode,
    clearHistory
  };
}
