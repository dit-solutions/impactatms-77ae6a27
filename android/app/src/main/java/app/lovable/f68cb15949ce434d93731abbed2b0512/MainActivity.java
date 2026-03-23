package app.lovable.f68cb15949ce434d93731abbed2b0512;

import android.os.Bundle;
import android.view.KeyEvent;
import androidx.core.splashscreen.SplashScreen;
import com.getcapacitor.BridgeActivity;
import com.mivanta.rfid.MivantaRfidPlugin;

public class MainActivity extends BridgeActivity {
    
    private MivantaRfidPlugin rfidPlugin;
    
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
    
    @Override
    public void onResume() {
        super.onResume();
        try {
            rfidPlugin = (MivantaRfidPlugin) getBridge().getPlugin("MivantaRfid").getInstance();
        } catch (Exception e) {
            // Plugin may not be ready yet
        }
    }
    
    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        // Only track keycode for debug info — no bridge calls
        if (rfidPlugin != null) {
            rfidPlugin.handleKeyDown(keyCode, event);
        }
        return super.onKeyDown(keyCode, event);
    }
}
