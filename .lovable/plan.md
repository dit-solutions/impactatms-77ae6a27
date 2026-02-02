
# Fix OTA Updates for Private GitHub Repository

## Problem Identified

Your GitHub repository `dit-solutions/impactatms-77ae6a27` is **private**, which means:
- The GitHub API returns 404 for unauthenticated requests
- The app cannot check for updates or find release downloads
- The existing code is correct, but can't access the private repo

## Solution Options

### Option A: Make Repository Public (Recommended - Simplest)
Go to your GitHub repo → Settings → Change repository visibility to "Public"

Once public, the current code will work immediately. No code changes needed.

### Option B: Use Public Version Manifest (If Repo Must Stay Private)
Host a `version.json` file on your published website (`impactatms.lovable.app`) that the app checks instead of GitHub API.

---

## Implementation for Option B

### Step 1: Create Version Manifest File
Create `public/version.json` that will be publicly accessible at `impactatms.lovable.app/version.json`:

```json
{
  "version": "1.0.0",
  "build": 0,
  "downloadUrl": "",
  "releaseNotes": "Initial release",
  "releaseDate": "2026-02-02"
}
```

### Step 2: Update App Update Service
Modify `src/services/app-update/app-update-service.ts` to check your public website instead of GitHub API:

**Current flow:**
```
App → GitHub API (private, blocked) → 404 error
```

**New flow:**
```
App → impactatms.lovable.app/version.json (public) → Gets update info
```

### Step 3: Manual Update Process
When you push a new build:
1. GitHub Actions builds APK and creates a Release
2. You manually update `public/version.json` with:
   - New build number
   - Download URL from GitHub Release (the browser_download_url works even for private repos when accessed directly)

OR we can automate this with a GitHub Action that updates version.json.

---

## Files to Change (Option B)

| File | Action | Purpose |
|------|--------|---------|
| `public/version.json` | Create | Public version manifest |
| `src/services/app-update/app-update-service.ts` | Modify | Check website instead of GitHub API |

---

## Recommendation

**Option A (Make Repo Public)** is much simpler if there's no sensitive code in the repository. The APK files are already meant to be distributed, so there's typically no security concern.

If the repo must stay private, I'll implement Option B with the public version manifest.

---

## Regarding Keystore/Package Conflict

The keystore setup is already correct in the workflow. If you added the `DEBUG_KEYSTORE_BASE64` secret and the package conflict still happens, we should verify:

1. The secret value is the complete Base64 string (no newlines or truncation)
2. The workflow actually uses it (check the build logs for "SHA256:" fingerprint output)
3. All builds after adding the secret should have the same fingerprint

If you trigger a new build now, the "package conflict" issue should be resolved - assuming the secret is properly set.
