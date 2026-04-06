import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
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
  isUpToDate: boolean;
  checkUpdate: () => Promise<void>;
  installUpdate: () => Promise<void>;
}

export function useAppVersion(): UseAppVersionResult {
  const [version, setVersion] = useState<AppVersion | null>(null);
  const [isNative, setIsNative] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState<UpdateInfo | null>(null);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [isUpToDate, setIsUpToDate] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const loadVersion = async () => {
      setIsNative(isNativeApp());
      const appVersion = await getAppVersion();
      setVersion(appVersion);
    };
    
    loadVersion();
  }, []);

  const checkUpdate = async () => {
    if (!version) return;
    
    setIsCheckingUpdate(true);
    setIsUpToDate(false);
    try {
      const update = await checkForUpdates(version.build);
      setUpdateAvailable(update);
      if (update) {
        toast({
          title: 'Update available',
          description: `Version ${update.latestVersion} is ready to install.`,
        });
      } else {
        setIsUpToDate(true);
        toast({
          title: 'Up to date',
          description: `You're running the latest version (${version.version}).`,
        });
      }
    } catch (error) {
      console.error('Failed to check for updates:', error);
      toast({
        title: 'Update check failed',
        description: 'Could not reach the update server. Check your connection.',
        variant: 'destructive',
      });
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
      toast({
        title: 'Install failed',
        description: 'Could not download or install the update.',
        variant: 'destructive',
      });
    }
  };

  return {
    version,
    isNative,
    updateAvailable,
    isCheckingUpdate,
    isUpToDate,
    checkUpdate,
    installUpdate
  };
}
