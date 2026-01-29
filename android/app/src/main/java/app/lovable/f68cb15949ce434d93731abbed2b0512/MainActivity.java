package app.lovable.f68cb15949ce434d93731abbed2b0512;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.mivanta.rfid.MivantaRfidPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Register the custom RFID plugin
        registerPlugin(MivantaRfidPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
