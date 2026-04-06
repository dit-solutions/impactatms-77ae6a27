

# Remove Redundant "Impact ATMS" Text from ScanScreen Header

## Change

In `src/pages/ScanScreen.tsx`, remove the `<h1>Impact ATMS</h1>` text next to the logo since the logo already identifies the app. Keep the plaza name subtitle beneath the logo.

### `src/pages/ScanScreen.tsx` (lines 47-54)

Replace the `<div>` block containing the h1 and plaza name — remove the h1, keep only the plaza name directly next to the logo:

```tsx
{config && (
  <p className="text-xs text-muted-foreground">
    {config.plaza.name}
  </p>
)}
```

No other files affected.

