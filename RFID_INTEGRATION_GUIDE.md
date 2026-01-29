# Mivanta CX1500N RFID Integration Guide

This guide walks you through deploying the RFID-enabled toll automation app to your Mivanta CX1500N handheld device.

## Prerequisites

- Android Studio (latest version)
- Git installed
- The Mivanta SDK files you received from the vendor:
  - `CX1500N_Jar_file.zip` (contains the JAR library)
  - Any `.so` native library files

## Step 1: Export to GitHub

1. In Lovable, click the **GitHub** button in the top-right
2. Click **Export to GitHub**
3. Create a new repository or select an existing one
4. Wait for the export to complete

## Step 2: Clone and Open in Android Studio

```bash
# Clone your repository
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git
cd YOUR_REPO

# Install dependencies
npm install

# Add Android platform
npx cap add android

# Build the web app
npm run build

# Sync to Android
npx cap sync android
```

## Step 3: Add Mivanta SDK Files

### 3.1 Add the JAR Library

1. Extract `CX1500N_Jar_file.zip`
2. Copy the `.jar` file(s) to:
   ```
   android/app/libs/
   ```
   (Create the `libs` folder if it doesn't exist)

3. Open `android/app/build.gradle` and add:
   ```gradle
   dependencies {
       implementation fileTree(dir: 'libs', include: ['*.jar'])
       // ... other dependencies
   }
   ```

### 3.2 Add Native Libraries (.so files)

If the SDK includes native `.so` files:

1. Create the jniLibs directory structure:
   ```
   android/app/src/main/jniLibs/
   ├── arm64-v8a/
   │   └── libmivanta_uhf.so
   ├── armeabi-v7a/
   │   └── libmivanta_uhf.so
   ```

2. Copy the `.so` files from the SDK to the appropriate architecture folder

## Step 4: Enable the Real SDK in the Plugin

Open `android/app/src/main/java/com/mivanta/rfid/MivantaRfidPlugin.java`

1. **Uncomment the SDK imports** at the top:
   ```java
   import com.mivanta.uhf.UHFReader;
   import com.mivanta.uhf.listener.OnInventoryDataListener;
   import com.mivanta.uhf.bean.InventoryData;
   ```

2. **Uncomment the UHFReader instance**:
   ```java
   private UHFReader uhfReader;
   ```

3. **Uncomment SDK calls** in each method (search for "Uncomment after adding SDK")

4. **Remove or comment out** the mock/placeholder code

## Step 5: Configure Serial Port (if needed)

The CX1500N typically uses a specific serial port. In the `connect()` method:

```java
// Adjust these values based on your device documentation
boolean success = uhfReader.connect("/dev/ttyS4", 115200);
```

Check your Mivanta documentation for the correct port and baud rate.

## Step 6: Build and Deploy

### Open in Android Studio

```bash
npx cap open android
```

### Build the APK

1. In Android Studio: **Build → Build Bundle(s) / APK(s) → Build APK(s)**
2. The APK will be in `android/app/build/outputs/apk/debug/`

### Install on Device

**Option A: Via USB**
```bash
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

**Option B: Transfer APK file**
Copy the APK to the device and install manually

## Step 7: Test on Device

1. Launch the app on your CX1500N
2. Tap **Connect Reader**
3. Try **Single Read** mode first
4. Test **Continuous Scan** mode
5. Adjust power level if needed for your environment

## Troubleshooting

### "Reader not connecting"
- Check serial port path in `connect()` method
- Ensure SDK `.so` files are in correct architecture folder
- Check Android permissions in `AndroidManifest.xml`

### "No tags detected"
- Increase power level using the slider
- Ensure RFID tags are compatible (UHF Gen2)
- Check if the tag is within range

### Build errors
- Verify JAR file is in `android/app/libs/`
- Check that `build.gradle` includes the fileTree dependency
- Sync Gradle files in Android Studio

## Development Tips

### Hot Reload (Development Mode)

The app is configured to connect to the Lovable preview URL for hot reloading. When developing:

1. Make changes in Lovable
2. The app on your device will automatically update

To switch to production (offline) mode:

1. Open `capacitor.config.ts`
2. Remove or comment out the `server` section
3. Rebuild and redeploy

### Modifying the Web App

After making changes in Lovable:

```bash
git pull
npm run build
npx cap sync android
```

Then rebuild the APK in Android Studio.

## Integration with Your Toll API

In `src/pages/Index.tsx`, the `handleTagDetected` callback receives tag data:

```typescript
const handleTagDetected = (tag: RfidTagData) => {
  // Send to your toll automation API
  fetch('https://your-api.com/vehicle/identify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      epc: tag.epc,
      timestamp: tag.timestamp,
      rssi: tag.rssi
    })
  });
};
```

## File Structure Reference

```
project/
├── capacitor.config.ts          # Capacitor configuration
├── src/
│   ├── services/rfid/           # RFID service layer
│   │   ├── mivanta-rfid-plugin.ts  # Plugin interface
│   │   ├── rfid-service.ts         # High-level service
│   │   └── rfid-web-mock.ts        # Web mock for testing
│   ├── components/rfid/         # UI components
│   │   ├── RfidReaderPanel.tsx     # Main control panel
│   │   ├── RfidModeSwitch.tsx      # Mode toggle
│   │   └── ...
│   └── hooks/
│       └── use-rfid-reader.ts   # React hook
└── android/
    └── app/
        ├── libs/                # Mivanta JAR files
        ├── src/main/
        │   ├── jniLibs/         # Native .so files
        │   └── java/com/mivanta/rfid/
        │       └── MivantaRfidPlugin.java
        └── build.gradle
```

## Support

For SDK-specific issues, contact Mivanta support with your device model (CX1500N) and SDK version.
