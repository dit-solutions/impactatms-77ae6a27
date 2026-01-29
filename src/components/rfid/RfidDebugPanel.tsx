import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Bug, RefreshCw, CheckCircle, XCircle } from 'lucide-react';
import { rfidService, DebugInfoResult } from '@/services/rfid';

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