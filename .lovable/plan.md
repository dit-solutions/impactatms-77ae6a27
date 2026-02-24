

# Fix: Store Bearer Token on Login, Send on All Requests, Clear on Logout

## Problem

The login API returns a `token` field (Laravel Sanctum format, e.g. `7|cx7E1GCT...`), but the app currently:
1. Never stores it
2. Never sends `Authorization: Bearer <token>` on authenticated requests
3. This causes **logout** to silently fail (server rejects unauthenticated call)
4. This causes **lanes fetch** to fail, resulting in an empty lane dropdown on the Scan screen

## Changes (5 files)

### 1. `src/data/remote/api-types.ts`
Add `token: string` to `LoginResponse`:
```typescript
export interface LoginResponse {
  token: string;
  message: string;
  user: LoginUser;
}
```

### 2. `src/security/token-store.ts`
Add user auth token methods and a new storage key `user_auth_token`:
- `setUserToken(token: string)` -- saves bearer token
- `getUserToken(): string | null` -- retrieves bearer token
- Update `clearUserSession()` to also remove `user_auth_token`
- Update `clear()` to also remove `user_auth_token`

### 3. `src/data/remote/api-client.ts`
In the `request()` method, after setting the `Device` header, also inject:
```typescript
const userToken = await tokenStore.getUserToken();
if (userToken) {
  headers['Authorization'] = `Bearer ${userToken}`;
}
```
This automatically authenticates all subsequent calls (heartbeat, config, lanes, logout, submitReads).

### 4. `src/contexts/DeviceContext.tsx`
- Change `completeLogin` signature to `(user: LoginUser, token: string)`
- Inside, call `tokenStore.setUserToken(token)` before saving the user session
- Update the context type to match the new signature
- The `logout` function already calls `tokenStore.clearUserSession()` which will now also clear the bearer token

### 5. `src/pages/LoginScreen.tsx`
Pass the token from the API response:
```typescript
await completeLogin(response.user, response.token);
```

## How this fixes lanes

Once the bearer token is sent with every request, `fetchLanes()` will authenticate successfully. The existing lane caching (localStorage) and version-based refresh via heartbeat already work correctly -- lanes are only re-fetched when the heartbeat reports a new `config_versions.lanes` version number.

## File summary

| File | Change |
|------|--------|
| `src/data/remote/api-types.ts` | Add `token: string` to `LoginResponse` |
| `src/security/token-store.ts` | Add `setUserToken`, `getUserToken`; clear token in `clearUserSession` and `clear` |
| `src/data/remote/api-client.ts` | Add `Authorization: Bearer` header in `request()` |
| `src/contexts/DeviceContext.tsx` | Update `completeLogin(user, token)` to store token |
| `src/pages/LoginScreen.tsx` | Pass `response.token` to `completeLogin` |

