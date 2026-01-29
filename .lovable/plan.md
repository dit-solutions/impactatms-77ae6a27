
# Fix App Icon and Splash Screen

## Issues Identified

### Issue 1: App Icon Shows Default Android Icon

The adaptive icon XML files have an incorrect configuration:

**Current (Broken):**
```xml
<!-- ic_launcher.xml -->
<adaptive-icon>
    <background android:drawable="@color/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher"/>  <!-- WRONG: Self-reference! -->
</adaptive-icon>
```

The foreground is referencing `@mipmap/ic_launcher` which creates a circular reference - the icon file points to itself. On Android 8+ (API 26+), adaptive icons require:
- A **background** (color or image)
- A **foreground** (the actual icon image, typically with transparency)

The foreground should reference `@drawable/ic_launcher_foreground` (which exists in the drawable folder).

### Issue 2: Splash Screen Not Showing Logo

The Activity theme in `AndroidManifest.xml` uses `AppTheme.NoActionBar` but the splash theme `AppTheme.Splash` is never applied:

```xml
<!-- Current: Uses AppTheme.NoActionBar - no splash configuration -->
<activity android:theme="@style/AppTheme.NoActionBar">
```

The `SplashScreen.installSplashScreen()` in MainActivity requires the activity to start with the splash theme.

---

## Solution

### Step 1: Fix Adaptive Icon XMLs

**File: `android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml`**
```xml
<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background"/>
    <foreground android:drawable="@drawable/ic_launcher_foreground"/>
</adaptive-icon>
```

**File: `android/app/src/main/res/mipmap-anydpi-v26/ic_launcher_round.xml`**
```xml
<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background"/>
    <foreground android:drawable="@drawable/ic_launcher_foreground"/>
</adaptive-icon>
```

### Step 2: Apply Splash Theme to Activity

**File: `android/app/src/main/AndroidManifest.xml`**

Change the activity theme from `AppTheme.NoActionBar` to `AppTheme.Splash`:

```xml
<activity
    android:name=".MainActivity"
    android:exported="true"
    android:launchMode="singleTask"
    android:configChanges="orientation|keyboardHidden|keyboard|screenSize|locale|smallestScreenSize|screenLayout|uiMode"
    android:screenOrientation="portrait"
    android:theme="@style/AppTheme.Splash">
```

The `postSplashScreenTheme` in `styles.xml` is already configured to transition to `AppTheme.NoActionBar` after the splash.

---

## Files to Modify

| File | Change |
|------|--------|
| `android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml` | Fix foreground to `@drawable/ic_launcher_foreground` |
| `android/app/src/main/res/mipmap-anydpi-v26/ic_launcher_round.xml` | Fix foreground to `@drawable/ic_launcher_foreground` |
| `android/app/src/main/AndroidManifest.xml` | Change activity theme to `@style/AppTheme.Splash` |

---

## Expected Result

After these changes:
1. **App Icon**: Shows your Impact ATMS logo on the dark slate (#464660) background
2. **Splash Screen**: Displays `splash_logo.png` centered on the #464660 background for 1 second before transitioning to the app

---

## Testing Steps

1. Pull the changes to your local project
2. Run `npx cap sync android`
3. Build and install the APK
4. Verify the app icon in the launcher shows Impact ATMS logo
5. Launch the app and confirm the splash screen appears with your logo
