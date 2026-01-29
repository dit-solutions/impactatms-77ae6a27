// RFID Service exports
export { rfidService, default } from './rfid-service';
export type { RfidTagData, RfidStatus, FastTagData, DebugInfoResult, RfidReadMode, RfidServiceCallbacks, TriggerEventData } from './rfid-service';
export type { 
  MivantaRfidPlugin,
  ConnectionResult,
  SingleReadResult,
  TagDetailsResult,
  ScanningResult,
  PowerResult,
  ModeResult
} from './mivanta-rfid-plugin';
