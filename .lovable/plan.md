
# Fix APK Signing - Package Conflict Issue

## Root Cause

The GitHub Actions workflow correctly decodes your `DEBUG_KEYSTORE_BASE64` secret into a keystore file, but **the Gradle build configuration never uses it**. 

Currently:
- Workflow saves keystore to `~/.android/debug.keystore` and `android/debug.keystore`
- Gradle has no `signingConfigs` block
- Gradle uses its own auto-generated debug key (different on every CI runner)
- Each APK is signed with a different key = package conflicts on update

## Solution

Add explicit signing configuration to `android/app/build.gradle` that tells Gradle exactly which keystore to use for debug builds.

## Changes Required

### 1. Update `android/app/build.gradle`

Add a `signingConfigs` block and reference it in the `debug` build type:

```text
android {
    namespace "app.lovable.f68cb15949ce434d93731abbed2b0512"
    compileSdk 36
    
    // ADD THIS: Signing configuration using the consistent keystore
    signingConfigs {
        debug {
            storeFile file("${project.rootDir}/debug.keystore")
            storePassword "android"
            keyAlias "androiddebugkey"
            keyPassword "android"
        }
    }
    
    defaultConfig {
        applicationId "app.lovable.f68cb15949ce434d93731abbed2b0512"
        minSdk 24
        targetSdk 34
        versionCode getBuildNumber()
        versionName "1.0.${getBuildNumber()}"
    }
    
    buildTypes {
        release {
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
        debug {
            debuggable true
            signingConfig signingConfigs.debug  // ADD THIS LINE
        }
    }
    
    // ... rest of file unchanged
}
```

### 2. What the Workflow Already Does (No Changes Needed)

The workflow step "Create consistent debug keystore" already:
- Decodes `DEBUG_KEYSTORE_BASE64` to `android/debug.keystore`
- Prints the SHA256 fingerprint for verification

With the Gradle change, it will now actually use that keystore.

## After This Fix

1. **One-time action**: Uninstall the currently installed app from the device (last time you'll need to do this)
2. Push the change to GitHub
3. Install the next APK build
4. All future APK updates will install without conflicts

## Technical Summary

| Before | After |
|--------|-------|
| Gradle uses random CI-generated debug key | Gradle uses your consistent `debug.keystore` |
| Each build has different signature | All builds have same signature |
| Updates fail with package conflict | Updates install smoothly |
