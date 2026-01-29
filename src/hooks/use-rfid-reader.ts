import { useState, useEffect, useCallback } from 'react';
import { rfidService, RfidTagData, RfidStatus, RfidReadMode, FastTagData, TriggerEventData } from '@/services/rfid';
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
  readSingleWithDetails: () => Promise<void>;
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
  const [mode, setModeState] = useState<RfidReadMode>('single');
  const [lastTag, setLastTag] = useState<RfidTagData | null>(null);
  const [lastFastTag, setLastFastTag] = useState<FastTagData | null>(null);
  const [tagHistory, setTagHistory] = useState<RfidTagData[]>([]);
  const [fastTagHistory, setFastTagHistory] = useState<FastTagData[]>([]);

  // Handler for hardware trigger button
  const handleTriggerPressed = useCallback(async (data: TriggerEventData) => {
    console.log('Trigger pressed, mode:', data.mode, 'isScanning:', data.isScanning);
    
    if (data.mode === 'single') {
      // Single mode: perform single read on trigger press
      try {
        const fastTag = await rfidService.readTagDetails();
        if (fastTag) {
          setLastFastTag(fastTag);
          setFastTagHistory(prev => [fastTag, ...prev].slice(0, 100));
          
          const basicTag: RfidTagData = {
            epc: fastTag.epc,
            rssi: fastTag.rssi,
            timestamp: fastTag.timestamp
          };
          setLastTag(basicTag);
          setTagHistory(prev => [basicTag, ...prev].slice(0, 100));
          onTagDetected?.(basicTag);
          
          toast({
            title: 'Tag Scanned',
            description: `EPC: ${fastTag.epc.substring(0, 16)}...`
          });
        }
      } catch (error) {
        console.error('Trigger scan failed:', error);
      }
    } else {
      // Continuous mode: toggle scanning
      if (!data.isScanning) {
        await rfidService.startContinuous();
        toast({
          title: 'Scanning Started',
          description: 'Continuous scanning active'
        });
      }
      // In continuous mode, scanning continues until mode is changed back to single
    }
  }, [onTagDetected]);

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
      },
      onTriggerPressed: handleTriggerPressed,
      onTriggerReleased: (data) => {
        console.log('Trigger released:', data);
        // For single mode, no action on release
        // For continuous mode, keep scanning until mode changes
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
  }, [onTagDetected, handleTriggerPressed]);

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

  /**
   * Read single tag AND attempt to read FASTag details
   * This populates both Raw Data and FASTag tabs
   */
  const readSingleWithDetails = useCallback(async () => {
    // First try to read full FASTag details (includes EPC)
    const fastTag = await rfidService.readTagDetails();
    
    if (fastTag) {
      // Add to FASTag history
      setLastFastTag(fastTag);
      setFastTagHistory(prev => [fastTag, ...prev].slice(0, 100));
      
      // Also add to basic tag history (Raw Data)
      const basicTag: RfidTagData = {
        epc: fastTag.epc,
        rssi: fastTag.rssi,
        timestamp: fastTag.timestamp
      };
      setLastTag(basicTag);
      setTagHistory(prev => [basicTag, ...prev].slice(0, 100));
      onTagDetected?.(basicTag);
      
      // Show what we got
      const hasAllData = fastTag.tid && fastTag.userData;
      const hasTidOnly = fastTag.tid && !fastTag.userData;
      const hasUserOnly = !fastTag.tid && fastTag.userData;
      
      if (hasAllData) {
        toast({
          title: 'FASTag Read Complete',
          description: `TID, EPC, and User data captured`
        });
      } else if (hasTidOnly) {
        toast({
          title: 'FASTag Read (Partial)',
          description: `TID and EPC captured. User data not available.`
        });
      } else if (hasUserOnly) {
        toast({
          title: 'FASTag Read (Partial)',
          description: `EPC and User data captured. TID not available.`
        });
      } else {
        toast({
          title: 'Tag Detected',
          description: `EPC only - TID/User banks may be protected`
        });
      }
    } else {
      toast({
        title: 'No Tag Found',
        description: 'Hold tag closer and try again',
        variant: 'destructive'
      });
    }
  }, [onTagDetected]);

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

  // Set mode and sync to native plugin
  const setMode = useCallback((newMode: RfidReadMode) => {
    setModeState(newMode);
    rfidService.setMode(newMode);
    
    // If switching from continuous to single and currently scanning, stop scanning
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
