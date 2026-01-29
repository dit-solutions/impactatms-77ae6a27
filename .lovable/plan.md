
## Extended FASTag Data Reading

### Understanding Your Requirement

You're reading FASTags (Indian toll RFID tags) and currently only getting the basic inventory data. To get the complete FASTag information, we need to read from multiple memory banks:

| Data Type | Memory Bank | Description |
|-----------|-------------|-------------|
| TID | Bank 2 (TID) | Tag Identifier - unique chip ID |
| EPC ID | Bank 1 (EPC) | Electronic Product Code - vehicle identifier |
| User Data | Bank 3 (User) | Custom data stored on the tag |

---

### Changes Required

#### 1. Update Native Plugin (Java)
**File**: `android/app/src/main/java/com/mivanta/rfid/MivantaRfidPlugin.java`

Add a new method `readTagDetails()` that reads all memory banks:

```java
@PluginMethod
public void readTagDetails(PluginCall call) {
    // 1. First perform inventory to get the tag EPC
    // 2. Use uhfReader.readTagData() to read TID bank
    // 3. Use uhfReader.readTagData() to read User bank
    // 4. Return combined data: { tid, epc, userData, rssi, timestamp }
}
```

The Mivanta SDK should have a method like:
- `readTagData(bank, startAddress, length, accessPassword)` or similar

---

#### 2. Update TypeScript Plugin Interface
**File**: `src/services/rfid/mivanta-rfid-plugin.ts`

Add new interfaces and method:

```typescript
export interface FastTagData {
  tid: string;           // First 24 chars - Tag Identifier
  epc: string;           // EPC ID (24 chars starting with 'E')
  userData: string;      // User memory bank data
  rssi?: number;
  timestamp: number;
}

interface MivantaRfidPlugin {
  // ... existing methods ...
  
  /**
   * Read complete FASTag data including TID, EPC, and User memory
   */
  readTagDetails(): Promise<FastTagReadResult>;
}
```

---

#### 3. Update Service Layer
**File**: `src/services/rfid/rfid-service.ts`

Add method to read extended tag data:

```typescript
async readTagDetails(): Promise<FastTagData | null> {
  const result = await MivantaRfid.readTagDetails();
  // Parse and return structured FASTag data
}
```

---

#### 4. Update UI Components
**File**: `src/components/rfid/RfidTagHistory.tsx`

Update to display parsed FASTag fields:

```text
┌─────────────────────────────────────┐
│ FASTag Detected                     │
├─────────────────────────────────────┤
│ TID:  E200 3411 2345 6789 ABCD EF01 │
│ EPC:  3034 0102 8765 4321 FEDC BA98 │
│ User: 4D48 4152 4153 4854 5241 ...  │
│ RSSI: -42 dBm          12:34:56 PM  │
└─────────────────────────────────────┘
```

---

#### 5. Update Web Mock
**File**: `src/services/rfid/rfid-web-mock.ts`

Add mock implementation for testing in browser preview.

---

### Technical Details

#### Memory Bank Reading (SDK-specific)

Most UHF SDKs use a pattern like:
```java
// Read TID bank (bank 2), starting at word 0, read 6 words (12 bytes = 24 hex chars)
UHFReaderResult<byte[]> tidResult = uhfReader.readTagData(
    epcHex,           // Tag to read (from inventory)
    2,                // Memory bank (2 = TID)
    0,                // Start address (word offset)
    6,                // Word count
    "00000000"        // Access password (default)
);

// Read User bank (bank 3)
UHFReaderResult<byte[]> userResult = uhfReader.readTagData(
    epcHex,
    3,                // Memory bank (3 = User)
    0,
    16,               // Read 16 words (32 bytes)
    "00000000"
);
```

The exact method signature depends on the Mivanta SDK v1.1.0 API. Common method names:
- `readTagData()`
- `readData()`
- `readMemory()`

---

### Files to Modify

| File | Changes |
|------|---------|
| `MivantaRfidPlugin.java` | Add `readTagDetails()` method with TID/User bank reads |
| `mivanta-rfid-plugin.ts` | Add `FastTagData` interface and `readTagDetails()` |
| `rfid-service.ts` | Add `readTagDetails()` service method |
| `rfid-web-mock.ts` | Add mock for `readTagDetails()` |
| `RfidTagHistory.tsx` | Update UI to display TID, EPC, User fields separately |
| `use-rfid-reader.ts` | Add hook method for detailed read |

---

### Important Note

To implement the exact SDK calls, I need to know the Mivanta SDK v1.1.0 API for reading specific memory banks. Do you have:
1. SDK documentation or sample code showing how to read TID/User banks?
2. The method names available in `UHFReader` class for memory bank reads?

This will ensure we use the correct API calls rather than guessing.
