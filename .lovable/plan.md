

# Fix GitHub Release 403 Error

## Problem

The build is failing with a **403 Forbidden** error when trying to create a GitHub Release:
```
⚠️ GitHub release failed with status: 403
```

This happens because the workflow's `GITHUB_TOKEN` lacks permission to create releases. By default, GitHub Actions only gives read permissions.

## Solution

Add a `permissions` block to the workflow that grants write access to the repository contents (which includes releases).

## Changes Required

**File: `.github/workflows/android-build.yml`**

Add after line 9 (`runs-on: ubuntu-latest`):

```yaml
permissions:
  contents: write
```

This single line tells GitHub to allow the workflow to:
- Create tags
- Create releases
- Upload release assets (the APK file)

## Complete Fix

The job section will look like:

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    permissions:
      contents: write
    
    steps:
      ...
```

## After This Fix

1. Push the change to GitHub
2. The next build will have permission to create releases
3. APK will be attached to the release
4. The update system will work (once we also add the manifest update step)

## Additional Note

We should also add the step to automatically update `version.json` after release creation. This would be added in the same edit to complete the auto-update flow.

