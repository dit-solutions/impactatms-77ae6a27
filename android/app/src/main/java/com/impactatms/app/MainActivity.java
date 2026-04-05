package com.impactatms.app;

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.view.View;
import android.view.WindowManager;
import androidx.annotation.NonNull;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.core.splashscreen.SplashScreen;
import com.getcapacitor.BridgeActivity;
import com.mivanta.rfid.MivantaRfidPlugin;

public class MainActivity extends BridgeActivity {
    
    private static final int CAMERA_PERMISSION_REQUEST = 1001;
    
    @Override
    public void onCreate(Bundle savedInstanceState) {
        SplashScreen splashScreen = SplashScreen.installSplashScreen(this);
        
        splashScreen.setOnExitAnimationListener(splashScreenView -> {
            splashScreenView.getIconView().animate()
                .alpha(0f)
                .translationY(50f)
                .setDuration(300)
                .withEndAction(splashScreenView::remove)
                .start();
        });
        
        registerPlugin(MivantaRfidPlugin.class);
        registerPlugin(AdminEscapePlugin.class);
        super.onCreate(savedInstanceState);
        
        // Keep screen always on
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        
        // Apply immersive sticky mode
        applyImmersiveMode();
        
        // Request camera permission BEFORE entering lock task mode
        // Lock task suppresses system dialogs, so permission must be granted first
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA)
                != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this,
                    new String[]{Manifest.permission.CAMERA}, CAMERA_PERMISSION_REQUEST);
        } else {
            startLockTask();
        }
    }
    
    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions, @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == CAMERA_PERMISSION_REQUEST) {
            // Enter kiosk mode after permission dialog is dismissed (granted or denied)
            startLockTask();
        }
    }
    
    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            applyImmersiveMode();
        }
    }
    
    @SuppressWarnings("deprecation")
    private void applyImmersiveMode() {
        getWindow().getDecorView().setSystemUiVisibility(
            View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
            | View.SYSTEM_UI_FLAG_FULLSCREEN
            | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
            | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
            | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
            | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
        );
    }
    
    @SuppressWarnings("deprecation")
    @Override
    public void onBackPressed() {
        // Don't call super — prevents exiting the app
        // Trigger the Capacitor backButton JS event for in-app navigation
        getBridge().triggerJSEvent("backButton", "document");
    }
}
