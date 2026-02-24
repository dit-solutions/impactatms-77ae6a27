import React, { useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Settings, WifiOff } from 'lucide-react';
import { RfidReaderPanel } from '@/components/rfid';
import { useDevice } from '@/contexts/DeviceContext';
import { useReadCapture } from '@/domain/use-cases/submit-read';
import type { RfidTagData } from '@/services/rfid';
import logoLight from '@/assets/logo-light.png';

const ScanScreen = () => {
  const { config, isOnline, deviceId } = useDevice();
  const { captureRead, lastResult } = useReadCapture();

  const handleTagDetected = useCallback(async (tag: RfidTagData) => {
    await captureRead(tag);
  }, [captureRead]);

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-md mx-auto">
        {/* Offline banner */}
        {!isOnline && (
          <div className="mb-3 flex items-center gap-2 p-2 rounded-lg bg-destructive/10 text-destructive text-sm">
            <WifiOff className="h-4 w-4" />
            <span>Offline — reads are queued locally</span>
          </div>
        )}

        <header className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={logoLight} alt="Impact ATMS" className="h-10 w-auto dark:hidden" />
              <div>
                <h1 className="text-xl font-bold text-secondary">Impact ATMS</h1>
                {config && (
                  <p className="text-xs text-muted-foreground">
                    {config.plaza.name} • {config.lane.name}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" asChild>
                <Link to="/diagnostics">
                  <Settings className="h-5 w-5" />
                </Link>
              </Button>
            </div>
          </div>
        </header>

        {/* Last read result */}
        {lastResult && (
          <div className={`mb-4 p-4 rounded-xl text-center font-bold text-lg ${
            lastResult.action === 'ALLOW'
              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
              : 'bg-destructive/15 text-destructive border border-destructive/30'
          }`}>
            <div className="text-3xl mb-1">{lastResult.action === 'ALLOW' ? '✓' : '✗'}</div>
            <div>{lastResult.action}</div>
            {lastResult.displayMessage && (
              <p className="text-sm font-normal mt-1 opacity-80">{lastResult.displayMessage}</p>
            )}
          </div>
        )}

        <RfidReaderPanel onTagDetected={handleTagDetected} />
      </div>
    </div>
  );
};

export default ScanScreen;
