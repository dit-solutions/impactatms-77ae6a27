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

// GitHub repo for checking releases
const GITHUB_OWNER = 'dit-solutions';
const GITHUB_REPO = 'impactatms-77ae6a27';

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
 * Check GitHub releases for updates
 * @param currentBuild Current build number
 * @returns Update info if available, null otherwise
 */
export async function checkForUpdates(currentBuild: string): Promise<UpdateInfo | null> {
  try {
    // Fetch latest release from GitHub
    const response = await fetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`,
      {
        headers: {
          'Accept': 'application/vnd.github.v3+json'
        }
      }
    );

    if (!response.ok) {
      console.warn('Failed to check for updates:', response.status);
      return null;
    }

    const release = await response.json();
    
    // Parse version from tag (e.g., "v1.0.123" -> 123)
    const tagName = release.tag_name || '';
    const latestBuildMatch = tagName.match(/\.(\d+)$/);
    const latestBuild = latestBuildMatch ? parseInt(latestBuildMatch[1], 10) : 0;
    const currentBuildNum = parseInt(currentBuild, 10) || 0;

    if (latestBuild > currentBuildNum) {
      // Find APK asset
      const apkAsset = release.assets?.find((asset: any) => 
        asset.name.endsWith('.apk')
      );

      if (apkAsset) {
        return {
          latestVersion: release.tag_name,
          latestBuild,
          downloadUrl: apkAsset.browser_download_url,
          releaseNotes: release.body,
          mandatory: release.body?.toLowerCase().includes('[mandatory]')
        };
      }
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
