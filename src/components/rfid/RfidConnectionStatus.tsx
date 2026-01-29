import React from 'react';
import { Wifi, WifiOff, Radio } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RfidConnectionStatusProps {
  isConnected: boolean;
  isScanning?: boolean;
  className?: string;
}

/**
 * Visual indicator for RFID reader connection status
 */
export function RfidConnectionStatus({ 
  isConnected, 
  isScanning = false,
  className 
}: RfidConnectionStatusProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="relative">
        {isConnected ? (
          <>
            <Wifi className="h-5 w-5 text-primary" />
            {isScanning && (
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-primary" />
              </span>
            )}
          </>
        ) : (
          <WifiOff className="h-5 w-5 text-destructive" />
        )}
      </div>
      <div className="flex flex-col">
        <span className={cn(
          'text-sm font-medium',
          isConnected ? 'text-primary' : 'text-destructive'
        )}>
          {isConnected ? 'Connected' : 'Disconnected'}
        </span>
        {isConnected && isScanning && (
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Radio className="h-3 w-3 animate-pulse" />
            Scanning...
          </span>
        )}
      </div>
    </div>
  );
}
