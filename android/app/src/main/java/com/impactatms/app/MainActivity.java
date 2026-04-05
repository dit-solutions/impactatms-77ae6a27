package com.impactatms.app;

import android.os.Bundle;
import androidx.core.splashscreen.SplashScreen;
import com.getcapacitor.BridgeActivity;
import com.mivanta.rfid.MivantaRfidPlugin;

public class MainActivity extends BridgeActivity {
    
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
        super.onCreate(savedInstanceState);
    }
    
    @SuppressWarnings("deprecation")
    @Override
    public void onBackPressed() {
        // Don't call super — prevents exiting the app
        // Trigger the Capacitor backButton JS event for in-app navigation
        getBridge().triggerJSEvent("backButton", "document");
    }
}
