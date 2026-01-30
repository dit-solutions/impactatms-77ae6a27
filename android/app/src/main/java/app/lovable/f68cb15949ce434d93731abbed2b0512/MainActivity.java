package app.lovable.f68cb15949ce434d93731abbed2b0512;

import android.os.Bundle;
import android.view.KeyEvent;
import android.view.animation.Animation;
import android.view.animation.AnimationUtils;
import androidx.core.splashscreen.SplashScreen;
import com.getcapacitor.BridgeActivity;
import com.mivanta.rfid.MivantaRfidPlugin;

public class MainActivity extends BridgeActivity {
    
    private MivantaRfidPlugin rfidPlugin;
    
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Install splash screen with animation before calling super
        SplashScreen splashScreen = SplashScreen.installSplashScreen(this);
        
        // Set a custom exit animation - slide down + fade out (complements slide up entrance)
        splashScreen.setOnExitAnimationListener(splashScreenView -> {
            splashScreenView.getIconView().animate()
                .alpha(0f)
                .translationY(50f)
                .setDuration(300)
                .withEndAction(splashScreenView::remove)
                .start();
        });
        
        // Register the custom RFID plugin
        registerPlugin(MivantaRfidPlugin.class);
        super.onCreate(savedInstanceState);
    }
    
    @Override
    public void onResume() {
        super.onResume();
        // Get reference to the RFID plugin for key handling
        try {
            rfidPlugin = (MivantaRfidPlugin) getBridge().getPlugin("MivantaRfid").getInstance();
        } catch (Exception e) {
            // Plugin may not be ready yet
        }
    }
    
    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        if (rfidPlugin != null && rfidPlugin.handleKeyDown(keyCode, event)) {
            return true;
        }
        return super.onKeyDown(keyCode, event);
    }
    
    @Override
    public boolean onKeyUp(int keyCode, KeyEvent event) {
        if (rfidPlugin != null && rfidPlugin.handleKeyUp(keyCode, event)) {
            return true;
        }
        return super.onKeyUp(keyCode, event);
    }
}
