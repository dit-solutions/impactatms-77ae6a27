
# Fix OTA Updates & Version Display

## Issues Identified

| Issue | Root Cause | Solution |
|-------|-----------|----------|
| Version shows "1.0.0" | App update service has placeholder GitHub repo | Update to your actual repo URL |
| "Package conflict" on install | Missing `DEBUG_KEYSTORE_BASE64` secret | You need to create and add this secret |
| Updates not found | Workflow creates Artifacts, not Releases | Add Release creation step to workflow |
| Check for updates fails | GitHub API returns 404 for non-existent repo | Fix repo URL |

---

## Implementation Steps

### Step 1: Update GitHub Repository URL in App Update Service

Change the placeholder values to your actual GitHub repository:

**File**: `src/services/app-update/app-update-service.ts`

```typescript
// Before
const GITHUB_OWNER = 'your-org';
const GITHUB_REPO = 'impactatms';

// After (you need to provide your actual values)
const GITHUB_OWNER = 'your-github-username-or-org';
const GITHUB_REPO = 'your-repo-name';
```

**Action needed from you**: Please provide your GitHub repository URL (e.g., `github.com/YourOrg/YourRepo`)

---

### Step 2: Fix APK Signing (CRITICAL - Stops "Package Conflict")

The GitHub workflow tries to use a secret called `DEBUG_KEYSTORE_BASE64`, but this secret does not exist in your repository. Without it, a new random keystore is generated for each build.

**Action needed from you**:

1. On your computer, run these commands to generate a keystore:
```bash
# Generate the keystore
keytool -genkeypair -v -keystore debug.keystore \
  -storepass android -alias androiddebugkey -keypass android \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -dname "CN=Impact ATMS Debug,O=D IT Solutions,C=IN"

# Convert to Base64 (Mac/Linux)
base64 -i debug.keystore | tr -d '\n'

# Convert to Base64 (Windows PowerShell)
[Convert]::ToBase64String([IO.File]::ReadAllBytes("debug.keystore"))
```

2. Copy the Base64 output
3. Go to your GitHub repo Settings, then Secrets and variables, then Actions
4. Add a new secret named `DEBUG_KEYSTORE_BASE64` with the Base64 value

---

### Step 3: Add GitHub Release Creation to Workflow

Currently, the workflow only uploads to Artifacts (which expire after 30 days and are not accessible via API). The app checks GitHub Releases instead.

**File**: `.github/workflows/android-build.yml`

Add a new step after the APK upload to create a Release:

```yaml
- name: Create GitHub Release
  uses: softprops/action-gh-release@v1
  with:
    tag_name: v1.0.${{ github.run_number }}
    name: ImpactATMS v1.0.${{ github.run_number }}
    body: |
      ## What's New
      - Build ${{ github.run_number }}
      - Built from commit: ${{ github.sha }}
    files: android/app/build/outputs/apk/debug/ImpactATMS-V1.0.${{ github.run_number }}.apk
    draft: false
    prerelease: false
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

---

### Step 4: Improve Version Display

The version badge already shows "v{version} (Build {build})" which should work correctly once the above fixes are applied. But to make debugging easier, I'll add the build number more prominently.

---

## Web-Based Admin Panel for Remote Unlock

Since you cannot access the app once it's deployed at client sites, I'll add a web page at `impactatms.lovable.app/admin` that:

- Works from any browser (your phone, laptop, etc.)
- Allows you to enter a Device ID and generate unlock codes
- No app installation needed on your end

**New file**: `src/pages/AdminPanel.tsx`

This page will be public (accessible without login) but will require the Super Admin PIN to generate codes.

---

## Files to Change

| File | Action | Purpose |
|------|--------|---------|
| `src/services/app-update/app-update-service.ts` | Modify | Update GitHub repo URL |
| `.github/workflows/android-build.yml` | Modify | Add Release creation step |
| `src/pages/AdminPanel.tsx` | Create | Web-based remote admin panel |
| `src/App.tsx` | Modify | Add route for /admin page |

---

## What You Need to Provide

Before I can implement these changes:

1. **Your GitHub repository URL** (e.g., `github.com/YourCompany/impactatms`)

2. **Confirm you will add the keystore secret** (`DEBUG_KEYSTORE_BASE64`) using the commands above

---

## After Implementation: How Updates Will Work

```text
1. You make changes in Lovable
2. Changes push to GitHub automatically
3. GitHub Actions builds APK with consistent signing key
4. Workflow creates a GitHub Release with the APK attached
5. Client device opens app → Goes to Settings → Taps "Check for updates"
6. App finds new version → Shows "Update to v1.0.X" button
7. User taps → APK downloads and installs over existing app (no uninstall needed)
```
