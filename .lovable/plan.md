
## Fix Android Build Workflow

The GitHub Actions build is failing because `android/gradle/wrapper/gradle-wrapper.jar` is missing from the repository. The `gradlew` shell script requires this JAR file to run.

### What We'll Change

We'll update the GitHub Actions workflow to use the official `gradle/actions/setup-gradle` action, which installs Gradle directly on the runner without needing the wrapper JAR.

### File to Modify

**`.github/workflows/android-build.yml`**

Replace the manual gradlew execution with the Gradle action:

1. Add Gradle setup step using `gradle/actions/setup-gradle@v4`
2. Run `gradle assembleDebug` directly (instead of `./gradlew assembleDebug`)
3. Remove the "Make Gradle wrapper executable" step (no longer needed)

### Updated Workflow Steps

```text
+---------------------+
| Checkout code       |
+---------------------+
         |
+---------------------+
| Set up Node.js 18   |
+---------------------+
         |
+---------------------+
| Set up Java 17      |
+---------------------+
         |
+---------------------+
| Set up Android SDK  |
+---------------------+
         |
+---------------------+
| Set up Gradle 8.4   |  <-- NEW: Uses gradle/actions/setup-gradle
+---------------------+
         |
+---------------------+
| npm ci              |
+---------------------+
         |
+---------------------+
| npm run build       |
+---------------------+
         |
+---------------------+
| npx cap sync android|
+---------------------+
         |
+---------------------+
| gradle assembleDebug|  <-- CHANGED: Uses `gradle` directly
+---------------------+
         |
+---------------------+
| Upload APK artifact |
+---------------------+
```

### After Approval

Once this change is pushed to GitHub, the workflow will automatically trigger again. This time it should successfully build your APK since it no longer depends on the missing wrapper JAR.

---

### Technical Details

The Gradle action (`gradle/actions/setup-gradle@v4`) will:
- Install Gradle 8.4 (matching your `gradle-wrapper.properties` version)
- Add it to the system PATH
- Enable build caching for faster subsequent builds

This approach is actually more reliable than using the wrapper because it doesn't require committing binary files to your repository.
