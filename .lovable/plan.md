

# Fix YAML Syntax Error in CI Workflow

## Problem
Line 106 onward has zero indentation for the heredoc JSON content. YAML requires all lines inside a `run: |` block to maintain consistent indentation (at least matching the first content line, which uses 10 spaces). The `{` at column 0 breaks YAML parsing.

## Fix

**File:** `.github/workflows/android-build.yml` (lines 105-113)

Replace the unindented heredoc block with a properly indented approach using `printf` or by re-indenting the heredoc content to match the YAML block:

```yaml
      - name: Commit version manifest
        if: success()
        run: |
          SEMVER="${{ env.SEMVER }}"
          BUILD="${{ env.BUILD }}"
          VERSION="${{ env.VERSION }}"
          DOWNLOAD="https://github.com/dit-solutions/impactatms-77ae6a27/releases/download/${VERSION}/ImpactATMS-${VERSION}.apk"

          printf '{\n  "version": "%s",\n  "build": %s,\n  "downloadUrl": "%s",\n  "releaseNotes": "Build %s",\n  "releaseDate": "%s"\n}\n' \
            "${SEMVER}" "${BUILD}" "${DOWNLOAD}" "${BUILD}" "$(date -u +%Y-%m-%d)" \
            > public/version.json
```

This uses `printf` instead of a heredoc, avoiding all YAML/heredoc indentation conflicts while producing clean, unindented JSON output.

## Single file change
- `.github/workflows/android-build.yml` — replace lines 105-113

