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
        
        try {
            if (uhfReader == null) {
                Log.d(TAG, "uhfReader is null, calling getInstance()");
                uhfReader = UHFReader.getInstance();
            }

            if (uhfReader == null) {
                Log.e(TAG, "UHFReader.getInstance() returned null");
                call.reject("UHF reader not available (getInstance returned null)");
                return;
            }
            
            Log.d(TAG, "Calling uhfReader.connect()...");
            // Connect to the UHF reader (v1.1.0 API takes no arguments)
            UHFReaderResult<Boolean> result = uhfReader.connect();

            if (result == null) {
                Log.e(TAG, "uhfReader.connect(...) returned null result");
                call.reject("Failed to connect: null result from SDK");
                return;
            }

            Boolean success = result.getData();
            
            if (success != null && success) {
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
                    // Use Throwable to catch UnsatisfiedLinkError and other linkage issues
                    Log.e(TAG, "setPower threw: " + t.getMessage(), t);
                }
                
                JSObject response = new JSObject();
                response.put("connected", true);
                response.put("message", "UHF Reader connected successfully");
                call.resolve(response);
                
                Log.d(TAG, "UHF Reader connected");
            } else {
                String errorMsg = result.getMessage();
                Log.e(TAG, "Failed to connect: " + errorMsg);
                call.reject("Failed to connect to UHF Reader: " + errorMsg);
            }
        } catch (Throwable t) {
            // Throwable to catch native linkage errors that would otherwise crash the app
            Log.e(TAG, "Connection fatal error: " + t.getMessage(), t);
            call.reject("Connection error: " + t.getMessage());
        }
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
            
            Log.d(TAG, "readTagDetails: Tag found with EPC: " + epcFromInventory);
            
            // Initialize data holders
            String tid = "";
            String epc = epcFromInventory != null ? epcFromInventory : "";
            String userData = "";
            
            // Step 2: Try to read TID memory bank using reflection to find the right method
            tid = tryReadMemoryBank(MEMBANK_TID, 0, 6, epcFromInventory);
            
            // Step 3: Try to read EPC memory bank (starting at address 2 to skip CRC/PC)
            String epcFromBank = tryReadMemoryBank(MEMBANK_EPC, 2, 6, epcFromInventory);
            if (epcFromBank != null && !epcFromBank.isEmpty()) {
                epc = epcFromBank;
            }
            
            // Step 4: Try to read User memory bank
            userData = tryReadMemoryBank(MEMBANK_USER, 0, 16, epcFromInventory);
            
            // Build response with all data
            JSObject response = new JSObject();
            response.put("success", true);
            response.put("tid", tid != null ? tid : "");
            response.put("epc", epc);
            response.put("userData", userData != null ? userData : "");
            response.put("rssi", rssi);
            response.put("timestamp", System.currentTimeMillis());
            
            call.resolve(response);
            Log.d(TAG, "readTagDetails: Complete - TID=" + tid + ", EPC=" + epc + ", User=" + userData);
            
        } catch (Exception e) {
            Log.e(TAG, "readTagDetails error: " + e.getMessage(), e);
            call.reject("Read tag details error: " + e.getMessage());
        }
    }
    
    /**
     * Try to read a memory bank using various method signatures
     * Returns hex string or empty string if read fails
     */
    private String tryReadMemoryBank(int memBank, int startAddr, int wordCount, String epc) {
        String result = "";
        
        // Try different method names that might exist in the SDK
        String[] methodNames = {"readData", "read", "readTagData", "Read", "readMemory"};
        
        for (String methodName : methodNames) {
            result = tryReadWithMethod(methodName, memBank, startAddr, wordCount, epc);
            if (result != null && !result.isEmpty()) {
                Log.d(TAG, "Successfully read bank " + memBank + " using method: " + methodName);
                return result;
            }
        }
        
        // If all methods fail, try using reflection to find any read-like method
        result = tryReadWithReflection(memBank, startAddr, wordCount, epc);
        
        return result != null ? result : "";
    }
    
    /**
     * Try to call a specific read method by name
     */
    private String tryReadWithMethod(String methodName, int memBank, int startAddr, int wordCount, String epc) {
        try {
            // Try common method signatures
            Method[] methods = UHFReader.class.getDeclaredMethods();
            
            for (Method method : methods) {
                if (!method.getName().equalsIgnoreCase(methodName)) continue;
                
                Class<?>[] paramTypes = method.getParameterTypes();
                Log.d(TAG, "Found method " + methodName + " with " + paramTypes.length + " params");
                
                Object readResult = null;
                
                // Try different parameter combinations
                if (paramTypes.length == 4) {
                    // (password, membank, address, length) or (membank, address, length, password)
                    try {
                        if (paramTypes[0] == String.class) {
                            readResult = method.invoke(uhfReader, DEFAULT_PASSWORD, memBank, startAddr, wordCount);
                        } else if (paramTypes[0] == int.class) {
                            readResult = method.invoke(uhfReader, memBank, startAddr, wordCount, DEFAULT_PASSWORD);
                        }
                    } catch (Exception e) {
                        Log.w(TAG, "4-param invoke failed: " + e.getMessage());
                    }
                } else if (paramTypes.length == 5) {
                    // (password, membank, address, length, epc)
                    try {
                        readResult = method.invoke(uhfReader, DEFAULT_PASSWORD, memBank, startAddr, wordCount, epc);
                    } catch (Exception e) {
                        Log.w(TAG, "5-param invoke failed: " + e.getMessage());
                    }
                } else if (paramTypes.length == 6) {
                    // (password, membank, address, length, filter, entity)
                    try {
                        readResult = method.invoke(uhfReader, DEFAULT_PASSWORD, memBank, startAddr, wordCount, false, null);
                    } catch (Exception e) {
                        Log.w(TAG, "6-param invoke failed: " + e.getMessage());
                    }
                }
                
                if (readResult != null) {
                    return extractHexFromResult(readResult);
                }
            }
        } catch (Exception e) {
            Log.w(TAG, "tryReadWithMethod(" + methodName + ") failed: " + e.getMessage());
        }
        return "";
    }
    
    /**
     * Use reflection to find and call any read method
     */
    private String tryReadWithReflection(int memBank, int startAddr, int wordCount, String epc) {
        try {
            Method[] methods = UHFReader.class.getDeclaredMethods();
            
            for (Method method : methods) {
                String name = method.getName().toLowerCase();
                if (!name.contains("read") || name.contains("power") || name.contains("rssi")) continue;
                
                Log.d(TAG, "Trying reflection on method: " + method.getName());
                
                // Skip methods that are clearly not for memory reading
                if (method.getReturnType() == void.class) continue;
                if (method.getParameterCount() < 2) continue;
                
                // Try to invoke with common patterns
                Class<?>[] paramTypes = method.getParameterTypes();
                Object result = null;
                
                try {
                    if (paramTypes.length == 4) {
                        result = method.invoke(uhfReader, DEFAULT_PASSWORD, memBank, startAddr, wordCount);
                    }
                } catch (Exception e) {
                    // Try next
                }
                
                if (result != null) {
                    String hex = extractHexFromResult(result);
                    if (hex != null && !hex.isEmpty()) {
                        Log.d(TAG, "Reflection read success with method: " + method.getName());
                        return hex;
                    }
                }
            }
        } catch (Exception e) {
            Log.w(TAG, "Reflection read failed: " + e.getMessage());
        }
        return "";
    }
    
    /**
     * Extract hex string from various result types
     */
    private String extractHexFromResult(Object result) {
        if (result == null) return "";
        
        try {
            // Handle UHFReaderResult<byte[]>
            if (result instanceof UHFReaderResult) {
                UHFReaderResult<?> readerResult = (UHFReaderResult<?>) result;
                Object data = readerResult.getData();
                if (data instanceof byte[]) {
                    return bytesToHex((byte[]) data);
                } else if (data instanceof String) {
                    return (String) data;
                }
            }
            // Handle byte[] directly
            else if (result instanceof byte[]) {
                return bytesToHex((byte[]) result);
            }
            // Handle String directly
            else if (result instanceof String) {
                return (String) result;
            }
        } catch (Exception e) {
            Log.w(TAG, "extractHexFromResult error: " + e.getMessage());
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
