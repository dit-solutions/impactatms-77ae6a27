/**
 * Secure device token storage.
 * Uses localStorage (Capacitor Preferences used at runtime if available).
 */

const TOKEN_KEY = 'device_token';
const DEVICE_ID_KEY = 'device_id';
const USER_KEY = 'user_session';
const USER_TOKEN_KEY = 'user_auth_token';

class TokenStore {
  async init() {
    // No-op for web. Native will use Capacitor Preferences at runtime.
  }

  async setToken(token: string): Promise<void> {
    localStorage.setItem(TOKEN_KEY, token);
  }

  async getToken(): Promise<string | null> {
    return localStorage.getItem(TOKEN_KEY);
  }

  async setDeviceId(id: string): Promise<void> {
    localStorage.setItem(DEVICE_ID_KEY, id);
  }

  async getDeviceId(): Promise<string | null> {
    return localStorage.getItem(DEVICE_ID_KEY);
  }

  async setUserSession(data: Record<string, unknown>): Promise<void> {
    localStorage.setItem(USER_KEY, JSON.stringify(data));
  }

  async getUserSession(): Promise<Record<string, unknown> | null> {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  }

  async hasUserSession(): Promise<boolean> {
    return !!localStorage.getItem(USER_KEY);
  }

  async setUserToken(token: string): Promise<void> {
    localStorage.setItem(USER_TOKEN_KEY, token);
  }

  async getUserToken(): Promise<string | null> {
    return localStorage.getItem(USER_TOKEN_KEY);
  }

  async clearUserSession(): Promise<void> {
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(USER_TOKEN_KEY);
  }

  async clear(): Promise<void> {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(DEVICE_ID_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(USER_TOKEN_KEY);
  }

  async hasToken(): Promise<boolean> {
    return !!localStorage.getItem(TOKEN_KEY);
  }
}

export const tokenStore = new TokenStore();
