

## GitHub Actions - Automatic Android APK Build

### What This Gives You

A fully automated build system where:
1. You push code to GitHub → APK is automatically built in the cloud
2. No Android Studio required on your computer
3. Download the ready-to-install APK directly from GitHub
4. Works every time you push changes

---

### How It Works

```text
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│    Lovable      │     │     GitHub      │     │  Your CX1500N   │
│  (Edit Code)    │────▶│ (Auto-Build APK)│────▶│  (Install APK)  │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │                       │
   Export/Push            5 min build           Download & Install
```

---

### What I'll Create

**1. GitHub Actions Workflow File**
   - `.github/workflows/android-build.yml`
   - Triggers on every push to main branch
   - Sets up Java 17 and Android SDK automatically
   - Builds the web app, syncs to Android, compiles APK
   - Uploads the APK as a downloadable "artifact"

**2. Production Capacitor Config**
   - Modified config that works offline (no hot-reload dependency)
   - Ensures the APK works standalone on your device

**3. Gradle Build Files**
   - `android/build.gradle` - Project-level configuration
   - `android/app/build.gradle` - App configuration with SDK support
   - `android/settings.gradle` - Project settings
   - `android/gradle.properties` - Build properties
   - `android/local.properties` - SDK location template

**4. Android Manifest**
   - Required permissions for RFID operations
   - App configuration for the CX1500N device

---

### After Setup: Your Simple Steps

**Step 1: Export to GitHub**
- Click the GitHub button in Lovable
- Export to a new repository

**Step 2: Add Your SDK Files**
Upload these files to GitHub (via the web interface):
- Your Mivanta `.jar` file → `android/app/libs/` folder
- Your `.so` files → `android/app/src/main/jniLibs/arm64-v8a/` folder

**Step 3: Wait ~5 Minutes**
GitHub will automatically build your APK

**Step 4: Download APK**
- Go to your GitHub repository
- Click "Actions" tab
- Click the latest workflow run
- Download "app-debug.apk" from Artifacts section

**Step 5: Install on Device**
- Transfer APK to your CX1500N (USB or file transfer)
- Open and install (enable "Install from unknown sources" if prompted)

---

### Files to Be Created

| File | Purpose |
|------|---------|
| `.github/workflows/android-build.yml` | Main build automation script |
| `android/build.gradle` | Project Gradle configuration |
| `android/app/build.gradle` | App dependencies & SDK setup |
| `android/settings.gradle` | Project module settings |
| `android/gradle.properties` | JVM and build settings |
| `android/local.properties` | SDK location (template) |
| `android/app/src/main/AndroidManifest.xml` | App permissions & config |
| `android/gradle/wrapper/gradle-wrapper.properties` | Gradle version |

---

### Technical Details

**Build Environment (GitHub-hosted runner):**
- Ubuntu latest
- Java 17 (Temurin distribution)
- Android SDK with build-tools 34
- Node.js 18 for web build

**Build Steps:**
1. Checkout code
2. Set up Java 17
3. Set up Android SDK
4. Install npm dependencies
5. Build web app (`npm run build`)
6. Sync to Android (`npx cap sync android`)
7. Build APK with Gradle (`./gradlew assembleDebug`)
8. Upload APK as artifact

**SDK Integration Ready:**
- The `build.gradle` will include `implementation fileTree(dir: 'libs', include: ['*.jar'])`
- Native `.so` files are automatically included from `jniLibs/`
- You just need to upload your vendor files to the right folders

