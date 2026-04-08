import React, { useEffect } from 'react';
import { useAppVersion } from '@/hooks/use-app-version';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Download, Smartphone, Globe, CheckCircle } from 'lucide-react';

interface AppVersionBadgeProps {
  showUpdateCheck?: boolean;
  className?: string;
}

export function AppVersionBadge({ showUpdateCheck = true, className = '' }: AppVersionBadgeProps) {
  const { 
    version, 
    isNative, 
    updateAvailable, 
    isCheckingUpdate, 
    isUpToDate,
    checkUpdate, 
    installUpdate 
  } = useAppVersion();

  useEffect(() => {
    if (isNative && showUpdateCheck) {
      checkUpdate();
    }
  }, [isNative, showUpdateCheck]);

  if (!version) {
    return null;
  }

  const displayVersion = version.version === version.build 
    ? `v${version.version}` 
    : `v${version.version} (Build ${version.build})`;

  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      <div className="flex items-center gap-2">
        {isNative ? (
          <Smartphone className="h-3 w-3 text-muted-foreground" />
        ) : (
          <Globe className="h-3 w-3 text-muted-foreground" />
        )}
        <span className="text-xs text-muted-foreground">
          {displayVersion}
        </span>
        <Badge variant={isNative ? "default" : "secondary"} className="text-[10px] px-1.5 py-0">
          {isNative ? 'Native' : 'Web'}
        </Badge>
      </div>

      {showUpdateCheck && (
        <div className="flex items-center gap-2">
          {updateAvailable ? (
            <Button 
              size="sm" 
              variant="default"
              onClick={installUpdate}
              className="h-7 text-xs gap-1"
            >
              <Download className="h-3 w-3" />
              Update to v{updateAvailable.latestVersion}
            </Button>
          ) : isUpToDate ? (
            <span className="text-xs text-green-600 flex items-center gap-1">
              <CheckCircle className="h-3 w-3" />
              Up to date
            </span>
          ) : (
            <Button 
              size="sm" 
              variant="ghost"
              onClick={checkUpdate}
              disabled={isCheckingUpdate}
              className="h-7 text-xs gap-1 text-muted-foreground"
            >
              <RefreshCw className={`h-3 w-3 ${isCheckingUpdate ? 'animate-spin' : ''}`} />
              {isCheckingUpdate ? 'Checking...' : 'Check for updates'}
            </Button>
          )}
        </div>
      )}

      {updateAvailable && (
        <div className="text-xs text-primary text-center">
          New version available: v{updateAvailable.latestVersion}
          {updateAvailable.mandatory && (
            <span className="ml-1 text-destructive font-medium">(Required)</span>
          )}
        </div>
      )}
    </div>
  );
}
