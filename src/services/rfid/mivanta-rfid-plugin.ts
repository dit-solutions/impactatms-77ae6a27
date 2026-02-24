import { registerPlugin } from '@capacitor/core';

/**
 * Tag data received from RFID reader
 */
export interface RfidTagData {
  epc: string;
  rssi?: number;
  count?: number;
  timestamp: number;
  /** TID from memory bank (optional, present for FASTag reads) */
  tid?: string;
  /** User memory bank data (optional, present for FASTag reads) */
  userData?: string;
}

/**
 * Complete FASTag data with TID, EPC, and User memory
 */
export interface FastTagData {
  /** Tag Identifier - unique chip ID (24 hex chars from TID bank) */
  tid: string;
  /** Electronic Product Code - vehicle identifier (24 hex chars from EPC bank) */
  epc: string;
  /** User memory bank data (up to 64 hex chars) */
  userData: string;
  /** Signal strength in dBm */
  rssi?: number;
  /** Detection timestamp */
  timestamp: number;
}

/**
 * Reader status information
 */
export interface RfidStatus {
  connected: boolean;
  scanning: boolean;
  power: number;
  mode?: string;
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
  rssi?: number;
  timestamp: number;
}

/**
 * Detailed tag read result
 */
export interface TagDetailsResult {
  success: boolean;
  tid: string;
  epc: string;
  userData: string;
  rssi?: number;
  timestamp: number;
  message?: string;
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
 * Mode setting result
 */
export interface ModeResult {
  mode: string;
}

/**
 * Trigger event data from hardware button
 */
export interface TriggerEventData {
  action: 'trigger_pressed' | 'trigger_released';
  mode: string;
  isScanning?: boolean;
  keyCode?: number;
}

/**
 * Trigger scan result from physical button scan
 */
export interface TriggerScanResult {
  success: boolean;
  tid?: string;
  epc?: string;
  userData?: string;
  rssi?: number;
  timestamp: number;
  message?: string;
}

/**
 * Debug info result from native SDK
 */
export interface DebugInfoResult {
  sdkAvailable: boolean;
  nativeLibsLoaded: boolean;
  isConnected: boolean;
  methods: string;
  currentMode?: string;
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
   * Read complete FASTag data including TID, EPC, and User memory
   * This performs inventory + reads from TID, EPC, and User memory banks
   */
  readTagDetails(): Promise<TagDetailsResult>;
  
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
   * Set the current read mode (for hardware button behavior)
   * @param options Mode: 'single' or 'continuous'
   */
  setMode(options: { mode: string }): Promise<ModeResult>;
  
  /**
   * Get current connection and scanning status
   */
  getStatus(): Promise<RfidStatus>;
  
  /**
   * Get debug information from native SDK (methods, status)
   */
  getDebugInfo(): Promise<DebugInfoResult>;
  
  /**
   * Add listener for tag detection events
   */
  addListener(
    eventName: 'tagDetected',
    listenerFunc: (data: RfidTagData) => void
  ): Promise<{ remove: () => void }>;
  
  /**
   * Add listener for hardware trigger button events
   */
  addListener(
    eventName: 'triggerPressed',
    listenerFunc: (data: TriggerEventData) => void
  ): Promise<{ remove: () => void }>;
  
  /**
   * Add listener for hardware trigger button release events
   */
  addListener(
    eventName: 'triggerReleased',
    listenerFunc: (data: TriggerEventData) => void
  ): Promise<{ remove: () => void }>;
  
  /**
   * Add listener for trigger scan result (from physical button)
   */
  addListener(
    eventName: 'triggerScanResult',
    listenerFunc: (data: TriggerScanResult) => void
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
