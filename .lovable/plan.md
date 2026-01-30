

# Fix App Icon and Splash Screen with Exact Logos

## Summary

Use your exact uploaded logo files with proper backgrounds:
- **App Icon**: K swoosh on **white background**
- **Splash Screen**: Full IMPACT TMS logo on **dark slate background** (#464660)

---

## Assets to Use (Exact Files - No Modifications)

| Asset | Source File | Destination |
|-------|-------------|-------------|
| App Icon Foreground | `Impact_TMS_Logo_Design-11.png` (K swoosh) | `android/app/src/main/res/drawable/ic_launcher_foreground.png` |
| Splash Logo | `Impact_TMS_Logo_Design-15.png` (Full logo) | `android/app/src/main/res/drawable/splash_logo.png` |

---

## Configuration Changes

### Step 1: Change App Icon Background to White

**File**: `android/app/src/main/res/values/colors.xml`

```xml
<!-- Change from dark slate to white -->
<color name="ic_launcher_background">#FFFFFF</color>

<!-- Keep splash screen dark slate -->
<color name="splash_background">#464660</color>
```

### Step 2: Copy Your Exact Logo Files

1. Copy `Impact_TMS_Logo_Design-11.png` (K swoosh) to:
   - `android/app/src/main/res/drawable/ic_launcher_foreground.png`

2. Copy `Impact_TMS_Logo_Design-15.png` (Full IMPACT TMS) to:
   - `android/app/src/main/res/drawable/splash_logo.png`

### Step 3: Adjust Splash Logo Dimensions

**File**: `android/app/src/main/res/drawable/splash.xml`

Update the size to fit the text logo's wider aspect ratio:

```xml
<?xml version="1.0" encoding="utf-8"?>
<layer-list xmlns:android="http://schemas.android.com/apk/res/android">
    <item android:drawable="@color/splash_background"/>
    <item
        android:gravity="center"
        android:drawable="@drawable/splash_logo"
        android:width="280dp"
        android:height="120dp"/>
</layer-list>
```

### Step 4: Fix Splash Theme Gray Box Issue

**File**: `android/app/src/main/res/values/styles.xml`

Add icon background color to prevent the gray box:

```xml
<style name="AppTheme.Splash" parent="Theme.SplashScreen">
    <item name="windowSplashScreenBackground">@color/splash_background</item>
    <item name="windowSplashScreenAnimatedIcon">@drawable/splash_logo</item>
    <item name="windowSplashScreenIconBackgroundColor">@color/splash_background</item>
    <item name="windowSplashScreenAnimationDuration">1000</item>
    <item name="postSplashScreenTheme">@style/AppTheme.NoActionBar</item>
</style>
```

---

## Files to Modify

| File | Change |
|------|--------|
| `android/app/src/main/res/values/colors.xml` | Change `ic_launcher_background` from #464660 to #FFFFFF |
| `android/app/src/main/res/drawable/ic_launcher_foreground.png` | Replace with your K swoosh logo (exact file) |
| `android/app/src/main/res/drawable/splash_logo.png` | Replace with your full IMPACT TMS logo (exact file) |
| `android/app/src/main/res/drawable/splash.xml` | Adjust dimensions to 280dp x 120dp for text logo |
| `android/app/src/main/res/values/styles.xml` | Add `windowSplashScreenIconBackgroundColor` |

---

## Expected Result

| Element | Appearance |
|---------|------------|
| **App Icon** | K swoosh (your exact logo) on **white background** |
| **Splash Screen** | Full "IMPACT TMS" logo (your exact logo) centered on **dark slate (#464660) background**, no gray box |

---

## Build Steps

1. Pull the changes to your local project
2. Run `npx cap sync android`
3. Rebuild the APK in Android Studio
4. Install and verify both icon and splash screen

