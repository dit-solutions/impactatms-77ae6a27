

# Fix Debug Tab Freeze + Limit to Last 20 Scans

## Problem
`getRecentReads(30)` does a full table scan on every Debug tab click, causing ANR crashes. Multiple clicks queue multiple scans.

## Changes

### 1. `src/data/local/database.ts` — Add limit to `getRecentReads()`
- Add `limit` parameter (default 20)
- Stop cursor iteration once limit is reached
- Still sort by newest first

### 2. `src/pages/DiagnosticsScreen.tsx`
- Remove `onClick={loadRecentReads}` from Debug tab trigger
- Add a manual "Load Recent Scans" button inside the Debug tab content
- Call `getRecentReads(30, 20)` — last 30 days, max 20 records
- Update heading to say "Last 20 Scans" instead of "Last 30 Days"

| File | Change |
|------|--------|
| `database.ts` | Add `limit` param to `getRecentReads()`, stop at limit |
| `DiagnosticsScreen.tsx` | Remove auto-load on tab click, add manual load button, limit to 20 |

