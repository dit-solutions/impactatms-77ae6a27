// RFID Service exports
export { rfidService, default } from './rfid-service';
export type { RfidReadMode, RfidServiceCallbacks, TriggerScanResult } from './rfid-service';
export type { 
  RfidTagData, 
  RfidStatus, 
  FastTagData, 
  DebugInfoResult, 
  TriggerEventData,
  KeyEventData,
  TriggerKeyCodesResult,
  TriggerScanResult as PluginTriggerScanResult,
  MivantaRfidPlugin,
  ConnectionResult,
  SingleReadResult,
  TagDetailsResult,
  ScanningResult,
  PowerResult,
  ModeResult
} from './mivanta-rfid-plugin';
