

# Reduce Tag History Cap to 2

Change the in-memory tag history limit from 20 to 2 in `src/hooks/use-rfid-reader.ts`. This affects both `tagHistory` and `fastTagHistory` arrays.

## Change

**File:** `src/hooks/use-rfid-reader.ts`
- Line ~49: `.slice(0, 20)` → `.slice(0, 2)` (tagHistory in onTagDetected callback)
- Line ~107: `.slice(0, 20)` → `.slice(0, 2)` (tagHistory in readSingleWithDetails)
- Line ~108: `.slice(0, 20)` → `.slice(0, 2)` (fastTagHistory in readSingleWithDetails)
- Line ~130: `.slice(0, 20)` → `.slice(0, 2)` (fastTagHistory in readTagDetails)

Only the display buffer size changes — no impact on RFID reading or backend submission.

