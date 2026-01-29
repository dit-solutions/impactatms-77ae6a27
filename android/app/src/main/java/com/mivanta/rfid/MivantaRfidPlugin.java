package com.mivanta.rfid;

import android.util.Log;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import com.xlzn.hcpda.uhf.UHFReader;
import com.xlzn.hcpda.uhf.interfaces.OnInventoryDataListener;
import com.xlzn.hcpda.uhf.entity.UHFTagEntity;
import com.xlzn.hcpda.uhf.entity.UHFReaderResult;
import java.util.List;
import java.lang.reflect.Method;

/**
 * Mivanta RFID Plugin for Capacitor
 * Bridges the web app to the native Mivanta UHF RFID hardware SDK
 */
@CapacitorPlugin(name = "MivantaRfid")
public class MivantaRfidPlugin extends Plugin {

    private static final String TAG = "MivantaRfidPlugin";
    
    // Memory bank constants (standard UHF Gen2)
    private static final int MEMBANK_RESERVED = 0;  // Kill/Access passwords
    private static final int MEMBANK_EPC = 1;       // EPC memory
    private static final int MEMBANK_TID = 2;       // TID memory
    private static final int MEMBANK_USER = 3;      // User memory
    
    // Default access password (no password)
    private static final String DEFAULT_PASSWORD = "00000000";
    
    private UHFReader uhfReader;
    private boolean isConnected = false;
    private boolean isScanning = false;
    private int currentPower = 30;
    private boolean sdkAvailable = false;
    private static boolean nativeLibsLoaded = false;

    /**
     * Explicitly load native libraries required by the Mivanta SDK.
     * The AAR v1.1.0 may bundle these libraries, but we load them manually
     * as a fallback to ensure compatibility across devices.
     */
    private static synchronized void loadNativeLibraries() {
        if (nativeLibsLoaded) {
            return;
        }
        
        // List of libraries in dependency order
        String[] libraries = {"power", "SerialPortHc", "ModuleAPI"};
        boolean allLoaded = true;
        
        for (String lib : libraries) {
            try {
                Log.d(TAG, "Loading native library: " + lib);
                System.loadLibrary(lib);
                Log.d(TAG, "Successfully loaded: " + lib);
            } catch (UnsatisfiedLinkError e) {
                // Library might already be loaded by the AAR, or not available
                Log.w(TAG, "Could not load " + lib + " (may be bundled in AAR): " + e.getMessage());
                // Don't fail immediately - the AAR might have loaded it already
            } catch (Throwable t) {
                Log.e(TAG, "Error loading " + lib + ": " + t.getMessage(), t);
                allLoaded = false;
            }
        }
        
        // Mark as loaded - we'll verify at SDK init time
        nativeLibsLoaded = true;
        Log.d(TAG, "Native library loading completed (allExplicitlyLoaded=" + allLoaded + ")");
    }

    @Override
    public void load() {
        super.load();
        Log.d(TAG, "MivantaRfidPlugin loaded - attempting to initialize UHF Reader");
        
        // Load native libraries first
        loadNativeLibraries();
        
        if (!nativeLibsLoaded) {
            Log.e(TAG, "Native libraries not loaded - SDK will not be available");
            sdkAvailable = false;
            return;
        }
        
        try {
            uhfReader = UHFReader.getInstance();
            if (uhfReader != null) {
                sdkAvailable = true;
                Log.d(TAG, "UHFReader instance obtained successfully");
                
                // Log available methods for debugging
                logAvailableMethods();
            } else {
                Log.w(TAG, "UHFReader.getInstance() returned null");
            }
        } catch (UnsatisfiedLinkError e) {
            Log.e(TAG, "Native library load failed during getInstance: " + e.getMessage(), e);
            sdkAvailable = false;
        } catch (Throwable t) {
            Log.e(TAG, "Failed to get UHFReader instance: " + t.getMessage(), t);
            sdkAvailable = false;
        }
    }
    
    /**
     * Log available methods on UHFReader for debugging SDK API
     */
    private void logAvailableMethods() {
        try {
            Method[] methods = UHFReader.class.getDeclaredMethods();
            StringBuilder sb = new StringBuilder("UHFReader methods: ");
            for (Method m : methods) {
                sb.append(m.getName()).append("(");
                Class<?>[] params = m.getParameterTypes();
                for (int i = 0; i < params.length; i++) {
                    if (i > 0) sb.append(", ");
                    sb.append(params[i].getSimpleName());
                }
                sb.append("), ");
            }
            Log.d(TAG, sb.toString());
        } catch (Exception e) {
            Log.w(TAG, "Could not enumerate methods: " + e.getMessage());
        }
    }
    
    /**
     * Get debug information including SDK methods (accessible from UI)
     */
    @PluginMethod
    public void getDebugInfo(PluginCall call) {
        JSObject response = new JSObject();
        response.put("sdkAvailable", sdkAvailable);
        response.put("nativeLibsLoaded", nativeLibsLoaded);
        response.put("isConnected", isConnected);
        
        StringBuilder methodsList = new StringBuilder();
        
        if (sdkAvailable && uhfReader != null) {
            try {
                Method[] methods = UHFReader.class.getDeclaredMethods();
                for (Method m : methods) {
                    methodsList.append(m.getName()).append("(");
                    Class<?>[] params = m.getParameterTypes();
                    for (int i = 0; i < params.length; i++) {
                        if (i > 0) methodsList.append(", ");
                        methodsList.append(params[i].getSimpleName());
                    }
                    methodsList.append(")\n");
                }
            } catch (Exception e) {
                methodsList.append("Error: ").append(e.getMessage());
            }
        } else {
            methodsList.append("SDK not available or reader is null");
        }
        
        response.put("methods", methodsList.toString());
        call.resolve(response);
        Log.d(TAG, "getDebugInfo called - returning SDK methods");
    }

    @PluginMethod
    public void connect(PluginCall call) {
        Log.d(TAG, "connect() called, sdkAvailable=" + sdkAvailable);
        
        // Check if SDK loaded at all
        if (!sdkAvailable) {
            Log.e(TAG, "SDK not available - native libraries may have failed to load");
            call.reject("RFID SDK not available. Native libraries may not be compatible with this device.");
            return;
        }
        
        // Run connection in background thread to allow retries with delays
        new Thread(() -> {
            try {
                if (uhfReader == null) {
                    Log.d(TAG, "uhfReader is null, calling getInstance()");
                    uhfReader = UHFReader.getInstance();
                }

                if (uhfReader == null) {
                    Log.e(TAG, "UHFReader.getInstance() returned null");
                    getActivity().runOnUiThread(() -> 
                        call.reject("UHF reader not available (getInstance returned null)")
                    );
                    return;
                }
                
                // Retry logic for SDK warm-up timing issues
                int maxRetries = 3;
                int retryDelayMs = 500;
                boolean connected = false;
                String lastError = "Unknown error";
                
                for (int attempt = 1; attempt <= maxRetries && !connected; attempt++) {
                    Log.d(TAG, "Connection attempt " + attempt + "/" + maxRetries);
                    
                    // Small delay before first attempt to let SDK warm up
                    if (attempt == 1) {
                        try {
                            Thread.sleep(200);
                        } catch (InterruptedException ignored) {}
                    }
                    
                    UHFReaderResult<Boolean> result = uhfReader.connect();
                    
                    if (result == null) {
                        lastError = "null result from SDK";
                        Log.w(TAG, "Attempt " + attempt + ": connect() returned null");
                    } else {
                        Boolean success = result.getData();
                        if (success != null && success) {
                            connected = true;
                            Log.d(TAG, "Connected successfully on attempt " + attempt);
                        } else {
                            lastError = result.getMessage() != null ? result.getMessage() : "null";
                            Log.w(TAG, "Attempt " + attempt + " failed: " + lastError);
                        }
                    }
                    
                    // Wait before retry (except on last attempt or if connected)
                    if (!connected && attempt < maxRetries) {
                        try {
                            Thread.sleep(retryDelayMs);
                            retryDelayMs *= 1.5; // Exponential backoff
                        } catch (InterruptedException ignored) {}
                    }
                }
                
                if (connected) {
                    isConnected = true;

                    // Best-effort: set default power level (do not crash if SDK returns error)
                    try {
                        UHFReaderResult<Boolean> powerResult = uhfReader.setPower(currentPower);
                        if (powerResult == null) {
                            Log.w(TAG, "setPower returned null result");
                        } else {
                            Log.d(TAG, "setPower(" + currentPower + ") => code=" + powerResult.getResultCode() + ", msg=" + powerResult.getMessage());
                        }
                    } catch (Throwable t) {
                        Log.e(TAG, "setPower threw: " + t.getMessage(), t);
                    }
                    
                    JSObject response = new JSObject();
                    response.put("connected", true);
                    response.put("message", "UHF Reader connected successfully");
                    
                    getActivity().runOnUiThread(() -> call.resolve(response));
                    Log.d(TAG, "UHF Reader connected");
                } else {
                    Log.e(TAG, "All connection attempts failed. Last error: " + lastError);
                    final String errorMsg = lastError;
                    getActivity().runOnUiThread(() -> 
                        call.reject("Failed to connect to UHF Reader after 3 attempts: " + errorMsg)
                    );
                }
            } catch (Throwable t) {
                Log.e(TAG, "Connection fatal error: " + t.getMessage(), t);
                final String msg = t.getMessage();
                getActivity().runOnUiThread(() -> call.reject("Connection error: " + msg));
            }
        }).start();
    }

    @PluginMethod
    public void disconnect(PluginCall call) {
        try {
            if (isScanning && uhfReader != null) {
                uhfReader.stopInventory();
                isScanning = false;
            }
            
            if (uhfReader != null) {
                UHFReaderResult<Boolean> result = uhfReader.disConnect();
                Log.d(TAG, "Disconnect result: " + result.getMessage());
            }
            isConnected = false;
            
            JSObject response = new JSObject();
            response.put("connected", false);
            response.put("message", "UHF Reader disconnected");
            call.resolve(response);
            
            Log.d(TAG, "UHF Reader disconnected");
        } catch (Exception e) {
            Log.e(TAG, "Disconnect error: " + e.getMessage(), e);
            call.reject("Disconnect error: " + e.getMessage());
        }
    }

    @PluginMethod
    public void readSingle(PluginCall call) {
        if (!isConnected || uhfReader == null) {
            call.reject("Reader not connected. Please connect first.");
            return;
        }

        try {
            // Perform single tag inventory
            UHFReaderResult<UHFTagEntity> result = uhfReader.singleTagInventory();
            
            if (result == null) {
                JSObject response = new JSObject();
                response.put("success", false);
                response.put("epc", "");
                response.put("timestamp", System.currentTimeMillis());
                call.resolve(response);
                Log.d(TAG, "Single read: null result");
                return;
            }
            
            UHFTagEntity tag = result.getData();
            
            if (tag != null) {
                // Note: SDK uses getEcpHex() not getEpc()
                String epc = tag.getEcpHex();
                
                JSObject response = new JSObject();
                response.put("success", true);
                response.put("epc", epc != null ? epc : "");
                response.put("rssi", tag.getRssi());
                response.put("timestamp", System.currentTimeMillis());
                call.resolve(response);
                
                Log.d(TAG, "Single read: " + epc);
            } else {
                JSObject response = new JSObject();
                response.put("success", false);
                response.put("epc", "");
                response.put("timestamp", System.currentTimeMillis());
                call.resolve(response);
                
                Log.d(TAG, "Single read: No tag detected");
            }
        } catch (Exception e) {
            Log.e(TAG, "Single read error: " + e.getMessage(), e);
            call.reject("Read error: " + e.getMessage());
        }
    }

    /**
     * Read complete FASTag details including TID, EPC, and User memory banks
     * This performs an inventory first to get the tag, then reads additional memory banks
     */
    @PluginMethod
    public void readTagDetails(PluginCall call) {
        if (!isConnected || uhfReader == null) {
            call.reject("Reader not connected. Please connect first.");
            return;
        }

        try {
            // Step 1: Perform single tag inventory to get EPC
            UHFReaderResult<UHFTagEntity> inventoryResult = uhfReader.singleTagInventory();
            
            if (inventoryResult == null || inventoryResult.getData() == null) {
                JSObject response = new JSObject();
                response.put("success", false);
                response.put("message", "No tag detected");
                response.put("timestamp", System.currentTimeMillis());
                call.resolve(response);
                Log.d(TAG, "readTagDetails: No tag detected during inventory");
                return;
            }
            
            UHFTagEntity tag = inventoryResult.getData();
            String epcFromInventory = tag.getEcpHex();
            int rssi = tag.getRssi();
            
            Log.d(TAG, "readTagDetails: Tag found with EPC: " + epcFromInventory + ", RSSI: " + rssi);
            
            // Initialize data holders
            String tid = "";
            String epc = epcFromInventory != null ? epcFromInventory : "";
            String userData = "";
            
            // Step 2: Try to read TID memory bank (bank 2) 
            // TID is typically 6 words (12 bytes / 24 hex chars) starting at address 0
            Log.d(TAG, "Attempting to read TID bank...");
            tid = tryReadMemoryBankDirect(MEMBANK_TID, 0, 6, epcFromInventory);
            Log.d(TAG, "TID read result: '" + tid + "'");
            
            // Step 3: Try to read User memory bank (bank 3)
            // User data can vary, try 8 words first (16 bytes / 32 hex chars)
            Log.d(TAG, "Attempting to read User bank...");
            userData = tryReadMemoryBankDirect(MEMBANK_USER, 0, 8, epcFromInventory);
            Log.d(TAG, "User data read result: '" + userData + "'");
            
            // If first 8 words are empty, it might just be no data (not protected)
            // If user data is still empty, try smaller read
            if (userData.isEmpty()) {
                userData = tryReadMemoryBankDirect(MEMBANK_USER, 0, 4, epcFromInventory);
                Log.d(TAG, "User data retry (4 words): '" + userData + "'");
            }
            
            // Build response with all data
            JSObject response = new JSObject();
            response.put("success", true);
            response.put("tid", tid != null ? tid : "");
            response.put("epc", epc);
            response.put("userData", userData != null ? userData : "");
            response.put("rssi", rssi);
            response.put("timestamp", System.currentTimeMillis());
            
            // Add debug message if TID/User are empty
            String debugMsg = "";
            if ((tid == null || tid.isEmpty()) && (userData == null || userData.isEmpty())) {
                debugMsg = "EPC only - TID/User banks may be protected or SDK read method not found";
            }
            response.put("message", debugMsg);
            
            call.resolve(response);
            Log.d(TAG, "readTagDetails: Complete - TID=" + tid + ", EPC=" + epc + ", User=" + userData);
            
        } catch (Exception e) {
            Log.e(TAG, "readTagDetails error: " + e.getMessage(), e);
            call.reject("Read tag details error: " + e.getMessage());
        }
    }
    
    /**
     * Try to read a memory bank using direct SDK method calls
     * Returns hex string or empty string if read fails
     */
    private String tryReadMemoryBankDirect(int memBank, int startAddr, int wordCount, String epc) {
        String result = "";
        
        // First, try the most common SDK method names directly
        // Many UHF SDKs use readData(String password, int bank, int startAddr, int count)
        
        Log.d(TAG, "tryReadMemoryBankDirect: bank=" + memBank + ", startAddr=" + startAddr + ", wordCount=" + wordCount);
        
        // Attempt 1: Try direct reflection with readData method 
        result = tryDirectReadMethod(memBank, startAddr, wordCount, epc);
        if (result != null && !result.isEmpty()) {
            Log.d(TAG, "Direct read succeeded for bank " + memBank + ": " + result);
            return result;
        }
        
        // Attempt 2: Try using the reflection-based discovery
        result = tryReadWithReflectionDiscovery(memBank, startAddr, wordCount, epc);
        if (result != null && !result.isEmpty()) {
            Log.d(TAG, "Reflection discovery read succeeded for bank " + memBank + ": " + result);
            return result;
        }
        
        Log.w(TAG, "All read attempts failed for bank " + memBank);
        return "";
    }
    
    /**
     * Try direct SDK readData method with various parameter orderings
     */
    private String tryDirectReadMethod(int memBank, int startAddr, int wordCount, String epc) {
        try {
            Method[] methods = UHFReader.class.getDeclaredMethods();
            
            for (Method method : methods) {
                String name = method.getName();
                // Look for read-related methods
                if (!name.toLowerCase().contains("read")) continue;
                if (name.toLowerCase().contains("power") || name.toLowerCase().contains("rssi")) continue;
                
                Class<?>[] paramTypes = method.getParameterTypes();
                int paramCount = paramTypes.length;
                
                Log.d(TAG, "Checking method: " + name + " with " + paramCount + " params");
                
                Object readResult = null;
                
                try {
                    // Pattern 1: readData(String password, int bank, int addr, int len)
                    if (paramCount == 4 && 
                        paramTypes[0] == String.class &&
                        paramTypes[1] == int.class &&
                        paramTypes[2] == int.class &&
                        paramTypes[3] == int.class) {
                        Log.d(TAG, "Trying " + name + "(password, bank, addr, len)");
                        readResult = method.invoke(uhfReader, DEFAULT_PASSWORD, memBank, startAddr, wordCount);
                    }
                    // Pattern 2: readData(int bank, int addr, int len, String password)
                    else if (paramCount == 4 &&
                             paramTypes[0] == int.class &&
                             paramTypes[1] == int.class &&
                             paramTypes[2] == int.class &&
                             paramTypes[3] == String.class) {
                        Log.d(TAG, "Trying " + name + "(bank, addr, len, password)");
                        readResult = method.invoke(uhfReader, memBank, startAddr, wordCount, DEFAULT_PASSWORD);
                    }
                    // Pattern 3: readData(String password, int bank, int addr, int len, String epc)
                    else if (paramCount == 5 &&
                             paramTypes[0] == String.class &&
                             paramTypes[4] == String.class) {
                        Log.d(TAG, "Trying " + name + "(password, bank, addr, len, epc)");
                        readResult = method.invoke(uhfReader, DEFAULT_PASSWORD, memBank, startAddr, wordCount, epc);
                    }
                    // Pattern 4: readData(String epc, String password, int bank, int addr, int len)
                    else if (paramCount == 5 &&
                             paramTypes[0] == String.class &&
                             paramTypes[1] == String.class) {
                        Log.d(TAG, "Trying " + name + "(epc, password, bank, addr, len)");
                        readResult = method.invoke(uhfReader, epc, DEFAULT_PASSWORD, memBank, startAddr, wordCount);
                    }
                    // Pattern 5: readMemory/readTag style methods (3 params: bank, addr, len)
                    else if (paramCount == 3 &&
                             paramTypes[0] == int.class &&
                             paramTypes[1] == int.class &&
                             paramTypes[2] == int.class) {
                        Log.d(TAG, "Trying " + name + "(bank, addr, len)");
                        readResult = method.invoke(uhfReader, memBank, startAddr, wordCount);
                    }
                } catch (Exception e) {
                    Log.w(TAG, "Method " + name + " invoke failed: " + e.getMessage());
                    continue;
                }
                
                if (readResult != null) {
                    Log.d(TAG, "Method " + name + " returned: " + readResult.getClass().getSimpleName());
                    String hex = extractHexFromResult(readResult);
                    if (hex != null && !hex.isEmpty() && !hex.equals("00000000") && !hex.matches("^0+$")) {
                        Log.d(TAG, "Valid data from " + name + ": " + hex);
                        return hex;
                    }
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "tryDirectReadMethod error: " + e.getMessage(), e);
        }
        return "";
    }
    
    /**
     * Use reflection to discover and call any read-like method
     */
    private String tryReadWithReflectionDiscovery(int memBank, int startAddr, int wordCount, String epc) {
        try {
            Method[] methods = UHFReader.class.getDeclaredMethods();
            
            // Log all available methods for debugging
            StringBuilder methodList = new StringBuilder("Available methods: ");
            for (Method m : methods) {
                methodList.append(m.getName()).append(", ");
            }
            Log.d(TAG, methodList.toString());
            
            for (Method method : methods) {
                String name = method.getName().toLowerCase();
                
                // Look for any method that might read memory: read, getData, getMemory, etc.
                if (!name.contains("read") && !name.contains("data") && !name.contains("memory") && !name.contains("bank")) {
                    continue;
                }
                
                // Skip obvious non-memory methods
                if (name.contains("power") || name.contains("rssi") || name.contains("temperature") ||
                    name.contains("version") || name.contains("listener") || name.contains("config")) {
                    continue;
                }
                
                // Skip void methods
                if (method.getReturnType() == void.class) continue;
                
                Class<?>[] paramTypes = method.getParameterTypes();
                
                Log.d(TAG, "Discovery trying: " + method.getName() + " with " + paramTypes.length + " params, returns " + method.getReturnType().getSimpleName());
                
                Object result = null;
                
                // Try invoking based on parameter count
                try {
                    if (paramTypes.length == 3) {
                        // (bank, addr, len) or (addr, len, bank)
                        result = method.invoke(uhfReader, memBank, startAddr, wordCount);
                    } else if (paramTypes.length == 4) {
                        // Try password first, then bank/addr/len
                        if (paramTypes[0] == String.class) {
                            result = method.invoke(uhfReader, DEFAULT_PASSWORD, memBank, startAddr, wordCount);
                        } else {
                            result = method.invoke(uhfReader, memBank, startAddr, wordCount, DEFAULT_PASSWORD);
                        }
                    } else if (paramTypes.length == 5) {
                        // Try with EPC filter
                        result = method.invoke(uhfReader, DEFAULT_PASSWORD, memBank, startAddr, wordCount, epc);
                    }
                } catch (Exception e) {
                    // Expected for many methods, just continue
                }
                
                if (result != null) {
                    String hex = extractHexFromResult(result);
                    if (hex != null && !hex.isEmpty() && !hex.matches("^0+$")) {
                        Log.d(TAG, "Discovery success with " + method.getName() + ": " + hex);
                        return hex;
                    }
                }
            }
        } catch (Exception e) {
            Log.w(TAG, "Reflection discovery failed: " + e.getMessage());
        }
        return "";
    }
    
    /**
     * Extract hex string from various result types
     */
    private String extractHexFromResult(Object result) {
        if (result == null) return "";
        
        try {
            Log.d(TAG, "extractHexFromResult: type=" + result.getClass().getName());
            
            // Handle UHFReaderResult<T>
            if (result instanceof UHFReaderResult) {
                UHFReaderResult<?> readerResult = (UHFReaderResult<?>) result;
                int code = readerResult.getResultCode();
                String msg = readerResult.getMessage();
                Log.d(TAG, "UHFReaderResult code=" + code + ", msg=" + msg);
                
                Object data = readerResult.getData();
                if (data == null) {
                    Log.d(TAG, "UHFReaderResult data is null");
                    return "";
                }
                
                Log.d(TAG, "UHFReaderResult data type: " + data.getClass().getName());
                
                if (data instanceof byte[]) {
                    byte[] bytes = (byte[]) data;
                    Log.d(TAG, "Data is byte[], length=" + bytes.length);
                    return bytesToHex(bytes);
                } else if (data instanceof String) {
                    Log.d(TAG, "Data is String: " + data);
                    return (String) data;
                } else if (data instanceof UHFTagEntity) {
                    // Some SDKs return the tag entity with extra data
                    UHFTagEntity tagData = (UHFTagEntity) data;
                    String tagEpc = tagData.getEcpHex();
                    Log.d(TAG, "Data is UHFTagEntity, EPC: " + tagEpc);
                    // Try to get any additional data through reflection
                    return tryExtractExtraDataFromTag(tagData);
                } else {
                    // Try to convert unknown types
                    String str = data.toString();
                    Log.d(TAG, "Data is unknown type, toString: " + str);
                    // Check if it looks like hex
                    if (str.matches("^[0-9A-Fa-f]+$")) {
                        return str.toUpperCase();
                    }
                }
            }
            // Handle byte[] directly
            else if (result instanceof byte[]) {
                return bytesToHex((byte[]) result);
            }
            // Handle String directly
            else if (result instanceof String) {
                String str = (String) result;
                if (str.matches("^[0-9A-Fa-f]+$")) {
                    return str.toUpperCase();
                }
                return str;
            }
            // Handle other types by looking for getData methods via reflection
            else {
                try {
                    Method getDataMethod = result.getClass().getMethod("getData");
                    Object data = getDataMethod.invoke(result);
                    if (data instanceof byte[]) {
                        return bytesToHex((byte[]) data);
                    } else if (data instanceof String) {
                        return (String) data;
                    }
                } catch (NoSuchMethodException e) {
                    // No getData method, try toString
                    String str = result.toString();
                    if (str.matches("^[0-9A-Fa-f]+$")) {
                        return str.toUpperCase();
                    }
                }
            }
        } catch (Exception e) {
            Log.w(TAG, "extractHexFromResult error: " + e.getMessage());
        }
        return "";
    }
    
    /**
     * Try to extract extra data from UHFTagEntity using reflection
     */
    private String tryExtractExtraDataFromTag(UHFTagEntity tag) {
        try {
            // Look for getTid, getUserData, etc. methods
            Method[] methods = tag.getClass().getDeclaredMethods();
            for (Method m : methods) {
                String name = m.getName().toLowerCase();
                if ((name.contains("tid") || name.contains("user") || name.contains("data")) && 
                    m.getParameterCount() == 0) {
                    Object val = m.invoke(tag);
                    if (val instanceof byte[]) {
                        return bytesToHex((byte[]) val);
                    } else if (val instanceof String && !((String) val).isEmpty()) {
                        return (String) val;
                    }
                }
            }
        } catch (Exception e) {
            Log.w(TAG, "tryExtractExtraDataFromTag error: " + e.getMessage());
        }
        return "";
    }
    
    /**
     * Convert byte array to hex string
     */
    private String bytesToHex(byte[] bytes) {
        if (bytes == null || bytes.length == 0) {
            return "";
        }
        StringBuilder sb = new StringBuilder();
        for (byte b : bytes) {
            sb.append(String.format("%02X", b));
        }
        return sb.toString();
    }

    @PluginMethod
    public void startContinuous(PluginCall call) {
        if (!isConnected) {
            call.reject("Reader not connected");
            return;
        }

        if (isScanning) {
            call.reject("Already scanning");
            return;
        }

        try {
            // Set up the inventory data listener
            uhfReader.setOnInventoryDataListener(new OnInventoryDataListener() {
                @Override
                public void onInventoryData(List<UHFTagEntity> tags) {
                    if (tags != null) {
                        for (UHFTagEntity tag : tags) {
                            if (tag != null) {
                                JSObject tagData = new JSObject();
                                // Note: SDK uses getEcpHex() not getEpc()
                                tagData.put("epc", tag.getEcpHex());
                                tagData.put("rssi", tag.getRssi());
                                tagData.put("count", tag.getCount());
                                tagData.put("timestamp", System.currentTimeMillis());
                                
                                notifyListeners("tagDetected", tagData);
                                Log.d(TAG, "Tag detected: " + tag.getEcpHex());
                            }
                        }
                    }
                }
            });
            
            // Start inventory
            UHFReaderResult<Boolean> result = uhfReader.startInventory();
            Boolean started = result.getData();
            
            if (started != null && started) {
                isScanning = true;
                
                JSObject response = new JSObject();
                response.put("scanning", true);
                response.put("message", "Continuous scanning started");
                call.resolve(response);
                
                Log.d(TAG, "Continuous scanning started");
            } else {
                String errorMsg = result.getMessage();
                Log.e(TAG, "Failed to start scanning: " + errorMsg);
                call.reject("Failed to start scanning: " + errorMsg);
            }
        } catch (Exception e) {
            Log.e(TAG, "Start continuous error: " + e.getMessage(), e);
            call.reject("Start error: " + e.getMessage());
        }
    }

    @PluginMethod
    public void stopContinuous(PluginCall call) {
        if (!isScanning) {
            JSObject response = new JSObject();
            response.put("scanning", false);
            response.put("message", "Not currently scanning");
            call.resolve(response);
            return;
        }

        try {
            if (uhfReader != null) {
                UHFReaderResult<Boolean> result = uhfReader.stopInventory();
                Log.d(TAG, "Stop inventory result: " + result.getMessage());
            }
            isScanning = false;
            
            JSObject response = new JSObject();
            response.put("scanning", false);
            response.put("message", "Scanning stopped");
            call.resolve(response);
            
            Log.d(TAG, "Continuous scanning stopped");
        } catch (Exception e) {
            Log.e(TAG, "Stop continuous error: " + e.getMessage(), e);
            call.reject("Stop error: " + e.getMessage());
        }
    }

    @PluginMethod
    public void setPower(PluginCall call) {
        if (!isConnected) {
            call.reject("Reader not connected");
            return;
        }

        int power = call.getInt("power", 30);
        
        if (power < 5 || power > 33) {
            call.reject("Power must be between 5 and 33 dBm");
            return;
        }

        try {
            if (uhfReader != null) {
                UHFReaderResult<Boolean> result = uhfReader.setPower(power);
                Boolean success = result.getData();
                
                if (success != null && success) {
                    currentPower = power;
                    
                    JSObject response = new JSObject();
                    response.put("power", power);
                    response.put("message", "Power set to " + power + " dBm");
                    call.resolve(response);
                    
                    Log.d(TAG, "Power set to: " + power);
                } else {
                    call.reject("Failed to set power: " + result.getMessage());
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "Set power error: " + e.getMessage(), e);
            call.reject("Set power error: " + e.getMessage());
        }
    }

    @PluginMethod
    public void getStatus(PluginCall call) {
        JSObject response = new JSObject();
        response.put("connected", isConnected);
        response.put("scanning", isScanning);
        response.put("power", currentPower);
        call.resolve(response);
    }

    @Override
    protected void handleOnDestroy() {
        if (uhfReader != null) {
            if (isScanning) {
                try {
                    uhfReader.stopInventory();
                } catch (Exception e) {
                    Log.e(TAG, "Error stopping inventory: " + e.getMessage());
                }
                isScanning = false;
            }
            if (isConnected) {
                try {
                    uhfReader.disConnect();
                } catch (Exception e) {
                    Log.e(TAG, "Error disconnecting: " + e.getMessage());
                }
                isConnected = false;
            }
        }
        super.handleOnDestroy();
    }
}
