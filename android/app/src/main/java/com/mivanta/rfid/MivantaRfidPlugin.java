package com.mivanta.rfid;

import android.util.Log;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

// Mivanta SDK imports - these will resolve after SDK is added to libs/
// import com.mivanta.uhf.UHFReader;
// import com.mivanta.uhf.listener.OnInventoryDataListener;
// import com.mivanta.uhf.bean.InventoryData;

@CapacitorPlugin(name = "MivantaRfid")
public class MivantaRfidPlugin extends Plugin {

    private static final String TAG = "MivantaRfidPlugin";
    
    // Uncomment after adding SDK to libs/
    // private UHFReader uhfReader;
    private boolean isConnected = false;
    private boolean isScanning = false;
    private int currentPower = 30; // Default power level (dBm)

    @Override
    public void load() {
        super.load();
        Log.d(TAG, "MivantaRfidPlugin loaded");
        // Initialize reader instance
        // uhfReader = UHFReader.getInstance();
    }

    /**
     * Connect to the UHF RFID module
     * Called when app starts or user manually connects
     */
    @PluginMethod
    public void connect(PluginCall call) {
        try {
            // Uncomment after adding SDK:
            // boolean success = uhfReader.connect("/dev/ttyS4", 115200);
            boolean success = true; // Placeholder for development
            
            if (success) {
                isConnected = true;
                // Set initial power level
                // uhfReader.setPower(currentPower);
                
                JSObject result = new JSObject();
                result.put("connected", true);
                result.put("message", "UHF Reader connected successfully");
                call.resolve(result);
                
                Log.d(TAG, "UHF Reader connected");
            } else {
                call.reject("Failed to connect to UHF Reader");
            }
        } catch (Exception e) {
            Log.e(TAG, "Connection error: " + e.getMessage());
            call.reject("Connection error: " + e.getMessage());
        }
    }

    /**
     * Disconnect from the UHF RFID module
     * Important: Call this when app closes to prevent battery drain
     */
    @PluginMethod
    public void disconnect(PluginCall call) {
        try {
            if (isScanning) {
                // uhfReader.stopInventory();
                isScanning = false;
            }
            
            // uhfReader.disConnect();
            isConnected = false;
            
            JSObject result = new JSObject();
            result.put("connected", false);
            result.put("message", "UHF Reader disconnected");
            call.resolve(result);
            
            Log.d(TAG, "UHF Reader disconnected");
        } catch (Exception e) {
            Log.e(TAG, "Disconnect error: " + e.getMessage());
            call.reject("Disconnect error: " + e.getMessage());
        }
    }

    /**
     * Perform a single tag read
     * Returns immediately with one tag (or error if none found)
     */
    @PluginMethod
    public void readSingle(PluginCall call) {
        if (!isConnected) {
            call.reject("Reader not connected");
            return;
        }

        try {
            // Uncomment after adding SDK:
            // String epc = uhfReader.singleTagInventory();
            String epc = "MOCK_EPC_" + System.currentTimeMillis(); // Placeholder
            
            if (epc != null && !epc.isEmpty()) {
                JSObject result = new JSObject();
                result.put("success", true);
                result.put("epc", epc);
                result.put("timestamp", System.currentTimeMillis());
                call.resolve(result);
                
                Log.d(TAG, "Single read: " + epc);
            } else {
                call.reject("No tag detected");
            }
        } catch (Exception e) {
            Log.e(TAG, "Single read error: " + e.getMessage());
            call.reject("Read error: " + e.getMessage());
        }
    }

    /**
     * Start continuous inventory scanning
     * Tags are emitted via 'tagDetected' event
     */
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
            // Uncomment after adding SDK:
            /*
            uhfReader.setOnInventoryDataListener(new OnInventoryDataListener() {
                @Override
                public void onInventoryData(InventoryData data) {
                    JSObject tagData = new JSObject();
                    tagData.put("epc", data.getEpc());
                    tagData.put("rssi", data.getRssi());
                    tagData.put("count", data.getCount());
                    tagData.put("timestamp", System.currentTimeMillis());
                    
                    notifyListeners("tagDetected", tagData);
                }
            });
            
            boolean started = uhfReader.startInventory();
            */
            boolean started = true; // Placeholder
            
            if (started) {
                isScanning = true;
                
                JSObject result = new JSObject();
                result.put("scanning", true);
                result.put("message", "Continuous scanning started");
                call.resolve(result);
                
                Log.d(TAG, "Continuous scanning started");
                
                // For development: simulate tag reads
                simulateTagReads();
            } else {
                call.reject("Failed to start scanning");
            }
        } catch (Exception e) {
            Log.e(TAG, "Start continuous error: " + e.getMessage());
            call.reject("Start error: " + e.getMessage());
        }
    }

    /**
     * Stop continuous inventory scanning
     */
    @PluginMethod
    public void stopContinuous(PluginCall call) {
        if (!isScanning) {
            JSObject result = new JSObject();
            result.put("scanning", false);
            result.put("message", "Not currently scanning");
            call.resolve(result);
            return;
        }

        try {
            // uhfReader.stopInventory();
            isScanning = false;
            
            JSObject result = new JSObject();
            result.put("scanning", false);
            result.put("message", "Scanning stopped");
            call.resolve(result);
            
            Log.d(TAG, "Continuous scanning stopped");
        } catch (Exception e) {
            Log.e(TAG, "Stop continuous error: " + e.getMessage());
            call.reject("Stop error: " + e.getMessage());
        }
    }

    /**
     * Set the reader power level (affects read range)
     * @param power Power level in dBm (typically 5-30)
     */
    @PluginMethod
    public void setPower(PluginCall call) {
        if (!isConnected) {
            call.reject("Reader not connected");
            return;
        }

        int power = call.getInt("power", 30);
        
        // Validate power range
        if (power < 5 || power > 33) {
            call.reject("Power must be between 5 and 33 dBm");
            return;
        }

        try {
            // uhfReader.setPower(power);
            currentPower = power;
            
            JSObject result = new JSObject();
            result.put("power", power);
            result.put("message", "Power set to " + power + " dBm");
            call.resolve(result);
            
            Log.d(TAG, "Power set to: " + power);
        } catch (Exception e) {
            Log.e(TAG, "Set power error: " + e.getMessage());
            call.reject("Set power error: " + e.getMessage());
        }
    }

    /**
     * Get current connection and scanning status
     */
    @PluginMethod
    public void getStatus(PluginCall call) {
        JSObject result = new JSObject();
        result.put("connected", isConnected);
        result.put("scanning", isScanning);
        result.put("power", currentPower);
        call.resolve(result);
    }

    /**
     * Development helper: simulate tag reads for testing without hardware
     */
    private void simulateTagReads() {
        new Thread(() -> {
            String[] mockEpcs = {
                "E200001234567890ABCD",
                "E200009876543210EFGH",
                "E200005555666677778888"
            };
            int index = 0;
            
            while (isScanning) {
                try {
                    Thread.sleep(2000); // Simulate tag every 2 seconds
                    
                    if (isScanning) {
                        JSObject tagData = new JSObject();
                        tagData.put("epc", mockEpcs[index % mockEpcs.length]);
                        tagData.put("rssi", -45 + (int)(Math.random() * 20));
                        tagData.put("count", 1);
                        tagData.put("timestamp", System.currentTimeMillis());
                        
                        notifyListeners("tagDetected", tagData);
                        index++;
                    }
                } catch (InterruptedException e) {
                    break;
                }
            }
        }).start();
    }

    @Override
    protected void handleOnDestroy() {
        // Clean up when plugin is destroyed
        if (isScanning) {
            isScanning = false;
            // uhfReader.stopInventory();
        }
        if (isConnected) {
            // uhfReader.disConnect();
            isConnected = false;
        }
        super.handleOnDestroy();
    }
}
