
# Fix TID and User Memory Bank Reading

## Problem Analysis

The application can read EPC data successfully but fails to read TID (Tag Identifier) and User memory banks. After analyzing the Mivanta SDK documentation and comparing with the current implementation, I identified the root causes:

### Current Issue
The plugin uses reflection-based discovery to find and call read methods, but:
1. It's not using the correct 6-parameter `Read` method signature documented in the API
2. It may not be properly constructing the filter entity for targeted reads
3. The demo app has a configuration option to read TID during inventory that we're not utilizing

### API Reference (from CX1500N documentation)
```text
UHFReader.getInstance().Read(
    password,       // String: access password ("00000000")
    membank,        // int: 0=Reserved, 1=EPC, 2=TID, 3=User
    address,        // int: start address (0 for TID/User)
    wordCount,      // int: number of words to read
    specifyLabel,   // boolean: true to filter to specific tag
    filterEntity    // UHFTagEntity: filter entity (can be null if specifyLabel=false)
);
```

---

## Solution Overview

Update the `MivantaRfidPlugin.java` to:
1. Call the exact `Read` method documented in the SDK API with 6 parameters
2. Properly create a filter entity from the inventory result to target the specific tag
3. Add a fallback that tries reading without a filter if the filtered read fails
4. Add better logging to diagnose what the SDK actually returns

---

## Implementation Steps

### Step 1: Update the Read Method Call
Replace the reflection-based approach with a direct call to the documented `Read` method:

```text
Before: Uses reflection to guess method signatures
After:  Directly calls UHFReader.getInstance().Read(password, membank, address, wordCount, specifyLabel, filterEntity)
```

### Step 2: Create Filter Entity from Inventory Result
After performing `singleTagInventory()`, use the returned `UHFTagEntity` as the filter:

```text
Approach:
1. Perform inventory to get tag entity
2. Use that entity as the filter parameter for Read
3. Try with specifyLabel=true first (filter to this specific tag)
4. If that fails, try with specifyLabel=false (read any tag in range)
```

### Step 3: Handle Multiple Return Types
The `Read` method likely returns `UHFReaderResult<byte[]>` or `UHFReaderResult<String>`:

```text
- Check if result.getData() returns byte array -> convert to hex
- Check if result.getData() returns String -> use directly
- Log the actual return type for debugging
```

### Step 4: Add Configuration for TID+EPC Inventory Mode
The demo documentation mentions a TID checkbox that makes inventory return TID+EPC. We should explore if there's a `setTidEpc()` or similar configuration method:

```text
- Check UHFReader for setTidMode, enableTid, setConfig methods
- If available, enable TID reading during inventory
```

---

## Code Changes

### File: `android/app/src/main/java/com/mivanta/rfid/MivantaRfidPlugin.java`

**1. Update `tryReadMemoryBankDirect` method** to use the exact documented API:

```java
private String tryReadMemoryBankDirect(int memBank, int startAddr, int wordCount, String epc) {
    String result = "";
    
    Log.d(TAG, "Reading memory bank " + memBank + " at address " + startAddr + " for " + wordCount + " words");
    
    try {
        // Method 1: Try the documented 6-parameter Read method
        // Read(password, membank, address, wordCount, specifyLabel, filterEntity)
        
        // Create filter entity if we have an EPC to filter by
        UHFTagEntity filterEntity = null;
        if (epc != null && !epc.isEmpty()) {
            filterEntity = new UHFTagEntity();
            // Try to set EPC on filter entity using reflection (method name may vary)
            trySetEpcOnEntity(filterEntity, epc);
        }
        
        // Try with filter first
        UHFReaderResult<?> readResult = uhfReader.Read(
            DEFAULT_PASSWORD,  // "00000000"
            memBank,           // 2 for TID, 3 for USER
            startAddr,         // typically 0
            wordCount,         // number of words
            filterEntity != null,  // specifyLabel
            filterEntity           // filter entity
        );
        
        if (readResult != null && readResult.getData() != null) {
            result = extractHexFromResult(readResult);
            if (!result.isEmpty()) {
                Log.d(TAG, "Read success with filter: " + result);
                return result;
            }
        }
        
        // Try without filter
        readResult = uhfReader.Read(
            DEFAULT_PASSWORD,
            memBank,
            startAddr,
            wordCount,
            false,  // no filter
            null    // no filter entity
        );
        
        if (readResult != null) {
            result = extractHexFromResult(readResult);
            Log.d(TAG, "Read without filter: " + result);
        }
        
    } catch (Exception e) {
        Log.e(TAG, "Read error for bank " + memBank + ": " + e.getMessage(), e);
    }
    
    return result != null ? result : "";
}
```

**2. Add helper method to set EPC on filter entity:**

```java
private void trySetEpcOnEntity(UHFTagEntity entity, String epc) {
    try {
        // Try common method names for setting EPC
        String[] methodNames = {"setEpc", "setEcpHex", "setECP", "setEpcData"};
        for (String methodName : methodNames) {
            try {
                Method setMethod = UHFTagEntity.class.getMethod(methodName, String.class);
                setMethod.invoke(entity, epc);
                Log.d(TAG, "Set EPC via " + methodName);
                return;
            } catch (NoSuchMethodException e) {
                // Try next method name
            }
        }
        
        // Also try byte array setters
        try {
            Method setMethod = UHFTagEntity.class.getMethod("setEpc", byte[].class);
            setMethod.invoke(entity, hexToBytes(epc));
            Log.d(TAG, "Set EPC via setEpc(byte[])");
        } catch (NoSuchMethodException e) {
            Log.w(TAG, "Could not find EPC setter on UHFTagEntity");
        }
    } catch (Exception e) {
        Log.w(TAG, "Error setting EPC on filter entity: " + e.getMessage());
    }
}
```

**3. Add hexToBytes conversion helper:**

```java
private byte[] hexToBytes(String hex) {
    if (hex == null || hex.isEmpty()) return new byte[0];
    int len = hex.length();
    byte[] data = new byte[len / 2];
    for (int i = 0; i < len; i += 2) {
        data[i / 2] = (byte) ((Character.digit(hex.charAt(i), 16) << 4)
                             + Character.digit(hex.charAt(i + 1), 16));
    }
    return data;
}
```

**4. Update debug info to show UHFTagEntity methods:**

```java
// In getDebugInfo method, also enumerate UHFTagEntity methods
StringBuilder entityMethods = new StringBuilder("\nUHFTagEntity methods:\n");
try {
    Method[] methods = UHFTagEntity.class.getDeclaredMethods();
    for (Method m : methods) {
        entityMethods.append(m.getName()).append("(");
        Class<?>[] params = m.getParameterTypes();
        for (int i = 0; i < params.length; i++) {
            if (i > 0) entityMethods.append(", ");
            entityMethods.append(params[i].getSimpleName());
        }
        entityMethods.append(")\n");
    }
} catch (Exception e) {
    entityMethods.append("Error: ").append(e.getMessage());
}
response.put("entityMethods", entityMethods.toString());
```

---

## Debugging Strategy

After implementing, if TID/User still returns empty:

1. **Check Debug Panel**: The new `entityMethods` field will show available methods on `UHFTagEntity`
2. **Check Logcat**: Look for "Read success" or "Read error" messages
3. **Verify Read method exists**: The debug panel will confirm if `Read(String, int, int, int, boolean, UHFTagEntity)` signature is available

---

## Verification Steps

After building and deploying:
1. Open the app and connect to the RFID reader
2. Go to the Debug tab to verify the methods list includes `Read(...)`
3. Press the hardware trigger button to scan a FASTag
4. Check if TID and User data fields now populate with hex values
5. If still empty, share the Logcat output or Debug panel contents

---

## Technical Notes

- **Word Size**: 1 word = 2 bytes = 4 hex characters
- **TID Length**: Typically 6 words (12 bytes / 24 hex chars) for standard UHF tags
- **User Length**: Varies by tag, start with 32 words, fall back to smaller sizes
- **Address**: TID and USER typically start at address 0
