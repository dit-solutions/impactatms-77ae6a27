
# Fix TID and User Memory Bank Reading

## Root Cause Analysis

After analyzing the manufacturer's demo code (`ReadFragment.java`), I found why the current implementation fails:

### Problems Identified

| Issue | Current Implementation | Demo Code |
|-------|----------------------|-----------|
| Method name | Tries `Read` (capital R) and `read` via reflection | Uses `read` (lowercase) directly |
| Parameters | Tries multiple signatures (3-6 params) | Uses exactly 5 parameters |
| Filter class | Uses `UHFTagEntity` for filtering | Uses `SelectEntity` for filtering |
| Result handling | Uses `getCode()` | Uses `getResultCode()` |
| Result type | Expects various types | Returns `UHFReaderResult<String>` directly |

### Correct API from Demo

```text
// The working read method signature:
UHFReaderResult<String> result = UHFReader.getInstance().read(
    password,      // String: "00000000"
    membank,       // int: 0=Reserved, 1=EPC, 2=TID, 3=USER
    address,       // int: start word address (typically 0)
    wordCount,     // int: number of words to read
    selectEntity   // SelectEntity: filter entity (can be null)
);

// Check result:
if (result.getResultCode() == UHFReaderResult.ResultCode.CODE_SUCCESS) {
    String hexData = result.getData();  // Already a hex string!
}
```

---

## Solution

Replace the reflection-based approach with direct calls matching the demo code exactly.

### Step 1: Add SelectEntity Import

Add the missing import for the filter class:
```java
import com.xlzn.hcpda.uhf.entity.SelectEntity;
```

### Step 2: Simplify tryReadMemoryBankDirect Method

Replace the complex reflection logic with a direct call:

```java
private String tryReadMemoryBankDirect(int memBank, int startAddr, int wordCount, String epc) {
    Log.d(TAG, "Reading bank=" + memBank + ", addr=" + startAddr + ", words=" + wordCount);
    
    try {
        // Try with no filter first (matching demo: read(pwd, bank, addr, count, null))
        UHFReaderResult<String> result = uhfReader.read(
            DEFAULT_PASSWORD, 
            memBank, 
            startAddr, 
            wordCount, 
            null  // No filter - read any tag in range
        );
        
        if (result != null && 
            result.getResultCode() == UHFReaderResult.ResultCode.CODE_SUCCESS) {
            String data = result.getData();
            if (data != null && !data.isEmpty()) {
                Log.d(TAG, "Read success: " + data);
                return data;
            }
        }
        
        // If we have EPC, try with SelectEntity filter
        if (epc != null && !epc.isEmpty()) {
            SelectEntity filter = new SelectEntity();
            filter.setOption(4);  // 4=EPC filter (from demo)
            filter.setAddress(32);  // EPC starts at word 2 (bit 32)
            filter.setLength(epc.length() * 4);  // bits = hex chars * 4
            filter.setData(epc);
            
            result = uhfReader.read(
                DEFAULT_PASSWORD, 
                memBank, 
                startAddr, 
                wordCount, 
                filter
            );
            
            if (result != null && 
                result.getResultCode() == UHFReaderResult.ResultCode.CODE_SUCCESS) {
                String data = result.getData();
                if (data != null && !data.isEmpty()) {
                    Log.d(TAG, "Filtered read success: " + data);
                    return data;
                }
            }
        }
        
    } catch (Exception e) {
        Log.e(TAG, "Read error for bank " + memBank + ": " + e.getMessage(), e);
    }
    
    return "";
}
```

### Step 3: Remove Unused Reflection Methods

Delete these methods as they're no longer needed:
- `tryDocumentedReadMethod()` 
- `tryReadWithFilterEntity()`
- `trySetEpcOnEntity()`
- `tryReadWithReflectionDiscovery()` (parts of it)
- `getParamTypesString()`

### Step 4: Update extractHexFromResult

Simplify since we now know it returns `String`:

```java
private String extractHexFromResult(Object result) {
    if (result == null) return "";
    
    // UHFReaderResult<String> - getData() returns String directly
    if (result instanceof UHFReaderResult) {
        try {
            UHFReaderResult<?> uhfResult = (UHFReaderResult<?>) result;
            Object data = uhfResult.getData();
            if (data instanceof String) {
                return (String) data;
            } else if (data instanceof byte[]) {
                return bytesToHex((byte[]) data);
            }
        } catch (Exception e) {
            Log.w(TAG, "extractHexFromResult error: " + e.getMessage());
        }
    }
    
    return result.toString();
}
```

---

## Files to Modify

**android/app/src/main/java/com/mivanta/rfid/MivantaRfidPlugin.java**
- Add `SelectEntity` import
- Rewrite `tryReadMemoryBankDirect()` to use direct API call
- Remove unused reflection helper methods
- Update debug logging

---

## Expected Outcome

After implementation:
1. **TID field** will populate with the chip identifier (24 hex characters)
2. **User Data field** will populate with stored vehicle data (if present)
3. **Faster reads** - no reflection overhead, direct SDK calls
4. **Better error messages** - using proper `getResultCode()` checks

---

## Testing Steps

1. Build and deploy the updated APK
2. Connect to the RFID reader
3. Press the hardware trigger button on a FASTag
4. Verify TID and User data fields now show hex values
5. Check the Debug panel for any error messages if fields are still empty
