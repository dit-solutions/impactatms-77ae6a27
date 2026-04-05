

# Change App Package Name to `com.impactatms.app`

## What changes

Update the package name from `app.lovable.f68cb15949ce434d93731abbed2b0512` to `com.impactatms.app` across all config files. The signing key (`debug.keystore`) is unaffected — it's independent of the package name.

**Important**: Existing installs must be uninstalled first since Android treats a different package ID as a different app.

## Files to update

| File | Change |
|------|--------|
| `capacitor.config.ts` | `appId` → `com.impactatms.app` |
| `android/app/build.gradle` | `namespace` and `applicationId` → `com.impactatms.app` |
| `android/app/src/main/res/values/strings.xml` | `package_name` and `custom_url_scheme` → `com.impactatms.app` |
| `android/app/src/main/java/...` | Move `MainActivity.java` from `app/lovable/f68cb15949ce434d93731abbed2b0512/` to `com/impactatms/app/` and update `package` declaration |

## What stays the same

- Signing key (`debug.keystore`) — unchanged
- All web/TypeScript code — unchanged
- All Capacitor plugins, RFID integration — unchanged
- CI/CD workflow — unchanged (no package name references there)
- App display name ("Impact ATMS") — unchanged

