
# Fix Version Display & In-App Updates

## Problems Identified

### Problem 1: Version Shows "web" in Native App
The app can't read the native version because `@capacitor/app` plugin is missing from dependencies.

### Problem 2: In-App Updates Don't Work
The `version.json` manifest is never updated by the CI workflow, so:
- `build` stays at `0`
- `downloadUrl` is empty
- The app can never detect a new version

## Solution

### 1. Add Missing Capacitor Plugin

Install `@capacitor/app` package which provides `App.getInfo()` to read the native app version.

```bash
npm install @capacitor/app
```

### 2. Update GitHub Workflow to Auto-Update Manifest

Add a step after creating the release that:
1. Updates `public/version.json` with the new build number
2. Adds the GitHub Release APK download URL  
3. Commits and pushes the change back to the repository

The download URL format for GitHub releases is:
```
https://github.com/{owner}/{repo}/releases/download/v1.0.{build}/ImpactATMS-V1.0.{build}.apk
```

### 3. Workflow Changes

Add this step after "Create GitHub Release":

```yaml
- name: Update version manifest
  run: |
    cat > public/version.json << EOF
    {
      "version": "1.0.${{ github.run_number }}",
      "build": ${{ github.run_number }},
      "downloadUrl": "https://github.com/${{ github.repository }}/releases/download/v1.0.${{ github.run_number }}/ImpactATMS-V1.0.${{ github.run_number }}.apk",
      "releaseNotes": "Build ${{ github.run_number }}",
      "releaseDate": "$(date -u +%Y-%m-%d)"
    }
    EOF

- name: Commit version manifest
  run: |
    git config user.name "github-actions[bot]"
    git config user.email "github-actions[bot]@users.noreply.github.com"
    git add public/version.json
    git commit -m "Update version manifest to v1.0.${{ github.run_number }}" || true
    git push
```

## How In-App Updates Will Work After Fix

```text
┌─────────────────────────────────────────────────────────────────────┐
│                        UPDATE FLOW                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. User clicks "Check for updates"                                │
│                     │                                               │
│                     ▼                                               │
│  2. App fetches https://impactatms.lovable.app/version.json        │
│     (Now contains: build: 42, downloadUrl: "...github.../v1.0.42") │
│                     │                                               │
│                     ▼                                               │
│  3. Compares: manifest.build (42) > currentBuild (41)?             │
│                     │                                               │
│              Yes ───┴─── No                                         │
│               │           └──> "No updates available"               │
│               ▼                                                     │
│  4. Shows "Update to v1.0.42" button                               │
│                     │                                               │
│                     ▼                                               │
│  5. User taps button -> Opens APK download URL                     │
│                     │                                               │
│                     ▼                                               │
│  6. Android downloads APK and prompts to install                   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Important Notes

- The `version.json` update must happen AFTER the release so the download URL is valid
- The workflow needs `contents: write` permission (already present) to push commits
- After publishing changes to the live site, the next build will update the manifest
- The app must be reinstalled once to clear old signature conflicts (from previous fix)
