import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Bug, RefreshCw, CheckCircle, XCircle, Keyboard } from 'lucide-react';
import { rfidService, DebugInfoResult } from '@/services/rfid';
import MivantaRfid, { KeyEventData } from '@/services/rfid/mivanta-rfid-plugin';

interface RfidDebugPanelProps {
  className?: string;
}

/**
 * Debug panel showing SDK methods and status
 * Useful for troubleshooting on-device without Logcat
 */
export function RfidDebugPanel({ className }: RfidDebugPanelProps) {
  const [debugInfo, setDebugInfo] = useState<DebugInfoResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastKeyEvent, setLastKeyEvent] = useState<KeyEventData | null>(null);

  // Listen for keyEvent from native plugin
  useEffect(() => {
    let handle: { remove: () => void } | null = null;

    MivantaRfid.addListener('keyEvent', (data: KeyEventData) => {
      setLastKeyEvent(data);
    }).then(h => { handle = h; });

    return () => {
      handle?.remove();
    };
  }, []);

  const fetchDebugInfo = async () => {
    setLoading(true);
    try {
      const info = await rfidService.getDebugInfo();
      setDebugInfo(info);
    } catch (error) {
      setDebugInfo({
        sdkAvailable: false,
        nativeLibsLoaded: false,
        isConnected: false,
        methods: 'Error: ' + String(error)
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Bug className="h-5 w-5" />
            SDK Debug Info
          </CardTitle>
          <Button 
            onClick={fetchDebugInfo} 
            size="sm" 
            variant="outline"
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            {debugInfo ? 'Refresh' : 'Load'}
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {/* Last Key Event — always visible */}
        <div className="rounded border bg-muted/30 p-3 space-y-1">
          <p className="text-sm font-medium flex items-center gap-1.5">
            <Keyboard className="h-4 w-4" />
            Last Physical Key Pressed
          </p>
          {lastKeyEvent ? (
            <div className="flex flex-wrap gap-2 items-center">
              <Badge variant="outline" className="font-mono text-base">
                KeyCode: {lastKeyEvent.keyCode}
              </Badge>
              {lastKeyEvent.isMainTrigger && (
                <Badge variant="default">Gun Trigger</Badge>
              )}
              {lastKeyEvent.isSideButton && (
                <Badge variant="secondary">Side Button</Badge>
              )}
              {!lastKeyEvent.isMainTrigger && !lastKeyEvent.isSideButton && (
                <Badge variant="destructive">Unknown</Badge>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Press any physical button to see its keycode</p>
          )}
        </div>

        {!debugInfo ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Tap "Load" to fetch SDK debug information
          </p>
        ) : (
          <>
            {/* Status Badges */}
            <div className="flex flex-wrap gap-2">
              <Badge variant={debugInfo.sdkAvailable ? 'default' : 'destructive'}>
                {debugInfo.sdkAvailable ? (
                  <CheckCircle className="h-3 w-3 mr-1" />
                ) : (
                  <XCircle className="h-3 w-3 mr-1" />
                )}
                SDK: {debugInfo.sdkAvailable ? 'Available' : 'Not Available'}
              </Badge>
              
              <Badge variant={debugInfo.nativeLibsLoaded ? 'default' : 'destructive'}>
                {debugInfo.nativeLibsLoaded ? (
                  <CheckCircle className="h-3 w-3 mr-1" />
                ) : (
                  <XCircle className="h-3 w-3 mr-1" />
                )}
                Native Libs: {debugInfo.nativeLibsLoaded ? 'Loaded' : 'Not Loaded'}
              </Badge>
              
              <Badge variant={debugInfo.isConnected ? 'default' : 'secondary'}>
                Reader: {debugInfo.isConnected ? 'Connected' : 'Disconnected'}
              </Badge>
            </div>

            {/* Trigger Config */}
            <div className="rounded border bg-muted/30 p-2 space-y-1">
              <p className="text-xs font-medium">Gun Trigger Keycodes: <span className="font-mono">{debugInfo.triggerKeyCodes || 'N/A'}</span></p>
              <p className="text-xs text-muted-foreground">Last keycode from SDK: <span className="font-mono">{debugInfo.lastKeyCode ?? 'N/A'}</span></p>
            </div>
            
            {/* Methods List */}
            <div className="space-y-1">
              <p className="text-sm font-medium">UHFReader Methods:</p>
              <ScrollArea className="h-48 rounded border bg-muted/30 p-2">
                <pre className="text-xs font-mono whitespace-pre-wrap break-all">
                  {debugInfo.methods || 'No methods found'}
                </pre>
              </ScrollArea>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
