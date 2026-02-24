/**
 * Device fingerprint collection.
 * Uses navigator data on web, enhanced on native via Capacitor plugins.
 */

import type { DeviceFingerprint } from '@/data/remote/api-types';
import { getAppVersion } from '@/services/app-update/app-update-service';

export async function collectDeviceFingerprint(): Promise<DeviceFingerprint> {
  let androidId = 'web-browser';
  let manufacturer = 'Browser';
  let model = navigator.userAgent.substring(0, 50);
  let osVersion = navigator.platform || 'web';

  try {
    if ((window as any).Capacitor?.isNativePlatform?.()) {
      // Dynamic import — only loads on native
      const mod = await (Function('return import("@capacitor/device")')() as Promise<any>)
      const Device = mod.Device;
      const info = await Device.getInfo();
      const id = await Device.getId();

      androidId = id.identifier || 'unknown';
      manufacturer = info.manufacturer || 'unknown';
      model = info.model || 'unknown';
      osVersion = info.osVersion || 'unknown';
    }
  } catch (error) {
    console.warn('Device fingerprint collection failed, using defaults', error);
  }

  const appVersion = await getAppVersion();

  return {
    android_id: androidId,
    manufacturer,
    model,
    os_version: osVersion,
    app_version: appVersion.version,
    app_signature_hash: 'sha256:build-time-placeholder',
  };
}
