# Network API Contracts

All endpoints are relative to the `backend_url` extracted from the provisioning QR code.

## Authentication

All API calls (except `/api/device/provision`) must include:
```
Authorization: Device <device_token>
```

If the token is missing or invalid, the API returns `401 Unauthorized` and the app must redirect to the Provisioning screen.

---

## 1. POST /api/device/provision

**Purpose:** Register a new device with the backend.

**Headers:**
```
Content-Type: application/json
```

**Request:**
```json
{
  "provisioning_token": "one-time-short-lived-token-from-qr",
  "device_fingerprint": {
    "android_id": "abc123def456",
    "manufacturer": "Mivanta",
    "model": "CX1500N",
    "os_version": "12",
    "app_version": "1.0.5",
    "app_signature_hash": "sha256:abc..."
  }
}
```

**Response (200):**
```json
{
  "device_id": "DEV-001",
  "device_token": "long-lived-jwt-or-opaque-token",
  "config": {
    "heartbeat_interval_seconds": 30,
    "sync_interval_seconds": 60,
    "config_refresh_interval_seconds": 300
  }
}
```

**Errors:**
- `400` — Invalid or expired provisioning token
- `409` — Device already provisioned

---

## 2. POST /api/device/heartbeat

**Purpose:** Periodic health check. Backend can suspend/activate the device.

**Request:**
```json
{
  "battery_percent": 85,
  "network_type": "wifi",
  "reader_status": "connected",
  "app_version": "1.0.5",
  "gps": {
    "latitude": 23.0225,
    "longitude": 72.5714
  }
}
```

**Response (200):**
```json
{
  "status": "ACTIVE",
  "message": null,
  "reason": null
}
```

**Possible `status` values:** `ACTIVE`, `SUSPENDED`

When `SUSPENDED`, the app locks the UI and stops scanning/syncing. Heartbeat continues.

---

## 3. GET /api/device/config

**Purpose:** Fetch server-driven configuration. Called on app start and periodically.

**Response (200):**
```json
{
  "plaza": {
    "id": "PLZ-001",
    "name": "Chakraoda Toll Plaza"
  },
  "lane": {
    "id": "LN-003",
    "name": "Lane 3"
  },
  "reader_config": {
    "power_dbm": 25,
    "rssi_threshold": -60,
    "scan_mode": "single"
  },
  "sync_interval_seconds": 60,
  "config_refresh_interval_seconds": 300,
  "heartbeat_interval_seconds": 30
}
```

---

## 4. POST /api/device/fastag-read/batch

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
      "gps": {
        "latitude": 23.0225,
        "longitude": 72.5714
      }
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

**Possible `action` values:** `ALLOW`, `REJECT`
