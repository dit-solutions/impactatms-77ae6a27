package com.mivanta.rfid;

import android.util.Log;
import android.view.KeyEvent;
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
 * For Impact ATMS
 */
@CapacitorPlugin(name = "MivantaRfid")
public class MivantaRfidPlugin extends Plugin {

    private static final String TAG = "MivantaRfidPlugin";
    
    // Memory bank constants (standard UHF Gen2)
    private static final int MEMBANK_RESERVED = 0;
    private static final int MEMBANK_EPC = 1;
    private static final int MEMBANK_TID = 2;
    private static final int MEMBANK_USER = 3;
    
    // Default access password
    private static final String DEFAULT_PASSWORD = "00000000";
    
    // Hardware trigger button key codes (common for handheld scanners)
    private static final int KEYCODE_SCAN_TRIGGER = 280;
    private static final int KEYCODE_SCAN_TRIGGER_ALT = 139;
    private static final int KEYCODE_SCAN_TRIGGER_ALT2 = 293;
    private static final int KEYCODE_SCAN_LEFT = 520;
    private static final int KEYCODE_SCAN_RIGHT = 521;
    
    private UHFReader uhfReader;
    private boolean isConnected = false;
    private boolean isScanning = false;
    private int currentPower = 30;
    private boolean sdkAvailable = false;
    private static boolean nativeLibsLoaded = false;
    
    // Track current read mode
    private String currentMode = "single";
    private boolean continuousModeStartedByTrigger = false;

    private static synchronized void loadNativeLibraries() {
        if (nativeLibsLoaded) {
            return;
        }
        
        String[] libraries = {"power", "SerialPortHc", "ModuleAPI"};
        
        for (String lib : libraries) {
            try {
                Log.d(TAG, "Loading native library: " + lib);
                System.loadLibrary(lib);
                Log.d(TAG, "Successfully loaded: " + lib);
            } catch (UnsatisfiedLinkError e) {
                Log.w(TAG, "Could not load " + lib + " (may be bundled in AAR): " + e.getMessage());
            } catch (Throwable t) {
                Log.e(TAG, "Error loading " + lib + ": " + t.getMessage(), t);
            }
        }
        
        nativeLibsLoaded = true;
        Log.d(TAG, "Native library loading completed");
    }

    @Override
    public void load() {
        super.load();
        Log.d(TAG, "MivantaRfidPlugin loaded - initializing UHF Reader");
        
        loadNativeLibraries();
        
        try {
            uhfReader = UHFReader.getInstance();
            if (uhfReader != null) {
                sdkAvailable = true;
                Log.d(TAG, "UHFReader instance obtained successfully");
                logAvailableMethods();
            } else {
                Log.w(TAG, "UHFReader.getInstance() returned null");
            }
        } catch (Throwable t) {
            Log.e(TAG, "Failed to get UHFReader instance: " + t.getMessage(), t);
            sdkAvailable = false;
        }
    }
    
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
     * Handle hardware key events (scan trigger button)
     * This is called from MainActivity
     */
    public boolean handleKeyDown(int keyCode, KeyEvent event) {
        Log.d(TAG, "Key down: " + keyCode + " (connected=" + isConnected + ", mode=" + currentMode + ")");
        
        if (isTriggerKey(keyCode) && isConnected) {
            Log.d(TAG, "Trigger button pressed - performing scan action");
            
            // Notify web app
            JSObject data = new JSObject();
            data.put("action", "trigger_pressed");
            data.put("mode", currentMode);
            data.put("isScanning", isScanning);
            data.put("keyCode", keyCode);
            notifyListeners("triggerPressed", data);
            
            // Also directly perform scan based on mode
            performTriggerScan();
            
            return true;
        }
        return false;
    }
    
    public boolean handleKeyUp(int keyCode, KeyEvent event) {
        Log.d(TAG, "Key up: " + keyCode);
        
        if (isTriggerKey(keyCode) && isConnected) {
            JSObject data = new JSObject();
            data.put("action", "trigger_released");
            data.put("mode", currentMode);
            notifyListeners("triggerReleased", data);
            return true;
        }
        return false;
    }
    
    private boolean isTriggerKey(int keyCode) {
        return keyCode == KEYCODE_SCAN_TRIGGER || 
               keyCode == KEYCODE_SCAN_TRIGGER_ALT || 
               keyCode == KEYCODE_SCAN_TRIGGER_ALT2 ||
               keyCode == KEYCODE_SCAN_LEFT ||
               keyCode == KEYCODE_SCAN_RIGHT ||
               keyCode == KeyEvent.KEYCODE_F7 ||
               keyCode == KeyEvent.KEYCODE_F8 ||
               keyCode == KeyEvent.KEYCODE_CAMERA ||
               keyCode == KeyEvent.KEYCODE_FOCUS;
    }
    
    /**
     * Perform scan action when physical trigger is pressed
     */
    private void performTriggerScan() {
        if (!isConnected || uhfReader == null) {
            Log.w(TAG, "Cannot scan - not connected");
            return;
        }
        
        new Thread(() -> {
            try {
                if (currentMode.equals("continuous")) {
                    // Continuous mode: start scanning if not already
                    if (!isScanning) {
                        startContinuousInternal();
                        continuousModeStartedByTrigger = true;
                    }
                } else {
                    // Single mode: perform single read with details
                    performSingleScanInternal();
                }
            } catch (Exception e) {
                Log.e(TAG, "Trigger scan error: " + e.getMessage(), e);
            }
        }).start();
    }
    
    /**
     * Internal method to perform single scan and emit result
     */
    private void performSingleScanInternal() {
        try {
            UHFReaderResult<UHFTagEntity> result = uhfReader.singleTagInventory();
            
            if (result != null && result.getData() != null) {
                UHFTagEntity tag = result.getData();
                String epc = tag.getEcpHex();
                int rssi = tag.getRssi();
                
                // Try to read all memory banks
                String tid = tryReadMemoryBankDirect(MEMBANK_TID, 0, 6, epc);
                String userData = tryReadMemoryBankDirect(MEMBANK_USER, 0, 32, epc);
                
                if (userData.isEmpty()) {
                    userData = tryReadMemoryBankDirect(MEMBANK_USER, 0, 16, epc);
                }
                
                // Create FASTag data object
                JSObject fastTagData = new JSObject();
                fastTagData.put("success", true);
                fastTagData.put("tid", tid);
                fastTagData.put("epc", epc != null ? epc : "");
                fastTagData.put("userData", userData);
                fastTagData.put("rssi", rssi);
                fastTagData.put("timestamp", System.currentTimeMillis());
                
                // Notify via trigger-specific event
                notifyListeners("triggerScanResult", fastTagData);
                
                Log.d(TAG, "Trigger scan complete: EPC=" + epc + ", TID=" + tid);
            } else {
                JSObject noTag = new JSObject();
                noTag.put("success", false);
                noTag.put("message", "No tag detected");
                noTag.put("timestamp", System.currentTimeMillis());
                notifyListeners("triggerScanResult", noTag);
                Log.d(TAG, "Trigger scan: no tag detected");
            }
        } catch (Exception e) {
            Log.e(TAG, "performSingleScanInternal error: " + e.getMessage(), e);
        }
    }
    
    /**
     * Internal method to start continuous scanning
     */
    private void startContinuousInternal() {
        try {
            uhfReader.setOnInventoryDataListener(new OnInventoryDataListener() {
                @Override
                public void onInventoryData(List<UHFTagEntity> tags) {
                    if (tags != null) {
                        for (UHFTagEntity tag : tags) {
                            if (tag != null) {
                                JSObject tagData = new JSObject();
                                tagData.put("epc", tag.getEcpHex());
                                tagData.put("rssi", tag.getRssi());
                                tagData.put("count", tag.getCount());
                                tagData.put("timestamp", System.currentTimeMillis());
                                notifyListeners("tagDetected", tagData);
                            }
                        }
                    }
                }
            });
            
            UHFReaderResult<Boolean> result = uhfReader.startInventory();
            Boolean started = result.getData();
            
            if (started != null && started) {
                isScanning = true;
                Log.d(TAG, "Continuous scanning started via trigger");
            }
        } catch (Exception e) {
            Log.e(TAG, "startContinuousInternal error: " + e.getMessage(), e);
        }
    }
    
    @PluginMethod
    public void setMode(PluginCall call) {
        String mode = call.getString("mode", "single");
        currentMode = mode;
        Log.d(TAG, "Mode set to: " + mode);
        
        // If switching to single mode and was scanning, stop
        if (mode.equals("single") && isScanning) {
            try {
                uhfReader.stopInventory();
                isScanning = false;
                Log.d(TAG, "Stopped scanning due to mode switch to single");
            } catch (Exception e) {
                Log.w(TAG, "Error stopping inventory on mode switch: " + e.getMessage());
            }
        }
        
        JSObject response = new JSObject();
        response.put("mode", mode);
        call.resolve(response);
    }
    
    @PluginMethod
    public void getDebugInfo(PluginCall call) {
        JSObject response = new JSObject();
        response.put("sdkAvailable", sdkAvailable);
        response.put("nativeLibsLoaded", nativeLibsLoaded);
        response.put("isConnected", isConnected);
        response.put("currentMode", currentMode);
        
        StringBuilder methodsList = new StringBuilder();
        
        if (sdkAvailable && uhfReader != null) {
            try {
                // UHFReader methods
                methodsList.append("=== UHFReader ===\n");
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
                
                // UHFTagEntity methods
                methodsList.append("\n=== UHFTagEntity ===\n");
                Method[] entityMethods = UHFTagEntity.class.getDeclaredMethods();
                for (Method m : entityMethods) {
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
    }

    @PluginMethod
    public void connect(PluginCall call) {
        Log.d(TAG, "connect() called, sdkAvailable=" + sdkAvailable);
        
        if (!sdkAvailable) {
            call.reject("RFID SDK not available");
            return;
        }
        
        new Thread(() -> {
            try {
                if (uhfReader == null) {
                    uhfReader = UHFReader.getInstance();
                }

                if (uhfReader == null) {
                    getActivity().runOnUiThread(() -> 
                        call.reject("UHF reader not available")
                    );
                    return;
                }
                
                boolean connected = false;
                String lastError = "Unknown error";
                
                for (int attempt = 1; attempt <= 3 && !connected; attempt++) {
                    Log.d(TAG, "Connection attempt " + attempt);
                    
                    if (attempt == 1) {
                        try { Thread.sleep(200); } catch (InterruptedException ignored) {}
                    }
                    
                    UHFReaderResult<Boolean> result = uhfReader.connect();
                    
                    if (result != null) {
                        Boolean success = result.getData();
                        if (success != null && success) {
                            connected = true;
                        } else {
                            lastError = result.getMessage() != null ? result.getMessage() : "null";
                        }
                    }
                    
                    if (!connected && attempt < 3) {
                        try { Thread.sleep(500); } catch (InterruptedException ignored) {}
                    }
                }
                
                if (connected) {
                    isConnected = true;
                    
                    try {
                        uhfReader.setPower(currentPower);
                    } catch (Throwable t) {
                        Log.e(TAG, "setPower error: " + t.getMessage());
                    }
                    
                    JSObject response = new JSObject();
                    response.put("connected", true);
                    response.put("message", "RFID Reader connected");
                    getActivity().runOnUiThread(() -> call.resolve(response));
                    Log.d(TAG, "RFID Reader connected");
                } else {
                    final String errorMsg = lastError;
                    getActivity().runOnUiThread(() -> 
                        call.reject("Failed to connect: " + errorMsg)
                    );
                }
            } catch (Throwable t) {
                Log.e(TAG, "Connection error: " + t.getMessage(), t);
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
                uhfReader.disConnect();
            }
            isConnected = false;
            
            JSObject response = new JSObject();
            response.put("connected", false);
            response.put("message", "RFID Reader disconnected");
            call.resolve(response);
            Log.d(TAG, "RFID Reader disconnected");
        } catch (Exception e) {
            Log.e(TAG, "Disconnect error: " + e.getMessage(), e);
            call.reject("Disconnect error: " + e.getMessage());
        }
    }

    @PluginMethod
    public void readSingle(PluginCall call) {
        if (!isConnected || uhfReader == null) {
            call.reject("Reader not connected");
            return;
        }

        try {
            UHFReaderResult<UHFTagEntity> result = uhfReader.singleTagInventory();
            
            if (result == null || result.getData() == null) {
                JSObject response = new JSObject();
                response.put("success", false);
                response.put("epc", "");
                response.put("timestamp", System.currentTimeMillis());
                call.resolve(response);
                return;
            }
            
            UHFTagEntity tag = result.getData();
            
            JSObject response = new JSObject();
            response.put("success", true);
            response.put("epc", tag.getEcpHex() != null ? tag.getEcpHex() : "");
            response.put("rssi", tag.getRssi());
            response.put("timestamp", System.currentTimeMillis());
            call.resolve(response);
            
            Log.d(TAG, "Single read: " + tag.getEcpHex());
        } catch (Exception e) {
            Log.e(TAG, "Single read error: " + e.getMessage(), e);
            call.reject("Read error: " + e.getMessage());
        }
    }

    @PluginMethod
    public void readTagDetails(PluginCall call) {
        if (!isConnected || uhfReader == null) {
            call.reject("Reader not connected");
            return;
        }

        try {
            UHFReaderResult<UHFTagEntity> inventoryResult = uhfReader.singleTagInventory();
            
            if (inventoryResult == null || inventoryResult.getData() == null) {
                JSObject response = new JSObject();
                response.put("success", false);
                response.put("message", "No tag detected");
                response.put("timestamp", System.currentTimeMillis());
                call.resolve(response);
                return;
            }
            
            UHFTagEntity tag = inventoryResult.getData();
            String epcFromInventory = tag.getEcpHex();
            int rssi = tag.getRssi();
            
            Log.d(TAG, "readTagDetails: Tag found - EPC: " + epcFromInventory + ", RSSI: " + rssi);
            
            // Read TID
            String tid = tryReadMemoryBankDirect(MEMBANK_TID, 0, 6, epcFromInventory);
            Log.d(TAG, "TID read result: '" + tid + "'");
            
            // Read User data with multiple size attempts
            String userData = tryReadMemoryBankDirect(MEMBANK_USER, 0, 32, epcFromInventory);
            if (userData.isEmpty()) {
                userData = tryReadMemoryBankDirect(MEMBANK_USER, 0, 16, epcFromInventory);
            }
            if (userData.isEmpty()) {
                userData = tryReadMemoryBankDirect(MEMBANK_USER, 0, 8, epcFromInventory);
            }
            Log.d(TAG, "User data read result: '" + userData + "'");
            
            JSObject response = new JSObject();
            response.put("success", true);
            response.put("tid", tid != null ? tid : "");
            response.put("epc", epcFromInventory != null ? epcFromInventory : "");
            response.put("userData", userData != null ? userData : "");
            response.put("rssi", rssi);
            response.put("timestamp", System.currentTimeMillis());
            
            call.resolve(response);
            Log.d(TAG, "readTagDetails complete: TID=" + tid + ", EPC=" + epcFromInventory);
            
        } catch (Exception e) {
            Log.e(TAG, "readTagDetails error: " + e.getMessage(), e);
            call.reject("Read error: " + e.getMessage());
        }
    }
    
    @PluginMethod
    public void parseRawReaderData(PluginCall call) {
        String rawData = call.getString("rawData", "");
        
        if (rawData == null || rawData.isEmpty()) {
            call.reject("No raw data provided");
            return;
        }
        
        JSObject result = parseReaderDataString(rawData);
        call.resolve(result);
    }
    
    private JSObject parseReaderDataString(String rawData) {
        String cleanData = rawData.replaceAll("\\s+", "").toUpperCase();
        
        Log.d(TAG, "parseReaderDataString: " + cleanData + " (length: " + cleanData.length() + ")");
        
        String tid = "";
        String epc = "";
        String userData = "";
        
        if (cleanData.length() >= 24) {
            tid = cleanData.substring(0, 24);
            String remaining = cleanData.substring(24);
            
            int epcStart = remaining.indexOf('E');
            if (epcStart >= 0) {
                String fromE = remaining.substring(epcStart);
                if (fromE.length() >= 24) {
                    epc = fromE.substring(0, 24);
                    userData = fromE.substring(24);
                } else {
                    epc = fromE;
                }
            } else {
                userData = remaining;
            }
        } else {
            if (cleanData.startsWith("E")) {
                epc = cleanData;
            } else {
                tid = cleanData;
            }
        }
        
        JSObject result = new JSObject();
        result.put("tid", tid);
        result.put("epc", epc);
        result.put("userData", userData);
        result.put("rawLength", cleanData.length());
        
        return result;
    }
    
    private String tryReadMemoryBankDirect(int memBank, int startAddr, int wordCount, String epc) {
        String result = "";
        
        Log.d(TAG, "tryReadMemoryBankDirect: bank=" + memBank + ", addr=" + startAddr + ", words=" + wordCount + ", epc=" + epc);
        
        // Method 1: Try the documented 6-parameter Read method from SDK API
        // Read(password, membank, address, wordCount, specifyLabel, filterEntity)
        result = tryDocumentedReadMethod(memBank, startAddr, wordCount, epc);
        if (result != null && !result.isEmpty()) {
            Log.d(TAG, "Read success via documented method: " + result);
            return result;
        }
        
        // Method 2: Try with filter entity created from EPC
        result = tryReadWithFilterEntity(memBank, startAddr, wordCount, epc);
        if (result != null && !result.isEmpty()) {
            Log.d(TAG, "Read success with filter entity: " + result);
            return result;
        }
        
        // Method 3: Fallback to reflection discovery
        result = tryReadWithReflectionDiscovery(memBank, startAddr, wordCount, epc);
        if (result != null && !result.isEmpty()) {
            Log.d(TAG, "Read success via reflection: " + result);
            return result;
        }
        
        Log.w(TAG, "All read attempts failed for bank " + memBank);
        return "";
    }
    
    /**
     * Try to read memory bank using reflection to find the correct Read method signature
     * The SDK's Read method may have different signatures depending on version
     */
    private String tryDocumentedReadMethod(int memBank, int startAddr, int wordCount, String epc) {
        try {
            Method[] methods = UHFReader.class.getDeclaredMethods();
            
            for (Method method : methods) {
                String name = method.getName();
                // Look specifically for "Read" method (case-sensitive as per SDK docs)
                if (!name.equals("Read") && !name.equals("read")) continue;
                
                Class<?>[] paramTypes = method.getParameterTypes();
                Log.d(TAG, "Found Read method with " + paramTypes.length + " params: " + getParamTypesString(paramTypes));
                
                Object readResult = null;
                
                try {
                    // Try 6-param: Read(password, membank, address, wordCount, specifyLabel, filterEntity)
                    if (paramTypes.length == 6) {
                        readResult = method.invoke(uhfReader, DEFAULT_PASSWORD, memBank, startAddr, wordCount, false, null);
                    }
                    // Try 5-param: Read(password, membank, address, wordCount, filterEntity)
                    else if (paramTypes.length == 5) {
                        readResult = method.invoke(uhfReader, DEFAULT_PASSWORD, memBank, startAddr, wordCount, null);
                    }
                    // Try 4-param: Read(password, membank, address, wordCount)
                    else if (paramTypes.length == 4 && paramTypes[0] == String.class) {
                        readResult = method.invoke(uhfReader, DEFAULT_PASSWORD, memBank, startAddr, wordCount);
                    }
                    // Try 4-param alternate: Read(membank, address, wordCount, password)
                    else if (paramTypes.length == 4 && paramTypes[0] == int.class) {
                        readResult = method.invoke(uhfReader, memBank, startAddr, wordCount, DEFAULT_PASSWORD);
                    }
                    // Try 3-param: Read(membank, address, wordCount)
                    else if (paramTypes.length == 3) {
                        readResult = method.invoke(uhfReader, memBank, startAddr, wordCount);
                    }
                } catch (Exception e) {
                    Log.d(TAG, "Read method invoke failed: " + e.getMessage());
                    continue;
                }
                
                if (readResult != null) {
                    String hex = extractHexFromResult(readResult);
                    if (hex != null && !hex.isEmpty() && !hex.matches("^0+$")) {
                        Log.d(TAG, "Read success with " + paramTypes.length + "-param Read: " + hex);
                        return hex;
                    }
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "tryDocumentedReadMethod error: " + e.getMessage(), e);
        }
        return "";
    }
    
    private String getParamTypesString(Class<?>[] params) {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < params.length; i++) {
            if (i > 0) sb.append(", ");
            sb.append(params[i].getSimpleName());
        }
        return sb.toString();
    }
    
    /**
     * Try reading with a filter entity to target a specific tag by EPC
     * Uses reflection to find the correct method signature
     */
    private String tryReadWithFilterEntity(int memBank, int startAddr, int wordCount, String epc) {
        if (epc == null || epc.isEmpty()) {
            return "";
        }
        
        try {
            // Create filter entity and set EPC
            UHFTagEntity filterEntity = new UHFTagEntity();
            boolean epcSet = trySetEpcOnEntity(filterEntity, epc);
            
            if (!epcSet) {
                Log.w(TAG, "Could not set EPC on filter entity, skipping filtered read");
                return "";
            }
            
            Method[] methods = UHFReader.class.getDeclaredMethods();
            
            for (Method method : methods) {
                String name = method.getName();
                if (!name.equals("Read") && !name.equals("read")) continue;
                
                Class<?>[] paramTypes = method.getParameterTypes();
                Object readResult = null;
                
                try {
                    // Try 6-param with filter: Read(password, membank, address, wordCount, specifyLabel, filterEntity)
                    if (paramTypes.length == 6 && paramTypes[5] == UHFTagEntity.class) {
                        readResult = method.invoke(uhfReader, DEFAULT_PASSWORD, memBank, startAddr, wordCount, true, filterEntity);
                    }
                    // Try 5-param with filter: Read(password, membank, address, wordCount, filterEntity)
                    else if (paramTypes.length == 5 && paramTypes[4] == UHFTagEntity.class) {
                        readResult = method.invoke(uhfReader, DEFAULT_PASSWORD, memBank, startAddr, wordCount, filterEntity);
                    }
                } catch (Exception e) {
                    Log.d(TAG, "Filtered Read method invoke failed: " + e.getMessage());
                    continue;
                }
                
                if (readResult != null) {
                    String hex = extractHexFromResult(readResult);
                    if (hex != null && !hex.isEmpty() && !hex.matches("^0+$")) {
                        Log.d(TAG, "Filtered Read success: " + hex);
                        return hex;
                    }
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "tryReadWithFilterEntity error: " + e.getMessage(), e);
        }
        return "";
    }
    
    /**
     * Try to set EPC on filter entity using reflection (method name may vary by SDK version)
     */
    private boolean trySetEpcOnEntity(UHFTagEntity entity, String epc) {
        // Try common method names for setting EPC
        String[] methodNames = {"setEpc", "setEcpHex", "setECP", "setEpcData", "setEcphex"};
        
        for (String methodName : methodNames) {
            try {
                Method setMethod = UHFTagEntity.class.getMethod(methodName, String.class);
                setMethod.invoke(entity, epc);
                Log.d(TAG, "Set EPC via " + methodName + ": " + epc);
                return true;
            } catch (NoSuchMethodException e) {
                // Try next method name
            } catch (Exception e) {
                Log.w(TAG, "Error calling " + methodName + ": " + e.getMessage());
            }
        }
        
        // Also try byte array setters
        try {
            Method setMethod = UHFTagEntity.class.getMethod("setEpc", byte[].class);
            setMethod.invoke(entity, hexToBytes(epc));
            Log.d(TAG, "Set EPC via setEpc(byte[]): " + epc);
            return true;
        } catch (NoSuchMethodException e) {
            // Method doesn't exist
        } catch (Exception e) {
            Log.w(TAG, "Error setting EPC bytes: " + e.getMessage());
        }
        
        Log.w(TAG, "Could not find EPC setter on UHFTagEntity");
        return false;
    }
    
    /**
     * Convert hex string to byte array
     */
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
    
    private String tryReadWithReflectionDiscovery(int memBank, int startAddr, int wordCount, String epc) {
        try {
            Method[] methods = UHFReader.class.getDeclaredMethods();
            
            for (Method method : methods) {
                String name = method.getName().toLowerCase();
                
                // Look for read-related methods
                if (!name.contains("read") && !name.contains("data") && !name.contains("memory")) {
                    continue;
                }
                // Skip unrelated methods
                if (name.contains("power") || name.contains("rssi") || name.contains("listener")) {
                    continue;
                }
                if (method.getReturnType() == void.class) continue;
                
                Class<?>[] paramTypes = method.getParameterTypes();
                Object result = null;
                
                try {
                    if (paramTypes.length == 3) {
                        result = method.invoke(uhfReader, memBank, startAddr, wordCount);
                    } else if (paramTypes.length == 4) {
                        if (paramTypes[0] == String.class) {
                            result = method.invoke(uhfReader, DEFAULT_PASSWORD, memBank, startAddr, wordCount);
                        } else {
                            result = method.invoke(uhfReader, memBank, startAddr, wordCount, DEFAULT_PASSWORD);
                        }
                    } else if (paramTypes.length == 5) {
                        result = method.invoke(uhfReader, DEFAULT_PASSWORD, memBank, startAddr, wordCount, epc);
                    }
                } catch (Exception e) {
                    // Expected for many methods - continue trying
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
    
    private String extractHexFromResult(Object result) {
        if (result == null) return "";
        
        try {
            if (result instanceof UHFReaderResult) {
                UHFReaderResult<?> readerResult = (UHFReaderResult<?>) result;
                Object data = readerResult.getData();
                
                if (data == null) return "";
                
                if (data instanceof byte[]) {
                    return bytesToHex((byte[]) data);
                } else if (data instanceof String) {
                    return (String) data;
                } else if (data instanceof UHFTagEntity) {
                    return tryExtractExtraDataFromTag((UHFTagEntity) data);
                } else {
                    String str = data.toString();
                    if (str.matches("^[0-9A-Fa-f]+$")) {
                        return str.toUpperCase();
                    }
                }
            }
            else if (result instanceof byte[]) {
                return bytesToHex((byte[]) result);
            }
            else if (result instanceof String) {
                String str = (String) result;
                if (str.matches("^[0-9A-Fa-f]+$")) {
                    return str.toUpperCase();
                }
                return str;
            }
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
    
    private String tryExtractExtraDataFromTag(UHFTagEntity tag) {
        try {
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
            JSObject response = new JSObject();
            response.put("scanning", true);
            response.put("message", "Already scanning");
            call.resolve(response);
            return;
        }

        try {
            uhfReader.setOnInventoryDataListener(new OnInventoryDataListener() {
                @Override
                public void onInventoryData(List<UHFTagEntity> tags) {
                    if (tags != null) {
                        for (UHFTagEntity tag : tags) {
                            if (tag != null) {
                                JSObject tagData = new JSObject();
                                tagData.put("epc", tag.getEcpHex());
                                tagData.put("rssi", tag.getRssi());
                                tagData.put("count", tag.getCount());
                                tagData.put("timestamp", System.currentTimeMillis());
                                notifyListeners("tagDetected", tagData);
                            }
                        }
                    }
                }
            });
            
            UHFReaderResult<Boolean> result = uhfReader.startInventory();
            Boolean started = result.getData();
            
            if (started != null && started) {
                isScanning = true;
                
                JSObject response = new JSObject();
                response.put("scanning", true);
                response.put("message", "Scanning started");
                call.resolve(response);
                Log.d(TAG, "Continuous scanning started");
            } else {
                call.reject("Failed to start: " + result.getMessage());
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
            response.put("message", "Not scanning");
            call.resolve(response);
            return;
        }

        try {
            if (uhfReader != null) {
                uhfReader.stopInventory();
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
        response.put("mode", currentMode);
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
