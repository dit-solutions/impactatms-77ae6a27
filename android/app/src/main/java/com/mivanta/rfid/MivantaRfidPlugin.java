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
    private int currentPower = 30;

    private boolean sdkAvailable = false;

    @Override
    public void load() {
        super.load();
        Log.d(TAG, "MivantaRfidPlugin loaded - attempting to initialize UHF Reader");
        try {
            uhfReader = UHFReader.getInstance();
            if (uhfReader != null) {
                sdkAvailable = true;
                Log.d(TAG, "UHFReader instance obtained successfully");
            } else {
                Log.w(TAG, "UHFReader.getInstance() returned null");
            }
        } catch (UnsatisfiedLinkError e) {
            // Native .so library failed to load
            Log.e(TAG, "Native library load failed: " + e.getMessage(), e);
            sdkAvailable = false;
        } catch (Throwable t) {
            Log.e(TAG, "Failed to get UHFReader instance: " + t.getMessage(), t);
            sdkAvailable = false;
        }
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
            
            Log.d(TAG, "Calling uhfReader.connect(context)...");
            // Connect using Android Context
            UHFReaderResult<Boolean> result = uhfReader.connect(getContext());

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
