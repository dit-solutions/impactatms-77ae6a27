

## Integrate Mivanta SDK AAR v1.1.0

The newer AAR file (`HCUHF_v1.1.0_20250620.aar`) has been uploaded and is now in the project. This is a significant improvement over the current JAR because an AAR (Android Archive) is a self-contained bundle that includes all Java classes, native `.so` libraries, and resources in one package.

### What's Changing

**1. Update build.gradle to use AAR instead of JAR**

The current configuration only loads JAR files:
```groovy
implementation fileTree(dir: 'libs', include: ['*.jar'])
```

We'll update this to:
- Include AAR files from the `libs` folder using `flatDir` repository
- Remove the old v1.0.8 JAR since the AAR contains the same classes (and more)

**2. Clean up libs folder**

- Keep: `HCUHF_v1.1.0_20250620.aar` (the new complete SDK)
- Remove: `HCUHF_v1.0.8_20250102.jar` (superseded by the AAR)

**3. Potentially simplify native library loading**

Since AAR files can bundle their own native libraries, the SDK may now load its `.so` files automatically. We'll add a fallback check but keep the manual loading in case it's still needed.

---

### Technical Details

#### File Changes

**`android/app/build.gradle`**
```text
Change:
  implementation fileTree(dir: 'libs', include: ['*.jar'])

To:
  // Include AAR files from libs folder
  implementation(name: 'HCUHF_v1.1.0_20250620', ext: 'aar')
  // Include any remaining JAR files (for future additions)
  implementation fileTree(dir: 'libs', include: ['*.jar'])
```

**`android/app/libs/`**
- Delete `HCUHF_v1.0.8_20250102.jar` (no longer needed)

**`android/app/src/main/java/com/mivanta/rfid/MivantaRfidPlugin.java`**
- Update the `loadNativeLibraries()` method to only attempt manual loading if the AAR's bundled libraries aren't automatically available
- Add improved error logging to capture any API differences in v1.1.0

---

### Why This Should Fix the Build

The original `NoClassDefFoundError` for `UHFReaderSLR` and `HcPowerCtrl` occurred because:
1. The standalone JAR (`v1.0.8`) only contained core classes
2. Module-specific classes were in separate JARs that weren't present

The AAR format bundles **all dependencies together**, including:
- Core UHF classes (`UHFReader`, `UHFTagEntity`, etc.)
- Module implementations (`UHFReaderSLR`, etc.)
- Power control classes (`HcPowerCtrl`)
- Pre-compiled native `.so` libraries

---

### Build Verification

After these changes, the GitHub Actions build should:
1. Compile without `NoClassDefFoundError`
2. Package all native libraries correctly
3. Produce a working APK that can connect to the RFID hardware

