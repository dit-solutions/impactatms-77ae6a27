/**
 * API Client with device token interceptor.
 * Base URL is dynamic — comes from QR provisioning and stored locally.
 */

import { tokenStore } from '@/security/token-store';
import { logger } from '@/utils/logger';
import type {
  ProvisionRequest,
  ProvisionResponse,
  HeartbeatRequest,
  HeartbeatResponse,
  DeviceConfigResponse,
  BatchReadRequest,
  BatchReadResponse,
  LoginRequest,
  LoginResponse,
} from './api-types';

class ApiClient {
  private baseUrl: string | null = null;

  setBaseUrl(url: string) {
    // Strip trailing slash
    this.baseUrl = url.replace(/\/+$/, '');
  }

  getBaseUrl(): string | null {
    return this.baseUrl;
  }

  /** Load base URL from storage on init */
  async init() {
    const stored = localStorage.getItem('device_backend_url');
    if (stored) this.baseUrl = stored;
  }

  /** Persist the base URL */
  persistBaseUrl(url: string) {
    this.setBaseUrl(url);
    localStorage.setItem('device_backend_url', this.baseUrl!);
  }

  clearBaseUrl() {
    this.baseUrl = null;
    localStorage.removeItem('device_backend_url');
  }

  private async request<T>(
    path: string,
    options: RequestInit = {},
    skipAuth = false
  ): Promise<T> {
    if (!this.baseUrl) {
      throw new Error('API base URL not set. Device not provisioned.');
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    // Inject device token
    if (!skipAuth) {
      const token = await tokenStore.getToken();
      if (!token) {
        throw new ApiAuthError('Device token missing');
      }
      headers['Device'] = `HHM ${token}`;
    }

    const url = `${this.baseUrl}${path}`;
    logger.info(`API ${options.method || 'GET'} ${url}`);

    let response: Response;
    try {
      response = await fetch(url, {
        ...options,
        headers,
      });
    } catch (networkErr) {
      // CORS preflight failure or network error — fetch throws TypeError
      const errMsg = `Network error calling ${url} — possible CORS issue: ${String(networkErr)}`;
      logger.error(errMsg);
      throw new ApiError(errMsg, 0, String(networkErr));
    }

    if (response.status === 401) {
      logger.error(`API auth failed — 401 at ${url}`);
      throw new ApiAuthError('Device authentication failed');
    }

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      logger.error(`API error ${response.status} at ${url}: ${body}`);
      throw new ApiError(`API error ${response.status} at ${url}`, response.status, body);
    }

    return response.json();
  }

  // ---- Endpoints ----

  async provision(req: ProvisionRequest): Promise<ProvisionResponse> {
    return this.request<ProvisionResponse>(
      '/api/v1/handheld/provision',
      { method: 'POST', body: JSON.stringify(req) },
      true // no auth for provisioning
    );
  }

  async heartbeat(req: HeartbeatRequest): Promise<HeartbeatResponse> {
    return this.request<HeartbeatResponse>(
      '/api/v1/handheld/heartbeat',
      { method: 'POST', body: JSON.stringify(req) }
    );
  }

  async getConfig(): Promise<DeviceConfigResponse> {
    return this.request<DeviceConfigResponse>(
      '/api/device/config',
      { method: 'GET' }
    );
  }

  async submitReadsBatch(req: BatchReadRequest): Promise<BatchReadResponse> {
    return this.request<BatchReadResponse>(
      '/api/device/fastag-read/batch',
      { method: 'POST', body: JSON.stringify(req) }
    );
  }

  async login(req: LoginRequest): Promise<LoginResponse> {
    return this.request<LoginResponse>(
      '/api/v1/handheld/auth/login',
      { method: 'POST', body: JSON.stringify(req) }
    );
  }
}

// Custom error classes
export class ApiError extends Error {
  constructor(message: string, public status: number, public body: string) {
    super(message);
    this.name = 'ApiError';
  }
}

export class ApiAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ApiAuthError';
  }
}

export const apiClient = new ApiClient();
