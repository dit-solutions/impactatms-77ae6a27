/**
 * App Update Service
 * Handles version checking and auto-updates for sideloaded Android APKs
 */

import { App } from '@capacitor/app';
import { registerPlugin } from '@capacitor/core';

export interface AppVersion {
  version: string;
  build: string;
}

export interface UpdateInfo {
  latestVersion: string;
  latestBuild: number;
  downloadUrl: string;
  releaseNotes?: string;
  mandatory?: boolean;
}

interface AppUpdatePluginInterface {
  downloadAndInstall(options: { url: string }): Promise<void>;
}

const AppUpdatePlugin = registerPlugin<AppUpdatePluginInterface>('AppUpdate');

// Public manifest URL (hosted on the published app domain)
const VERSION_MANIFEST_URL = 'https://impactatms.lovable.app/version.json';

/**
 * Get the current app version info
 */
export async function getAppVersion(): Promise<AppVersion> {
  try {
    if (typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform?.()) {
      const info = await App.getInfo();
      return {
        version: info.version,
        build: info.build
      };
    }
  } catch (error) {
    console.warn('Could not get native app info:', error);
  }
  
  return {
    version: '1.0.0',
    build: 'web'
  };
}

/**
 * Check if running in native Capacitor environment
 */
export function isNativeApp(): boolean {
  return typeof window !== 'undefined' && 
         (window as any).Capacitor?.isNativePlatform?.() === true;
}

/**
 * Check for updates using the public version manifest
 */
export async function checkForUpdates(currentBuild: string): Promise<UpdateInfo | null> {
  try {
    const response = await fetch(VERSION_MANIFEST_URL, {
      cache: 'no-store'
    });

    if (!response.ok) {
      console.warn('Failed to check for updates:', response.status);
      return null;
    }

    const manifest = await response.json();
    
    const latestBuild = manifest.build || 0;
    const currentBuildNum = parseInt(currentBuild, 10) || 0;

    if (latestBuild > currentBuildNum && manifest.downloadUrl) {
      return {
        latestVersion: manifest.version || `1.0.${latestBuild}`,
        latestBuild,
        downloadUrl: manifest.downloadUrl,
        releaseNotes: manifest.releaseNotes,
        mandatory: manifest.mandatory || false
      };
    }

    return null;
  } catch (error) {
    console.error('Error checking for updates:', error);
    return null;
  }
}

/**
 * Download and install APK update via native plugin
 */
export async function downloadAndInstallUpdate(downloadUrl: string): Promise<void> {
  if (!isNativeApp()) {
    console.warn('Updates only available in native app');
    return;
  }

  try {
    await AppUpdatePlugin.downloadAndInstall({ url: downloadUrl });
  } catch (error) {
    console.error('Error downloading/installing update:', error);
    throw error;
  }
}
