import { useState, useEffect } from 'react';
import { 
  getAppVersion, 
  isNativeApp, 
  checkForUpdates, 
  downloadAndInstallUpdate,
  type AppVersion, 
  type UpdateInfo 
} from '@/services/app-update/app-update-service';

export interface UseAppVersionResult {
  version: AppVersion | null;
  isNative: boolean;
  updateAvailable: UpdateInfo | null;
  isCheckingUpdate: boolean;
  checkUpdate: () => Promise<void>;
  installUpdate: () => Promise<void>;
}

export function useAppVersion(): UseAppVersionResult {
  const [version, setVersion] = useState<AppVersion | null>(null);
  const [isNative, setIsNative] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState<UpdateInfo | null>(null);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);

  useEffect(() => {
    const loadVersion = async () => {
      setIsNative(isNativeApp());
      const appVersion = await getAppVersion();
      setVersion(appVersion);
    };
    
    loadVersion();
  }, []);

  const checkUpdate = async () => {
    if (!version || !isNative) return;
    
    setIsCheckingUpdate(true);
    try {
      const update = await checkForUpdates(version.build);
      setUpdateAvailable(update);
    } catch (error) {
      console.error('Failed to check for updates:', error);
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  const installUpdate = async () => {
    if (!updateAvailable) return;
    
    try {
      await downloadAndInstallUpdate(updateAvailable.downloadUrl);
    } catch (error) {
      console.error('Failed to install update:', error);
    }
  };

  return {
    version,
    isNative,
    updateAvailable,
    isCheckingUpdate,
    checkUpdate,
    installUpdate
  };
}
