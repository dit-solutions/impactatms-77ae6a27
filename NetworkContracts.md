# Network API Contracts

All endpoints are relative to the `backend_url` extracted from the provisioning QR code.

## Authentication

All API calls (except `/api/v1/handheld/provision`) must include:
```
Device: HHM <device_token>
```

If the token is missing or invalid, the API returns `401 Unauthorized` and the app must redirect to the Provisioning screen.

---

## 1. POST /api/v1/handheld/provision

**Purpose:** Register a new device with the backend.

**Headers:**
```
Content-Type: application/json
```

**Request:**
```json
{
  "provisioning_token": "one-time-short-lived-token-from-qr",
  "android_id": "abc123def456",
  "model": "CX1500N",
  "os_version": "12",
  "app_version": "1.0.5"
}
```

**Response (200):**
```json
{
  "message": "Device provisioned",
  "device_id": "DEV-001",
  "device_token": "long-lived-jwt-or-opaque-token"
}
```

---

## 2. POST /api/v1/handheld/auth/login

**Purpose:** Authenticate an operator on a provisioned device.

**Request:**
```json
{
  "login": "user@example.com",
  "password": "pass123"
}
```

**Response (200):**
```json
{
  "message": "Login successful",
  "user": {
    "id": "USR-001",
    "name": "John Doe",
    "email": "user@example.com"
  }
}
```

---

## 3. POST /api/v1/handheld/auth/logout

**Purpose:** End the current operator session (best-effort).

**Response (200):**
```json
{
  "message": "Logged out"
}
```

---

## 4. POST /api/v1/handheld/heartbeat

**Purpose:** Periodic health check. Backend returns config version info.

**Request:**
```json
{
  "battery_percent": 85,
  "network_type": "wifi",
  "reader_status": "connected",
  "app_version": "1.0.5",
  "gps": { "latitude": 23.0225, "longitude": 72.5714 }
}
```

**Response (200):**
```json
{
  "message": "Heartbeat received",
  "config_versions": {
    "lanes": 1
  }
}
```

When `config_versions.lanes` changes, the app re-fetches the lanes list.

---

## 5. GET /api/v1/handheld/config

**Purpose:** Fetch server-driven configuration.

**Response (200):**
```json
{
  "plaza": { "id": "PLZ-001", "name": "Chakraoda Toll Plaza" },
  "lane": { "id": "LN-003", "name": "Lane 3" },
  "reader_config": { "power_dbm": 25, "rssi_threshold": -60, "scan_mode": "single" },
  "sync_interval_seconds": 60,
  "config_refresh_interval_seconds": 300,
  "heartbeat_interval_seconds": 30
}
```

---

## 6. GET /api/v1/handheld/lanes

**Purpose:** Fetch available lanes for this device.

**Response (200):**
```json
[
  { "id": "LN-001", "name": "Lane 1", "lane_number": 1 },
  { "id": "LN-002", "name": "Lane 2", "lane_number": 2 }
]
```

---

## 7. POST /api/v1/handheld/fastag-read/batch

**Purpose:** Upload one or more RFID tag reads. Backend is idempotent on `local_read_id`.

**Request:**
```json
{
  "reads": [
    {
      "local_read_id": "uuid-v4-1",
      "epc": "E280116060000209...",
      "tid": "E2801160...",
      "user_data": "...",
      "rssi": -45,
      "antenna": 1,
      "timestamp": "2025-07-01T10:30:00Z",
      "gps": { "latitude": 23.0225, "longitude": 72.5714 }
    }
  ]
}
```

**Response (200):**
```json
{
  "results": [
    {
      "local_read_id": "uuid-v4-1",
      "action": "ALLOW",
      "reason": "Valid FASTag",
      "display_message": "Vehicle Allowed - ₹85 deducted"
    }
  ]
}
```
