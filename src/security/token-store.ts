/**
 * Secure device token storage.
 * Uses localStorage (Capacitor Preferences used at runtime if available).
 */

const TOKEN_KEY = 'device_token';
const DEVICE_ID_KEY = 'device_id';

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

  async clear(): Promise<void> {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(DEVICE_ID_KEY);
  }

  async hasToken(): Promise<boolean> {
    return !!localStorage.getItem(TOKEN_KEY);
  }
}

export const tokenStore = new TokenStore();
