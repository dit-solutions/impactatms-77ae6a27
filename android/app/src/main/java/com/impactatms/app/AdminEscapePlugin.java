package com.impactatms.app;

import android.app.Activity;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "AdminEscape")
public class AdminEscapePlugin extends Plugin {

    @PluginMethod
    public void exitKiosk(PluginCall call) {
        Activity activity = getActivity();
        if (activity != null) {
            activity.runOnUiThread(() -> {
                try {
                    activity.stopLockTask();
                    call.resolve();
                } catch (Exception e) {
                    call.reject("Failed to exit kiosk mode: " + e.getMessage());
                }
            });
        } else {
            call.reject("Activity not available");
        }
    }
}
