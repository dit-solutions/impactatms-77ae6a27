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
import com.xlzn.hcpda.uhf.entity.SelectEntity;
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
    
    // Hardware trigger button key codes (Mpower 200 / CX 1500)
    // Main gun trigger keycodes
    private static final int KEYCODE_SCAN_TRIGGER = 280;
    private static final int KEYCODE_SCAN_TRIGGER_ALT = 139;
    private static final int KEYCODE_SCAN_TRIGGER_ALT2 = 293;
    // Side button keycodes (left/right)
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
    
    // Dynamically configurable gun trigger keycodes
    private int[] mainTriggerKeyCodes = { KEYCODE_SCAN_TRIGGER, KEYCODE_SCAN_TRIGGER_ALT, KEYCODE_SCAN_TRIGGER_ALT2 };
    
    // Track last keycode for debug panel
    private int lastKeyCode = -1;

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
        Log.d(TAG, "KEY_EVENT down: keyCode=" + keyCode + " (connected=" + isConnected + ", mode=" + currentMode + ")");
        
        // Track every keycode for debug panel
        lastKeyCode = keyCode;
        
        // Emit keyEvent for ALL physical keys (so debug panel can show them)
        JSObject keyEventData = new JSObject();
        keyEventData.put("keyCode", keyCode);
        keyEventData.put("action", "down");
        keyEventData.put("isMainTrigger", isMainTriggerKey(keyCode));
        keyEventData.put("isSideButton", isSideButton(keyCode));
        keyEventData.put("timestamp", System.currentTimeMillis());
        notifyListeners("keyEvent", keyEventData);
        
        // Only main gun trigger initiates scan
        if (isMainTriggerKey(keyCode) && isConnected) {
            Log.d(TAG, "MAIN GUN trigger pressed (keyCode=" + keyCode + ") - performing scan");
            
            JSObject data = new JSObject();
            data.put("action", "trigger_pressed");
            data.put("mode", currentMode);
            data.put("isScanning", isScanning);
            data.put("keyCode", keyCode);
            notifyListeners("triggerPressed", data);
            
            performTriggerScan();
            return true;
        }
        
        // Side buttons (520, 521) — pass through to Android default behavior
        if (isSideButton(keyCode)) {
            Log.d(TAG, "Side button pressed (keyCode=" + keyCode + ") - passing through");
            return false;
        }
        
        return false;
    }
    
    public boolean handleKeyUp(int keyCode, KeyEvent event) {
        Log.d(TAG, "KEY_EVENT up: keyCode=" + keyCode);
        
        if (isMainTriggerKey(keyCode) && isConnected) {
            JSObject data = new JSObject();
            data.put("action", "trigger_released");
            data.put("mode", currentMode);
            data.put("keyCode", keyCode);
            notifyListeners("triggerReleased", data);
            return true;
        }
        return false;
    }
    
    /**
     * Check if keycode is the MAIN gun trigger (not side buttons)
     */
    private boolean isMainTriggerKey(int keyCode) {
        for (int code : mainTriggerKeyCodes) {
            if (keyCode == code) return true;
        }
        return false;
    }
    
    /**
     * Check if keycode is a side button
     */
    private boolean isSideButton(int keyCode) {
        return keyCode == KEYCODE_SCAN_LEFT || keyCode == KEYCODE_SCAN_RIGHT;
    }
    
    /**
     * Legacy method — matches any trigger key (gun + side)
     */
    private boolean isTriggerKey(int keyCode) {
        return isMainTriggerKey(keyCode) || isSideButton(keyCode) ||
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
                
                // Try to read all memory banks using direct SDK calls
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
    public void setTriggerKeyCodes(PluginCall call) {
        String codesStr = call.getString("keyCodes", "");
        if (codesStr == null || codesStr.isEmpty()) {
            call.reject("keyCodes parameter required (comma-separated integers)");
            return;
        }
        
        try {
            String[] parts = codesStr.split(",");
            int[] newCodes = new int[parts.length];
            for (int i = 0; i < parts.length; i++) {
                newCodes[i] = Integer.parseInt(parts[i].trim());
            }
            mainTriggerKeyCodes = newCodes;
            
            JSObject response = new JSObject();
            response.put("keyCodes", codesStr);
            response.put("message", "Trigger keycodes updated to: " + codesStr);
            call.resolve(response);
            Log.d(TAG, "Trigger keycodes updated: " + codesStr);
        } catch (NumberFormatException e) {
            call.reject("Invalid keyCodes format: " + e.getMessage());
        }
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
                
                // SelectEntity methods  
                methodsList.append("\n=== SelectEntity ===\n");
                Method[] selectMethods = SelectEntity.class.getDeclaredMethods();
                for (Method m : selectMethods) {
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
            
            // Read TID using direct SDK call
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
    
    /**
     * Read memory bank using direct SDK call matching the manufacturer demo
     * Uses: uhfReader.read(password, membank, address, wordCount, selectEntity)
     */
    private String tryReadMemoryBankDirect(int memBank, int startAddr, int wordCount, String epc) {
        Log.d(TAG, "tryReadMemoryBankDirect: bank=" + memBank + ", addr=" + startAddr + ", words=" + wordCount + ", epc=" + epc);
        
        try {
            // First try: Read with no filter (matching demo: read(pwd, bank, addr, count, null))
            UHFReaderResult<String> result = uhfReader.read(
                DEFAULT_PASSWORD, 
                memBank, 
                startAddr, 
                wordCount, 
                null  // No filter - read any tag in range
            );
            
            if (result != null) {
                Log.d(TAG, "Read result code: " + result.getResultCode() + ", message: " + result.getMessage());
                
                if (result.getResultCode() == UHFReaderResult.ResultCode.CODE_SUCCESS) {
                    String data = result.getData();
                    if (data != null && !data.isEmpty() && !data.matches("^0+$")) {
                        Log.d(TAG, "Read success (no filter): " + data);
                        return data.toUpperCase();
                    }
                }
            }
            
            // Second try: If we have EPC, try with SelectEntity filter for specific tag
            if (epc != null && !epc.isEmpty()) {
                Log.d(TAG, "Trying filtered read with EPC: " + epc);
                
                SelectEntity filter = new SelectEntity();
                filter.setOption(4);  // 4=EPC filter (from demo)
                filter.setAddress(32);  // EPC starts at bit 32 (word 2)
                filter.setLength(epc.length() * 4);  // bits = hex chars * 4
                filter.setData(epc);
                
                result = uhfReader.read(
                    DEFAULT_PASSWORD, 
                    memBank, 
                    startAddr, 
                    wordCount, 
                    filter
                );
                
                if (result != null) {
                    Log.d(TAG, "Filtered read result code: " + result.getResultCode() + ", message: " + result.getMessage());
                    
                    if (result.getResultCode() == UHFReaderResult.ResultCode.CODE_SUCCESS) {
                        String data = result.getData();
                        if (data != null && !data.isEmpty() && !data.matches("^0+$")) {
                            Log.d(TAG, "Filtered read success: " + data);
                            return data.toUpperCase();
                        }
                    }
                }
            }
            
        } catch (Exception e) {
            Log.e(TAG, "Read error for bank " + memBank + ": " + e.getMessage(), e);
        }
        
        Log.w(TAG, "Read failed for bank " + memBank);
        return "";
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
