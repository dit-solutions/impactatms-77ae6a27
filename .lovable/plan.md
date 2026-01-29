

# Fix App Icon and Splash Screen to Use Actual Logo

## Problem Identified

The app icon and splash screen are showing incorrect/different icons because:

1. **Vector XML recreations** were made instead of using your actual uploaded logo PNGs
2. The old **mipmap icon files** still contain the default blue Capacitor icon (blue circle with plus sign)
3. Your actual logo files exist in `src/assets/` but aren't being used for Android native resources

## Solution

Replace the vector XML icons with your actual Impact ATMS logo (the orange "A" road mark) in proper PNG format at all required Android sizes.

---

## Implementation Steps

### Step 1: Generate Android App Icon PNGs

Create proper PNG app icons from your logo at all required Android densities:

| Density | Size | Folder |
|---------|------|--------|
| mdpi | 48x48px | mipmap-mdpi |
| hdpi | 72x72px | mipmap-hdpi |
| xhdpi | 96x96px | mipmap-xhdpi |
| xxhdpi | 144x144px | mipmap-xxhdpi |
| xxxhdpi | 192x192px | mipmap-xxxhdpi |

**Adaptive Icon Foreground** (for Android 8.0+):
- Size: 108x108dp with 72dp safe zone centered
- Will use brand colors as background (#464660)

### Step 2: Create Splash Screen Drawable

Replace `splash_icon.xml` with a proper PNG-based splash using your actual logo.

### Step 3: Update Mipmap Resources

Replace the existing XML vector icons in mipmap folders with PNG versions:
- `ic_launcher.png` - Standard icon
- `ic_launcher_round.png` - Round icon variant
- `ic_launcher_foreground.png` - Foreground layer for adaptive icons

### Step 4: Update Adaptive Icon Configuration

Ensure `mipmap-anydpi-v26/ic_launcher.xml` references the PNG foreground correctly with your brand background color (#464660).

---

## Files to be Modified/Created

| File | Action |
|------|--------|
| `android/app/src/main/res/mipmap-mdpi/ic_launcher.png` | Replace with 48x48 logo |
| `android/app/src/main/res/mipmap-hdpi/ic_launcher.png` | Replace with 72x72 logo |
| `android/app/src/main/res/mipmap-xhdpi/ic_launcher.png` | Replace with 96x96 logo |
| `android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png` | Replace with 144x144 logo |
| `android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png` | Replace with 192x192 logo |
| Same pattern for `ic_launcher_round.png` | All densities |
| `android/app/src/main/res/drawable/ic_launcher_foreground.png` | 432x432 foreground |
| `android/app/src/main/res/drawable/splash.png` | Splash screen logo |

---

## Visual Result

After implementation:
- **App Icon**: Your actual Impact ATMS orange "A" road mark logo on dark gray (#464660) background
- **Splash Screen**: Your full Impact ATMS logo centered on branded background
- **Consistent branding** across installation, home screen, and app launch

