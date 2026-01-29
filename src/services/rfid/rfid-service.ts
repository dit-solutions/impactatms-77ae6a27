import MivantaRfid, { RfidTagData, RfidStatus, FastTagData, DebugInfoResult } from './mivanta-rfid-plugin';

export type RfidReadMode = 'single' | 'continuous';

export interface RfidServiceCallbacks {
  onTagDetected?: (tag: RfidTagData) => void;
  onConnectionChange?: (connected: boolean) => void;
  onScanningChange?: (scanning: boolean) => void;
  onError?: (error: Error) => void;
}

/**
 * RFID Service
 * High-level service for managing RFID reader operations
 * Use this in your React components instead of calling the plugin directly
 */
class RfidService {
  private static instance: RfidService;
  private callbacks: RfidServiceCallbacks = {};
  private listenerHandle: { remove: () => void } | null = null;
  private status: RfidStatus = {
    connected: false,
    scanning: false,
    power: 30
  };

  private constructor() {
    // Private constructor for singleton
  }

  static getInstance(): RfidService {
    if (!RfidService.instance) {
      RfidService.instance = new RfidService();
    }
    return RfidService.instance;
  }

  /**
   * Set callbacks for RFID events
   */
  setCallbacks(callbacks: RfidServiceCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  /**
   * Clear all callbacks
   */
  clearCallbacks(): void {
    this.callbacks = {};
  }

  /**
   * Get current reader status
   */
  getStatus(): RfidStatus {
    return { ...this.status };
  }

  /**
   * Connect to the RFID reader
   */
  async connect(): Promise<boolean> {
    try {
      const result = await MivantaRfid.connect();
      this.status.connected = result.connected;
      this.callbacks.onConnectionChange?.(result.connected);
      
      // Set up tag detection listener
      await this.setupTagListener();
      
      console.log('RFID Service: Connected');
      return result.connected;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.callbacks.onError?.(err);
      console.error('RFID Service: Connection failed', error);
      return false;
    }
  }

  /**
   * Disconnect from the RFID reader
   */
  async disconnect(): Promise<void> {
    try {
      // Remove listener first
      if (this.listenerHandle) {
        this.listenerHandle.remove();
        this.listenerHandle = null;
      }
      
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

  /**
   * Perform a single tag read
   */
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
      
      // Notify callback
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

  /**
   * Read complete FASTag details including TID, EPC, and User memory
   * @returns FastTagData with all memory bank contents
   */
  async readTagDetails(): Promise<FastTagData | null> {
    if (!this.status.connected) {
      this.callbacks.onError?.(new Error('Reader not connected'));
      return null;
    }

    try {
      const result = await MivantaRfid.readTagDetails();
      
      if (!result.success) {
        console.log('RFID Service: No tag detected for detailed read');
        return null;
      }
      
      const fastTagData: FastTagData = {
        tid: result.tid,
        epc: result.epc,
        userData: result.userData,
        rssi: result.rssi,
        timestamp: result.timestamp
      };
      
      console.log('RFID Service: Tag details read -', 
        `TID: ${result.tid}, EPC: ${result.epc}, User: ${result.userData}`);
      
      return fastTagData;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.callbacks.onError?.(err);
      console.error('RFID Service: Read tag details failed', error);
      return null;
    }
  }

  /**
   * Start continuous inventory scanning
   */
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

  /**
   * Stop continuous inventory scanning
   */
  async stopContinuous(): Promise<void> {
    try {
      await MivantaRfid.stopContinuous();
      this.status.scanning = false;
      this.callbacks.onScanningChange?.(false);
      
      console.log('RFID Service: Continuous scanning stopped');
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.callbacks.onError?.(err);
      console.error('RFID Service: Stop continuous failed', error);
    }
  }

  /**
   * Set reader power level (affects read range)
   * @param power Power in dBm (5-33)
   */
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

  /**
   * Refresh status from the native plugin
   */
  async refreshStatus(): Promise<RfidStatus> {
    try {
      this.status = await MivantaRfid.getStatus();
      return { ...this.status };
    } catch (error) {
      console.error('RFID Service: Get status failed', error);
      return { ...this.status };
    }
  }

  /**
   * Get debug information from native SDK
   */
  async getDebugInfo(): Promise<DebugInfoResult> {
    try {
      return await MivantaRfid.getDebugInfo();
    } catch (error) {
      console.error('RFID Service: Get debug info failed', error);
      return {
        sdkAvailable: false,
        nativeLibsLoaded: false,
        isConnected: false,
        methods: 'Error getting debug info: ' + String(error)
      };
    }
  }

  /**
   * Set up listener for tag detection events
   */
  private async setupTagListener(): Promise<void> {
    // Remove existing listener if any
    if (this.listenerHandle) {
      this.listenerHandle.remove();
    }

    this.listenerHandle = await MivantaRfid.addListener('tagDetected', (tagData) => {
      console.log('RFID Service: Tag detected -', tagData.epc);
      this.callbacks.onTagDetected?.(tagData);
    });
  }
}

// Export singleton instance
export const rfidService = RfidService.getInstance();
export default rfidService;

// Re-export types
export type { RfidTagData, RfidStatus, FastTagData, DebugInfoResult };
