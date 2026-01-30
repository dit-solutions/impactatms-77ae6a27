

# Slide Up + Fade Splash Screen Animation

## Overview

Implement an elegant **Slide Up + Fade** animation for the splash screen. The logo will slide up from slightly below while fading in, creating a smooth, dynamic entrance that feels professional and polished.

---

## Animation Specification

| Property | Value |
|----------|-------|
| **Slide Distance** | 30dp (starts below, slides to center) |
| **Fade** | 0% to 100% opacity |
| **Duration** | 500ms |
| **Easing** | Decelerate (fast start, smooth stop) |

This creates a subtle "rising into place" effect that draws the eye without being flashy.

---

## Files to Modify

### 1. Create New Animation File

**File**: `android/app/src/main/res/anim/splash_slide_fade.xml`

```xml
<?xml version="1.0" encoding="utf-8"?>
<!-- Impact TMS Splash Animation - Slide up with fade in -->
<set xmlns:android="http://schemas.android.com/apk/res/android"
    android:interpolator="@android:anim/decelerate_interpolator">
    
    <!-- Slide up animation - rises 30dp from below -->
    <translate
        android:fromYDelta="30%p"
        android:toYDelta="0"
        android:duration="500" />
    
    <!-- Fade in animation -->
    <alpha
        android:fromAlpha="0.0"
        android:toAlpha="1.0"
        android:duration="400" />
</set>
```

### 2. Update MainActivity Exit Animation

**File**: `android/app/src/main/java/.../MainActivity.java`

Update the exit animation to complement the entrance (slide down + fade out):

```java
splashScreen.setOnExitAnimationListener(splashScreenView -> {
    // Slide down + fade out animation (reverse of entrance)
    splashScreenView.getIconView().animate()
        .alpha(0f)
        .translationY(50f)  // Slide down slightly
        .setDuration(300)
        .withEndAction(splashScreenView::remove)
        .start();
});
```

---

## Animation Flow

```text
┌─────────────────────────────────────┐
│                                     │
│           (logo hidden)             │  0ms - Start
│                                     │
└─────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────┐
│                                     │
│         ░░ IMPACT TMS ░░            │  200ms - Fading in, sliding up
│              (30% up)               │
└─────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────┐
│                                     │
│          IMPACT TMS                 │  500ms - Fully visible, centered
│           (centered)                │
└─────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────┐
│                                     │
│         ░░ IMPACT TMS ░░            │  Exit - Fades out, slides down
│                                     │
└─────────────────────────────────────┘
```

---

## Why This Works

- **Professional**: Slide up motion feels purposeful and intentional
- **Quick**: 500ms is fast enough to not feel like a delay
- **Smooth**: Decelerate easing creates a natural "landing" feel
- **Complementary exit**: Slide down + fade mirrors the entrance elegantly

