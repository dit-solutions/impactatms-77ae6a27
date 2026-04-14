import { useState, useEffect, useCallback, useRef } from 'react';
import { rfidService, RfidTagData, RfidStatus, RfidReadMode, FastTagData } from '@/services/rfid';
import { toast } from '@/hooks/use-toast';

interface UseRfidReaderReturn {
  isConnected: boolean;
  isScanning: boolean;
  power: number;
  mode: RfidReadMode;
  lastTag: RfidTagData | null;
  lastFastTag: FastTagData | null;
  tagHistory: RfidTagData[];
  fastTagHistory: FastTagData[];
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  readSingle: () => Promise<void>;
  readSingleWithDetails: () => Promise<void>;
  readTagDetails: () => Promise<FastTagData | null>;
  startContinuous: () => Promise<void>;
  stopContinuous: () => Promise<void>;
  setPower: (power: number) => Promise<void>;
  setMode: (mode: RfidReadMode) => void;
  clearHistory: () => void;
}

export function useRfidReader(
  onTagDetected?: (tag: RfidTagData) => void
): UseRfidReaderReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [power, setPowerState] = useState(30);
  const [mode, setModeState] = useState<RfidReadMode>('single');
  const [lastTag, setLastTag] = useState<RfidTagData | null>(null);
  const [lastFastTag, setLastFastTag] = useState<FastTagData | null>(null);
  const [tagHistory, setTagHistory] = useState<RfidTagData[]>([]);
  const [fastTagHistory, setFastTagHistory] = useState<FastTagData[]>([]);

  // Stable refs for callbacks to prevent useEffect re-runs
  const onTagDetectedRef = useRef(onTagDetected);
  onTagDetectedRef.current = onTagDetected;

  // Set up service callbacks — runs ONCE on mount
  useEffect(() => {
    rfidService.setCallbacks({
      onTagDetected: (tag) => {
        setLastTag(tag);
        setTagHistory(prev => [tag, ...prev].slice(0, 2));
        onTagDetectedRef.current?.(tag);
      },
      onConnectionChange: setIsConnected,
      onScanningChange: setIsScanning,
      onError: (error) => {
        toast({
          title: 'Error',
          description: error.message,
          variant: 'destructive'
        });
      }
    });

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
  }, []);

  const connect = useCallback(async () => {
    const success = await rfidService.connect();
    if (success) {
      toast({
        title: 'Connected',
        description: 'RFID reader ready'
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
        title: 'Tag Found',
        description: `EPC: ${tag.epc.substring(0, 12)}...`
      });
    }
  }, []);

  const readSingleWithDetails = useCallback(async () => {
    const fastTag = await rfidService.readTagDetails();
    
    if (fastTag) {
      const fullTag: RfidTagData = {
        epc: fastTag.epc,
        rssi: fastTag.rssi,
        timestamp: fastTag.timestamp,
        tid: fastTag.tid,
        userData: fastTag.userData,
      };

      // Update UI state first, then fire callback
      setLastFastTag(fastTag);
      setFastTagHistory(prev => [fastTag, ...prev].slice(0, 2));
      setLastTag(fullTag);
      setTagHistory(prev => [fullTag, ...prev].slice(0, 2));
      
      const hasAllData = fastTag.tid && fastTag.userData;
      if (hasAllData) {
        toast({
          title: 'FASTag Complete',
          description: 'TID, EPC, User data captured'
        });
      } else {
        toast({
          title: 'Tag Found',
          description: `EPC: ${fastTag.epc.substring(0, 12)}...`
        });
      }

      // Callback last — captureRead is now non-blocking
      onTagDetectedRef.current?.(fullTag);
    } else {
      toast({
        title: 'No Tag',
        description: 'Hold tag closer',
        variant: 'destructive'
      });
    }
  }, []);

  const readTagDetails = useCallback(async (): Promise<FastTagData | null> => {
    const fastTag = await rfidService.readTagDetails();
    if (fastTag) {
      setLastFastTag(fastTag);
      setFastTagHistory(prev => [fastTag, ...prev].slice(0, 2));
      toast({
        title: 'FASTag Read',
        description: `EPC: ${fastTag.epc.substring(0, 12)}...`
      });
    } else {
      toast({
        title: 'No Tag',
        description: 'No tag detected',
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

  const setMode = useCallback((newMode: RfidReadMode) => {
    setModeState(newMode);
    rfidService.setMode(newMode);
    
    if (newMode === 'single' && isScanning) {
      rfidService.stopContinuous();
    }
  }, [isScanning]);

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
    readSingleWithDetails,
    readTagDetails,
    startContinuous,
    stopContinuous,
    setPower,
    setMode,
    clearHistory
  };
}
