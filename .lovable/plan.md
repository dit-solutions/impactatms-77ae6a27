

# Fix: Add debug logging for 404 provisioning error

## Root Cause (Most Likely)

**CORS preflight failure.** When the app (running in a WebView or browser) calls `POST /api/device/provision`, the browser first sends an `OPTIONS` preflight request. If your backend doesn't respond to `OPTIONS` with proper CORS headers (`Access-Control-Allow-Origin`, `Access-Control-Allow-Methods`, `Access-Control-Allow-Headers`), the preflight returns 404 and the browser reports it as a failed request.

Postman works because it doesn't perform CORS preflight checks.

## What needs to happen

### Backend side (your team)
Ensure your backend responds to `OPTIONS /api/device/provision` with:
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: POST, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
```
This is the real fix. Most frameworks have a CORS middleware for this.

### App side (what we change)

**1. `src/data/remote/api-client.ts`** -- Add the full URL to error logs and improve error reporting so you can see exactly what URL was called and what failed:

- Log the full URL (not just the path) before each request
- Include the full URL in error messages so it shows in the UI
- Catch network/CORS errors (which throw `TypeError`) separately from HTTP errors

**2. `src/pages/ProvisioningScreen.tsx`** -- Show the full URL in the error display during provisioning failures so you can immediately verify the URL is correct without needing logs:

- When a provisioning error occurs, display the backend URL that was attempted below the error message
- This helps quickly confirm whether the QR data was parsed correctly

## Technical Details

In `api-client.ts`, the `request` method change:

```
// Current: only logs path
logger.info(`API ${options.method || 'GET'} ${path}`);

// New: logs full URL
logger.info(`API ${options.method || 'GET'} ${url}`);
```

Also wrap `fetch` in a try/catch to distinguish CORS/network errors from HTTP errors:
```
try {
  const response = await fetch(url, { ...options, headers });
} catch (networkErr) {
  // CORS or network failure — fetch throws TypeError
  throw new ApiError(
    `Network error calling ${url} — possible CORS issue`,
    0,
    String(networkErr)
  );
}
```

In `ProvisioningScreen.tsx`, show the attempted URL in the error block:
```
{error && (
  <div className="...">
    <span>{error}</span>
    {apiClient.getBaseUrl() && (
      <span className="text-xs opacity-70 mt-1 block">
        Backend: {apiClient.getBaseUrl()}
      </span>
    )}
  </div>
)}
```

## Files Changed

| File | Change |
|------|--------|
| `src/data/remote/api-client.ts` | Log full URL, catch network/CORS errors separately |
| `src/pages/ProvisioningScreen.tsx` | Show backend URL in error display |

