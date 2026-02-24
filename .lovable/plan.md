

# Fix: Lanes Dropdown Empty After Login

## Problem

The `fetchLanes()` call is made after login, but the dropdown remains empty. The token storage and auth header injection are working (login/logout confirmed working). The issue is one of:

1. **Silent failure** -- The `fetchLanes` catch block only logs a warning, so if the API returns a 401 or error, it's invisible to the user
2. **Response format mismatch** -- The Laravel API may wrap the lanes in a format not handled (e.g., `{ "lanes": [...] }`, paginated response, or nested `data` with metadata)
3. **Race condition** -- The useEffect in DeviceRouter may fire before the token is fully persisted

## Changes

### 1. Add detailed response logging in `fetchLanes` (`src/data/remote/api-client.ts`)

Log the raw response shape so we can see exactly what the server returns:

```typescript
async fetchLanes(): Promise<Lane[]> {
  const raw = await this.request<any>(
    '/api/v1/handheld/lanes',
    { method: 'GET' }
  );
  logger.info(`fetchLanes raw response: ${JSON.stringify(raw).substring(0, 500)}`);
  
  // Handle: plain array, { data: [...] }, { lanes: [...] }
  if (Array.isArray(raw)) return raw;
  if (raw?.data && Array.isArray(raw.data)) return raw.data;
  if (raw?.lanes && Array.isArray(raw.lanes)) return raw.lanes;
  
  logger.warn(`fetchLanes: unexpected response shape — keys: ${Object.keys(raw || {})}`);
  return [];
}
```

### 2. Improve error logging in `fetchLanes` callback (`src/contexts/DeviceContext.tsx`)

Log the full error including status code so auth issues are visible:

```typescript
const fetchLanes = useCallback(async () => {
  try {
    logger.info('Fetching lanes...');
    const result = await apiClient.fetchLanes();
    const normalized = result.map(l => ({ ...l, id: String(l.id) }));
    setLanes(normalized);
    localStorage.setItem(LANES_KEY, JSON.stringify(normalized));
    logger.info(`Fetched ${normalized.length} lanes: ${JSON.stringify(normalized).substring(0, 300)}`);
  } catch (err: any) {
    logger.error(`Failed to fetch lanes: ${err?.message || err} (status: ${err?.status || 'unknown'})`);
  }
}, []);
```

### 3. Also call `fetchLanes` from `completeLogin` to eliminate timing issues (`src/contexts/DeviceContext.tsx`)

Instead of relying solely on the DeviceRouter useEffect, also trigger a lanes fetch right after login succeeds:

```typescript
const completeLogin = useCallback(async (user: LoginUser, token: string) => {
  await tokenStore.setUserToken(token);
  await tokenStore.setUserSession(user as unknown as Record<string, unknown>);
  setCurrentUser(user);
  setDeviceState('active');
  logger.info(`User logged in: ${user.name} (${user.email})`);
  
  // Fetch lanes immediately after login
  fetchLanes();
}, [fetchLanes]);
```

## File Summary

| File | Change |
|------|--------|
| `src/data/remote/api-client.ts` | Add raw response logging, handle `{ lanes: [...] }` format |
| `src/contexts/DeviceContext.tsx` | Improve error logging in fetchLanes, call fetchLanes from completeLogin |

