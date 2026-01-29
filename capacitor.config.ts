import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.f68cb15949ce434d93731abbed2b0512',
  appName: 'Toll RFID Scanner',
  webDir: 'dist',
  server: {
    url: 'https://f68cb159-49ce-434d-9373-1abbed2b0512.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    MivantaRfid: {
      // Plugin will be loaded from android/app/src/main/java
    }
  },
  android: {
    // Enable mixed content for development
    allowMixedContent: true,
    // Keep screen on during scanning operations
    keepScreenOn: true
  }
};

export default config;

