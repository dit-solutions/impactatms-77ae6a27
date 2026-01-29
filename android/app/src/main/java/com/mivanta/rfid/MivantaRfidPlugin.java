package com.mivanta.rfid;

import android.util.Log;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

// Real Mivanta SDK imports (package: com.xlzn.hcpda.uhf)
import com.xlzn.hcpda.uhf.UHFReader;
import com.xlzn.hcpda.uhf.interfaces.OnInventoryDataListener;
import com.xlzn.hcpda.uhf.entity.UHFTagEntity;

/**
 * Mivanta RFID Plugin for Capacitor
 * Bridges the web app to the native Mivanta UHF RFID hardware SDK
 */
@CapacitorPlugin(name = "MivantaRfid")
public class MivantaRfidPlugin extends Plugin {

    private static final String TAG = "MivantaRfidPlugin";
    
    private UHFReader uhfReader;
    private boolean isConnected = false;
    private boolean isScanning = false;
    private int currentPower = 30; // Default power level (dBm)

    @Override
    public void load() {
        super.load();
        Log.d(TAG, "MivantaRfidPlugin loaded - initializing UHF Reader");
        try {
            uhfReader = UHFReader.getInstance();
            Log.d(TAG, "UHFReader instance obtained successfully");
        } catch (Exception e) {
            Log.e(TAG, "Failed to get UHFReader instance: " + e.getMessage());
        }
    }

    /**
     * Connect to the UHF RFID module
     */
    @PluginMethod
    public void connect(PluginCall call) {
        try {
            if (uhfReader == null) {
                uhfReader = UHFReader.getInstance();
            }
            
            // Connect to serial port - Mivanta CX1500N uses /dev/ttyS4 at 115200 baud
            boolean success = uhfReader.connect("/dev/ttyS4", 115200);
            
            if (success) {
                isConnected = true;
                uhfReader.setPower(currentPower);
                
                JSObject result = new JSObject();
                result.put("connected", true);
                result.put("message", "UHF Reader connected successfully");
                call.resolve(result);
                
                Log.d(TAG, "UHF Reader connected to /dev/ttyS4");
            } else {
                Log.e(TAG, "Failed to connect to UHF Reader");
                call.reject("Failed to connect to UHF Reader");
            }
        } catch (Exception e) {
            Log.e(TAG, "Connection error: " + e.getMessage(), e);
            call.reject("Connection error: " + e.getMessage());
        }
    }

    /**
     * Disconnect from the UHF RFID module
     */
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
            
            JSObject result = new JSObject();
            result.put("connected", false);
            result.put("message", "UHF Reader disconnected");
            call.resolve(result);
            
            Log.d(TAG, "UHF Reader disconnected");
        } catch (Exception e) {
            Log.e(TAG, "Disconnect error: " + e.getMessage(), e);
            call.reject("Disconnect error: " + e.getMessage());
        }
    }

    /**
     * Perform a single tag read
     */
    @PluginMethod
    public void readSingle(PluginCall call) {
        if (!isConnected) {
            call.reject("Reader not connected");
            return;
        }

        try {
            // Perform single tag inventory
            String epc = uhfReader.singleTagInventory();
            
            if (epc != null && !epc.isEmpty()) {
                JSObject result = new JSObject();
                result.put("success", true);
                result.put("epc", epc);
                result.put("timestamp", System.currentTimeMillis());
                call.resolve(result);
                
                Log.d(TAG, "Single read: " + epc);
            } else {
                JSObject result = new JSObject();
                result.put("success", false);
                result.put("epc", "");
                result.put("timestamp", System.currentTimeMillis());
                call.resolve(result);
                
                Log.d(TAG, "Single read: No tag detected");
            }
        } catch (Exception e) {
            Log.e(TAG, "Single read error: " + e.getMessage(), e);
            call.reject("Read error: " + e.getMessage());
        }
    }

    /**
     * Start continuous inventory scanning
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
            // Set up the inventory data listener
            uhfReader.setOnInventoryDataListener(new OnInventoryDataListener() {
                @Override
                public void onInventoryData(UHFTagEntity tag) {
                    if (tag != null) {
                        JSObject tagData = new JSObject();
                        tagData.put("epc", tag.getEpc());
                        tagData.put("rssi", tag.getRssi());
                        tagData.put("count", tag.getCount());
                        tagData.put("timestamp", System.currentTimeMillis());
                        
                        notifyListeners("tagDetected", tagData);
                        Log.d(TAG, "Tag detected: " + tag.getEpc());
                    }
                }
            });
            
            // Start inventory
            boolean started = uhfReader.startInventory();
            
            if (started) {
                isScanning = true;
                
                JSObject result = new JSObject();
                result.put("scanning", true);
                result.put("message", "Continuous scanning started");
                call.resolve(result);
                
                Log.d(TAG, "Continuous scanning started");
            } else {
                call.reject("Failed to start scanning");
            }
        } catch (Exception e) {
            Log.e(TAG, "Start continuous error: " + e.getMessage(), e);
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
            if (uhfReader != null) {
                uhfReader.stopInventory();
            }
            isScanning = false;
            
            JSObject result = new JSObject();
            result.put("scanning", false);
            result.put("message", "Scanning stopped");
            call.resolve(result);
            
            Log.d(TAG, "Continuous scanning stopped");
        } catch (Exception e) {
            Log.e(TAG, "Stop continuous error: " + e.getMessage(), e);
            call.reject("Stop error: " + e.getMessage());
        }
    }

    /**
     * Set the reader power level
     */
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
                uhfReader.setPower(power);
            }
            currentPower = power;
            
            JSObject result = new JSObject();
            result.put("power", power);
            result.put("message", "Power set to " + power + " dBm");
            call.resolve(result);
            
            Log.d(TAG, "Power set to: " + power);
        } catch (Exception e) {
            Log.e(TAG, "Set power error: " + e.getMessage(), e);
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
