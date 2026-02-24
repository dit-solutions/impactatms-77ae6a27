

# Fix: GitHub Actions Version Manifest Push Failure

## Problem

The CI build succeeds (APK is built and released) but the final step that commits `version.json` back to the repo fails because:

1. `npx cap sync` earlier in the workflow modifies tracked files in `android/`, leaving unstaged changes that block `git pull --rebase`.
2. Lovable's own commits land on `main` while the build runs, so the push is rejected with "remote contains work you do not have locally."

## Solution

Update the "Commit version manifest" step in `.github/workflows/android-build.yml` to:

1. **Stash or reset** unrelated changes before pulling — use `git checkout -- .` or `git stash` to clear modifications from `cap sync`.
2. **Only stage `version.json`** — ensure no other modified files sneak into the commit.
3. **Force-pull with autostash** — use `git pull --rebase --autostash` so it handles any remaining dirty state.
4. **Retry push with a short loop** — if the push still fails due to a race, pull and retry (up to 3 attempts).

### Updated step (replaces the current "Commit version manifest" step):

```yaml
- name: Commit version manifest
  if: success()
  run: |
    git config user.name "github-actions[bot]"
    git config user.email "github-actions[bot]@users.noreply.github.com"

    # Reset all unstaged changes from cap sync / build
    git checkout -- .

    # Stage only version.json
    git add public/version.json
    git diff --cached --quiet && echo "No changes to commit" && exit 0

    git commit -m "chore: update version manifest to v1.0.${{ github.run_number }}"

    # Retry push up to 3 times (handles race with Lovable commits)
    for i in 1 2 3; do
      git pull --rebase origin main && git push origin main && exit 0
      echo "Push attempt $i failed, retrying..."
      sleep 2
    done
    echo "WARNING: Could not push version.json after 3 attempts (non-fatal)"
```

### Why this works

| Problem | Fix |
|---------|-----|
| Unstaged changes from `cap sync` block rebase | `git checkout -- .` resets the working tree before pulling |
| Remote is ahead (Lovable pushed) | `git pull --rebase` before push, with retry loop |
| Push still rejected on race | 3 retry attempts with 2s delay; exits gracefully if all fail |

### Files changed

| File | Change |
|------|--------|
| `.github/workflows/android-build.yml` | Replace "Commit version manifest" step with the version above |

## Note
The APK build and GitHub Release steps are unaffected — they already succeed. This fix only addresses the final `version.json` commit/push step.

