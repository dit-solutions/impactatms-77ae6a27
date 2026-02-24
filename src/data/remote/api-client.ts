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
  Lane,
} from './api-types';

class ApiClient {
  private baseUrl: string | null = null;

  setBaseUrl(url: string) {
    this.baseUrl = url.replace(/\/+$/, '');
  }

  getBaseUrl(): string | null {
    return this.baseUrl;
  }

  async init() {
    const stored = localStorage.getItem('device_backend_url');
    if (stored) this.baseUrl = stored;
  }

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

    if (!skipAuth) {
      const token = await tokenStore.getToken();
      if (!token) {
        throw new ApiAuthError('Device token missing');
      }
      headers['Device'] = `HHM ${token}`;

      const userToken = await tokenStore.getUserToken();
      if (userToken) {
        headers['Authorization'] = `Bearer ${userToken}`;
      }
    }

    const url = `${this.baseUrl}${path}`;
    logger.info(`API ${options.method || 'GET'} ${url}`);

    let response: Response;
    try {
      response = await fetch(url, { ...options, headers });
    } catch (networkErr) {
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
      true
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
      '/api/v1/handheld/config',
      { method: 'GET' }
    );
  }

  async fetchLanes(): Promise<Lane[]> {
    const raw = await this.request<any>(
      '/api/v1/handheld/lanes',
      { method: 'GET' }
    );
    logger.info(`fetchLanes raw response: ${JSON.stringify(raw).substring(0, 500)}`);
    
    if (Array.isArray(raw)) return raw;
    if (raw?.data && Array.isArray(raw.data)) return raw.data;
    if (raw?.lanes && Array.isArray(raw.lanes)) return raw.lanes;
    
    logger.warn(`fetchLanes: unexpected response shape — keys: ${Object.keys(raw || {})}`);
    return [];
  }

  async submitReadsBatch(req: BatchReadRequest): Promise<BatchReadResponse> {
    return this.request<BatchReadResponse>(
      '/api/v1/handheld/fastag-read/batch',
      { method: 'POST', body: JSON.stringify(req) }
    );
  }

  async login(req: LoginRequest): Promise<LoginResponse> {
    return this.request<LoginResponse>(
      '/api/v1/handheld/auth/login',
      { method: 'POST', body: JSON.stringify(req) }
    );
  }

  async logout(): Promise<void> {
    try {
      await this.request<{ message: string }>(
        '/api/v1/handheld/auth/logout',
        { method: 'POST' }
      );
    } catch (err) {
      logger.warn(`Logout API call failed (best-effort): ${err}`);
    }
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
