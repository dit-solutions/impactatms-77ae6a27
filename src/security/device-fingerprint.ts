/**
 * Device fingerprint collection.
 * Uses navigator data on web, enhanced on native via Capacitor plugins.
 */

import { getAppVersion } from '@/services/app-update/app-update-service';

export interface DeviceInfo {
  android_id: string;
  model: string;
  os_version: string;
  app_version: string;
}

export async function collectDeviceInfo(): Promise<DeviceInfo> {
  let androidId = 'web-browser';
  let model = navigator.userAgent.substring(0, 50);
  let osVersion = navigator.platform || 'web';

  try {
    if ((window as any).Capacitor?.isNativePlatform?.()) {
      const mod = await (Function('return import("@capacitor/device")')() as Promise<any>);
      const Device = mod.Device;
      const info = await Device.getInfo();
      const id = await Device.getId();

      androidId = id.identifier || 'unknown';
      model = info.model || 'unknown';
      osVersion = info.osVersion || 'unknown';
    }
  } catch (error) {
    console.warn('Device info collection failed, using defaults', error);
  }

  const appVersion = await getAppVersion();

  return {
    android_id: androidId,
    model,
    os_version: osVersion,
    app_version: appVersion.version,
  };
}
