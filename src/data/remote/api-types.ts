// ========== API Data Transfer Objects ==========

// --- Provisioning ---

export interface ProvisionRequest {
  provisioning_token: string;
  android_id: string;
  model: string;
  os_version: string;
  app_version: string;
}

export interface ProvisionResponse {
  message: string;
  device_id: string;
  device_token: string;
}

// --- Heartbeat ---

export interface HeartbeatRequest {
  battery_percent: number;
  network_type: string;
  reader_status: string;
  app_version: string;
  gps?: { latitude: number; longitude: number } | null;
}

export interface ConfigVersions {
  lanes: number;
}

export interface HeartbeatResponse {
  message: string;
  config_versions: ConfigVersions;
}

// --- Config ---

export interface PlazaInfo {
  id: string;
  name: string;
}

export interface LaneInfo {
  id: string;
  name: string;
}

export interface ReaderConfig {
  power_dbm: number;
  rssi_threshold: number;
  scan_mode: 'single' | 'continuous';
}

export interface DeviceConfigResponse {
  plaza: PlazaInfo;
  lane: LaneInfo;
  reader_config: ReaderConfig;
  sync_interval_seconds: number;
  config_refresh_interval_seconds: number;
  heartbeat_interval_seconds: number;
}

// --- Lanes ---

export interface Lane {
  id: string;
  name: string;
  lane_number?: number;
}

// --- FASTag Reads ---

export interface TagReadPayload {
  local_read_id: string;
  epc: string;
  tid?: string;
  user_data?: string;
  rssi: number;
  antenna?: number;
  timestamp: string;
  gps?: { latitude: number; longitude: number } | null;
}

export interface BatchReadRequest {
  reads: TagReadPayload[];
}

export type ReadAction = 'ALLOW' | 'REJECT';

export interface ReadResult {
  local_read_id: string;
  action: ReadAction;
  reason: string;
  display_message?: string;
}

export interface BatchReadResponse {
  results: ReadResult[];
}

// --- Individual RFID Submit ---

export interface RfidSubmitRequest {
  tag_id: string;
  tid: string;
  user_data: string;
  lane_id: string;
}

export interface RfidSubmitResponse {
  action?: ReadAction;
  reason?: string;
  display_message?: string;
  message?: string;
  [key: string]: unknown;
}

// --- Auth / Login ---

export interface LoginRequest {
  login: string;
  password: string;
}

export interface LoginUser {
  id: string;
  name: string;
  email: string;
}

export interface LoginResponse {
  token: string;
  message: string;
  user: LoginUser;
}
