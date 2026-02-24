

# Fix: Gradle Wrapper Script Not Executable

## Problem

The GitHub Actions build logs show:

> Gradle wrapper script '/home/runner/work/impactatms-77ae6a27/impactatms-77ae6a27/android/gradlew' is not executable. Action will set executable permission and continue.

This is a warning (not a build failure) because the `setup-gradle` action auto-fixes it at runtime. However, it should be fixed properly so the file is committed with the executable bit.

## Solution

Add a step in the CI workflow to set the executable permission **before** the Gradle build runs. This is the simplest approach since Lovable's git hosting doesn't preserve file permission bits.

### Change in `.github/workflows/android-build.yml`

Add one step right before "Generate Gradle wrapper":

```yaml
- name: Fix Gradle wrapper permissions
  run: chmod +x android/gradlew

- name: Generate Gradle wrapper
  ...
```

### Files changed

| File | Change |
|------|--------|
| `.github/workflows/android-build.yml` | Add `chmod +x android/gradlew` step before the Gradle build steps |

