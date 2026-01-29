import { registerPlugin } from '@capacitor/core';

/**
 * Tag data received from RFID reader
 */
export interface RfidTagData {
  epc: string;
  rssi?: number;
  count?: number;
  timestamp: number;
}

/**
 * Reader status information
 */
export interface RfidStatus {
  connected: boolean;
  scanning: boolean;
  power: number;
}

/**
 * Connection result
 */
export interface ConnectionResult {
  connected: boolean;
  message: string;
}

/**
 * Single read result
 */
export interface SingleReadResult {
  success: boolean;
  epc: string;
  timestamp: number;
}

/**
 * Scanning state result
 */
export interface ScanningResult {
  scanning: boolean;
  message: string;
}

/**
 * Power setting result
 */
export interface PowerResult {
  power: number;
  message: string;
}

/**
 * Mivanta RFID Plugin Interface
 * Defines the contract between JavaScript and native Android code
 */
export interface MivantaRfidPlugin {
  /**
   * Connect to the UHF RFID module
   */
  connect(): Promise<ConnectionResult>;
  
  /**
   * Disconnect from the UHF RFID module
   */
  disconnect(): Promise<ConnectionResult>;
  
  /**
   * Perform a single tag read (button-triggered)
   */
  readSingle(): Promise<SingleReadResult>;
  
  /**
   * Start continuous inventory scanning
   * Listen for 'tagDetected' events for incoming tags
   */
  startContinuous(): Promise<ScanningResult>;
  
  /**
   * Stop continuous inventory scanning
   */
  stopContinuous(): Promise<ScanningResult>;
  
  /**
   * Set the reader power level (affects read range)
   * @param options Power level in dBm (5-33)
   */
  setPower(options: { power: number }): Promise<PowerResult>;
  
  /**
   * Get current connection and scanning status
   */
  getStatus(): Promise<RfidStatus>;
  
  /**
   * Add listener for tag detection events
   */
  addListener(
    eventName: 'tagDetected',
    listenerFunc: (data: RfidTagData) => void
  ): Promise<{ remove: () => void }>;
  
  /**
   * Remove all listeners
   */
  removeAllListeners(): Promise<void>;
}

/**
 * Register the native plugin
 * This connects to the Java MivantaRfidPlugin class
 */
const MivantaRfid = registerPlugin<MivantaRfidPlugin>('MivantaRfid', {
  web: () => import('./rfid-web-mock').then(m => new m.MivantaRfidWeb()),
});

export default MivantaRfid;
