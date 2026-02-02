/**
 * App Update Service
 * Handles version checking and auto-updates for sideloaded Android APKs
 */

import { App } from '@capacitor/app';

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

// Public manifest URL (hosted on the published app domain)
const VERSION_MANIFEST_URL = 'https://impactatms.lovable.app/version.json';

/**
 * Get the current app version info
 */
export async function getAppVersion(): Promise<AppVersion> {
  try {
    // Only works in native Capacitor environment
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
  
  // Fallback for web environment
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
 * @param currentBuild Current build number
 * @returns Update info if available, null otherwise
 */
export async function checkForUpdates(currentBuild: string): Promise<UpdateInfo | null> {
  try {
    // Fetch version manifest from the published app domain
    const response = await fetch(VERSION_MANIFEST_URL, {
      cache: 'no-store' // Always get fresh data
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
 * Download and install APK update
 * This opens the APK download URL which Android will handle
 */
export async function downloadAndInstallUpdate(downloadUrl: string): Promise<void> {
  if (!isNativeApp()) {
    console.warn('Updates only available in native app');
    return;
  }

  try {
    // Open the download URL - Android will download and prompt to install
    window.open(downloadUrl, '_system');
  } catch (error) {
    console.error('Error downloading update:', error);
    throw error;
  }
}
