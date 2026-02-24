

# Fix: Blank Screen After Login + Back Button

## Root Cause

After login, `deviceState` becomes `'active'`, which renders `ScanScreen` and starts workers (heartbeat, config, sync, fetchLanes). The blank screen is caused by:

1. **`fetchLanes()` response parsing** — Laravel APIs typically return `{ data: [...] }`, but the code expects a plain `Lane[]` array. When `setLanes()` receives an object instead of an array, `lanes.map()` in ScanScreen crashes the entire component tree.

2. **`Lane.id` type mismatch** — The API likely returns `id` as a number, but `SelectItem` requires a string `value`. This causes a silent render failure.

3. **No error boundary** — A crash in any child component results in a completely blank screen with no recovery option.

4. **Back button listener** — `@capacitor/app`'s `App.addListener('backButton')` may fail silently on web, but should work on native. However, if the component tree crashes before the listener is set up, the back button won't work either.

## Changes

### 1. Fix `fetchLanes` response parsing (`src/data/remote/api-client.ts`)

Handle both `Lane[]` and `{ data: Lane[] }` response formats:

```typescript
async fetchLanes(): Promise<Lane[]> {
  const raw = await this.request<Lane[] | { data: Lane[] }>(
    '/api/v1/handheld/lanes',
    { method: 'GET' }
  );
  return Array.isArray(raw) ? raw : (raw as any).data || [];
}
```

### 2. Coerce `Lane.id` to string (`src/contexts/DeviceContext.tsx`)

In `fetchLanes` callback, ensure `id` is always a string:

```typescript
const fetchLanes = useCallback(async () => {
  try {
    const result = await apiClient.fetchLanes();
    const normalized = result.map(l => ({ ...l, id: String(l.id) }));
    setLanes(normalized);
    localStorage.setItem(LANES_KEY, JSON.stringify(normalized));
    logger.info(`Fetched ${normalized.length} lanes`);
  } catch (err) {
    logger.warn(`Failed to fetch lanes: ${err}`);
  }
}, []);
```

### 3. Add an Error Boundary (new file `src/components/device/ErrorBoundary.tsx`)

A simple React error boundary that catches crashes and shows a recovery UI (with a "Reload" button) instead of a blank screen.

### 4. Wrap `DeviceRouter` with Error Boundary (`src/App.tsx`)

```tsx
<DeviceProvider>
  <ErrorBoundary>
    <DeviceRouter />
  </ErrorBoundary>
</DeviceProvider>
```

### 5. Defensive `updateConfig` callback (`src/contexts/DeviceContext.tsx`)

Handle wrapped config response:

```typescript
const updateConfig = useCallback((newConfig: DeviceConfigResponse) => {
  setConfig(newConfig);
  localStorage.setItem('device_config', JSON.stringify(newConfig));
  logger.info(`Config updated — Plaza: ${newConfig?.plaza?.name ?? 'unknown'}`);
}, []);
```

## File Summary

| File | Change |
|------|--------|
| `src/data/remote/api-client.ts` | Handle `{ data: [...] }` wrapper in `fetchLanes` |
| `src/contexts/DeviceContext.tsx` | Coerce `Lane.id` to string, defensive config logging |
| `src/components/device/ErrorBoundary.tsx` | New error boundary component |
| `src/App.tsx` | Wrap router with ErrorBoundary |

