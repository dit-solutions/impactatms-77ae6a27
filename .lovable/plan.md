
# Fix GitHub Actions Build Workflow

## Problems Identified

### 1. Invalid JSON Formatting
The heredoc in the workflow creates JSON with leading whitespace/indentation:
```yaml
cat > public/version.json << EOF
          {
            "version": "1.0.XX",
```
This produces a file with 10 spaces before each line, making it invalid JSON.

### 2. Git Push May Fail
The workflow pushes without handling potential conflicts. If another commit happened (which is likely since Lovable commits frequently), the push fails.

---

## Solution

### Fix 1: Remove Heredoc Indentation
Use a properly formatted heredoc without leading spaces, or use `echo` with proper escaping:

```yaml
- name: Update version manifest
  if: success()
  run: |
    RELEASE_DATE=$(date -u +%Y-%m-%d)
    cat > public/version.json << 'EOF'
{
  "version": "1.0.${{ github.run_number }}",
  "build": ${{ github.run_number }},
  "downloadUrl": "https://github.com/${{ github.repository }}/releases/download/v1.0.${{ github.run_number }}/ImpactATMS-V1.0.${{ github.run_number }}.apk",
  "releaseNotes": "Build ${{ github.run_number }}",
  "releaseDate": "RELEASE_DATE_PLACEHOLDER"
}
EOF
    sed -i "s/RELEASE_DATE_PLACEHOLDER/${RELEASE_DATE}/" public/version.json
```

### Fix 2: Handle Git Push Conflicts
Add `git pull --rebase` before pushing to handle any commits that happened during the build:

```yaml
- name: Commit version manifest
  if: success()
  run: |
    git config user.name "github-actions[bot]"
    git config user.email "github-actions[bot]@users.noreply.github.com"
    git pull --rebase origin main || git pull --rebase origin master || true
    git add public/version.json
    git commit -m "chore: update version manifest to v1.0.${{ github.run_number }}" || echo "No changes to commit"
    git push
```

---

## Files to Modify

| File | Change |
|------|--------|
| `.github/workflows/android-build.yml` | Fix JSON heredoc formatting and add git pull before push |

---

## Technical Details

The heredoc syntax `<< EOF` preserves all content including leading whitespace. To fix this:
1. Start JSON content at column 0 (no indentation)
2. Or use `<<-EOF` (with dash) which strips leading tabs (but not spaces)
3. Or use `printf` / `echo` with proper formatting

The git conflict issue occurs because:
1. Lovable pushes code changes
2. GitHub Actions runs, takes ~5 minutes to build
3. During that time, more commits may be pushed
4. When Actions tries to push version.json update, it's behind and fails
