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
 * Debug info result from native SDK
 */
export interface DebugInfoResult {
  sdkAvailable: boolean;
  nativeLibsLoaded: boolean;
  isConnected: boolean;
  methods: string;
  currentMode?: string;
  lastKeyCode?: number;
  triggerKeyCodes?: string;
}

/**
 * Mivanta RFID Plugin Interface
 * Defines the contract between JavaScript and native Android code
 */
export interface MivantaRfidPlugin {
  connect(): Promise<ConnectionResult>;
  disconnect(): Promise<ConnectionResult>;
  readSingle(): Promise<SingleReadResult>;
  readTagDetails(): Promise<TagDetailsResult>;
  startContinuous(): Promise<ScanningResult>;
  stopContinuous(): Promise<ScanningResult>;
  setPower(options: { power: number }): Promise<PowerResult>;
  setMode(options: { mode: string }): Promise<ModeResult>;
  getStatus(): Promise<RfidStatus>;
  getDebugInfo(): Promise<DebugInfoResult>;

  addListener(
    eventName: 'tagDetected',
    listenerFunc: (data: RfidTagData) => void
  ): Promise<{ remove: () => void }>;

  removeAllListeners(): Promise<void>;
}

/**
 * Register the native plugin
 */
const MivantaRfid = registerPlugin<MivantaRfidPlugin>('MivantaRfid', {
  web: () => import('./rfid-web-mock').then(m => new m.MivantaRfidWeb()),
});

export default MivantaRfid;
