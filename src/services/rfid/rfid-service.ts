import MivantaRfid, { RfidTagData, RfidStatus, FastTagData, DebugInfoResult, TriggerEventData } from './mivanta-rfid-plugin';

export type RfidReadMode = 'single' | 'continuous';

// New event type for trigger-initiated scans
export interface TriggerScanResult {
  success: boolean;
  tid?: string;
  epc?: string;
  userData?: string;
  rssi?: number;
  timestamp: number;
  message?: string;
}

export interface RfidServiceCallbacks {
  onTagDetected?: (tag: RfidTagData) => void;
  onConnectionChange?: (connected: boolean) => void;
  onScanningChange?: (scanning: boolean) => void;
  onError?: (error: Error) => void;
  onTriggerPressed?: (data: TriggerEventData) => void;
  onTriggerReleased?: (data: TriggerEventData) => void;
  onTriggerScanResult?: (data: TriggerScanResult) => void;
}

/**
 * RFID Service for Impact ATMS
 * High-level service for managing RFID reader operations
 */
class RfidService {
  private static instance: RfidService;
  private callbacks: RfidServiceCallbacks = {};
  private listenerHandle: { remove: () => void } | null = null;
  private triggerPressedHandle: { remove: () => void } | null = null;
  private triggerReleasedHandle: { remove: () => void } | null = null;
  private triggerScanResultHandle: { remove: () => void } | null = null;
  private status: RfidStatus = {
    connected: false,
    scanning: false,
    power: 30
  };
  private currentMode: RfidReadMode = 'single';

  private constructor() {}

  static getInstance(): RfidService {
    if (!RfidService.instance) {
      RfidService.instance = new RfidService();
    }
    return RfidService.instance;
  }

  setCallbacks(callbacks: RfidServiceCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  clearCallbacks(): void {
    this.callbacks = {};
  }

  getStatus(): RfidStatus {
    return { ...this.status };
  }

  getMode(): RfidReadMode {
    return this.currentMode;
  }

  async setMode(mode: RfidReadMode): Promise<void> {
    this.currentMode = mode;
    try {
      await MivantaRfid.setMode({ mode });
      console.log('RFID Service: Mode set to', mode);
    } catch (error) {
      console.warn('RFID Service: Could not sync mode', error);
    }
  }

  async connect(): Promise<boolean> {
    try {
      const result = await MivantaRfid.connect();
      this.status.connected = result.connected;
      this.callbacks.onConnectionChange?.(result.connected);
      
      await this.setupTagListener();
      await this.setupTriggerListeners();
      await this.setMode(this.currentMode);
      
      console.log('RFID Service: Connected');
      return result.connected;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.callbacks.onError?.(err);
      console.error('RFID Service: Connection failed', error);
      return false;
    }
  }

  async disconnect(): Promise<void> {
    try {
      this.removeAllListeners();
      await MivantaRfid.disconnect();
      this.status.connected = false;
      this.status.scanning = false;
      this.callbacks.onConnectionChange?.(false);
      this.callbacks.onScanningChange?.(false);
      console.log('RFID Service: Disconnected');
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.callbacks.onError?.(err);
      console.error('RFID Service: Disconnect failed', error);
    }
  }
  
  private removeAllListeners(): void {
    if (this.listenerHandle) {
      this.listenerHandle.remove();
      this.listenerHandle = null;
    }
    if (this.triggerPressedHandle) {
      this.triggerPressedHandle.remove();
      this.triggerPressedHandle = null;
    }
    if (this.triggerReleasedHandle) {
      this.triggerReleasedHandle.remove();
      this.triggerReleasedHandle = null;
    }
    if (this.triggerScanResultHandle) {
      this.triggerScanResultHandle.remove();
      this.triggerScanResultHandle = null;
    }
  }

  async readSingle(): Promise<RfidTagData | null> {
    if (!this.status.connected) {
      this.callbacks.onError?.(new Error('Reader not connected'));
      return null;
    }

    try {
      const result = await MivantaRfid.readSingle();
      const tagData: RfidTagData = {
        epc: result.epc,
        rssi: result.rssi,
        timestamp: result.timestamp
      };
      
      this.callbacks.onTagDetected?.(tagData);
      console.log('RFID Service: Single read -', result.epc);
      return tagData;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.callbacks.onError?.(err);
      console.error('RFID Service: Single read failed', error);
      return null;
    }
  }

  async readTagDetails(): Promise<FastTagData | null> {
    if (!this.status.connected) {
      this.callbacks.onError?.(new Error('Reader not connected'));
      return null;
    }

    try {
      const result = await MivantaRfid.readTagDetails();
      
      if (!result.success) {
        console.log('RFID Service: No tag detected');
        return null;
      }
      
      const fastTagData: FastTagData = {
        tid: result.tid,
        epc: result.epc,
        userData: result.userData,
        rssi: result.rssi,
        timestamp: result.timestamp
      };
      
      console.log('RFID Service: Tag details -', 
        `TID: ${result.tid}, EPC: ${result.epc}, User: ${result.userData}`);
      
      return fastTagData;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.callbacks.onError?.(err);
      console.error('RFID Service: Read tag details failed', error);
      return null;
    }
  }

  async startContinuous(): Promise<boolean> {
    if (!this.status.connected) {
      this.callbacks.onError?.(new Error('Reader not connected'));
      return false;
    }

    try {
      await MivantaRfid.startContinuous();
      this.status.scanning = true;
      this.callbacks.onScanningChange?.(true);
      console.log('RFID Service: Continuous scanning started');
      return true;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.callbacks.onError?.(err);
      console.error('RFID Service: Start continuous failed', error);
      return false;
    }
  }

  async stopContinuous(): Promise<void> {
    try {
      await MivantaRfid.stopContinuous();
      this.status.scanning = false;
      this.callbacks.onScanningChange?.(false);
      console.log('RFID Service: Scanning stopped');
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.callbacks.onError?.(err);
      console.error('RFID Service: Stop continuous failed', error);
    }
  }

  async setPower(power: number): Promise<boolean> {
    if (!this.status.connected) {
      this.callbacks.onError?.(new Error('Reader not connected'));
      return false;
    }

    try {
      await MivantaRfid.setPower({ power });
      this.status.power = power;
      console.log('RFID Service: Power set to', power, 'dBm');
      return true;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.callbacks.onError?.(err);
      console.error('RFID Service: Set power failed', error);
      return false;
    }
  }

  async refreshStatus(): Promise<RfidStatus> {
    try {
      this.status = await MivantaRfid.getStatus();
      return { ...this.status };
    } catch (error) {
      console.error('RFID Service: Get status failed', error);
      return { ...this.status };
    }
  }

  async getDebugInfo(): Promise<DebugInfoResult> {
    try {
      return await MivantaRfid.getDebugInfo();
    } catch (error) {
      console.error('RFID Service: Get debug info failed', error);
      return {
        sdkAvailable: false,
        nativeLibsLoaded: false,
        isConnected: false,
        methods: 'Error: ' + String(error)
      };
    }
  }

  private async setupTagListener(): Promise<void> {
    if (this.listenerHandle) {
      this.listenerHandle.remove();
    }

    this.listenerHandle = await MivantaRfid.addListener('tagDetected', (tagData) => {
      console.log('RFID Service: Tag detected -', tagData.epc);
      this.callbacks.onTagDetected?.(tagData);
    });
  }

  private async setupTriggerListeners(): Promise<void> {
    if (this.triggerPressedHandle) {
      this.triggerPressedHandle.remove();
    }
    if (this.triggerReleasedHandle) {
      this.triggerReleasedHandle.remove();
    }
    if (this.triggerScanResultHandle) {
      this.triggerScanResultHandle.remove();
    }

    this.triggerPressedHandle = await MivantaRfid.addListener('triggerPressed', (data) => {
      console.log('RFID Service: Trigger pressed -', data);
      this.callbacks.onTriggerPressed?.(data);
    });

    this.triggerReleasedHandle = await MivantaRfid.addListener('triggerReleased', (data) => {
      console.log('RFID Service: Trigger released -', data);
      this.callbacks.onTriggerReleased?.(data);
    });

    // Listen for scan results from physical trigger
    this.triggerScanResultHandle = await MivantaRfid.addListener('triggerScanResult', (data: TriggerScanResult) => {
      console.log('RFID Service: Trigger scan result -', data);
      this.callbacks.onTriggerScanResult?.(data);
    });
  }
}

export const rfidService = RfidService.getInstance();
export default rfidService;

export type { RfidTagData, RfidStatus, FastTagData, DebugInfoResult, TriggerEventData };
