// RFID Service exports
export { rfidService, default } from './rfid-service';
export type { RfidTagData, RfidStatus, RfidReadMode, RfidServiceCallbacks } from './rfid-service';
export type { 
  MivantaRfidPlugin,
  ConnectionResult,
  SingleReadResult,
  ScanningResult,
  PowerResult 
} from './mivanta-rfid-plugin';
