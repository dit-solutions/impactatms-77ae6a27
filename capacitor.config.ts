import type { CapacitorConfig } from '@capacitor/cli';

// Production config - uses bundled web assets (no hot-reload)
// For development with hot-reload, uncomment the server.url line
const config: CapacitorConfig = {
  appId: 'app.lovable.f68cb15949ce434d93731abbed2b0512',
  appName: 'Toll RFID Scanner',
  webDir: 'dist',
  // Uncomment for development hot-reload:
  // server: {
  //   url: 'https://f68cb159-49ce-434d-9373-1abbed2b0512.lovableproject.com?forceHideBadge=true',
  //   cleartext: true
  // },
  plugins: {
    MivantaRfid: {
      // Plugin will be loaded from android/app/src/main/java
    }
  },
  android: {
    allowMixedContent: true,
    keepScreenOn: true
  }
};

export default config;

