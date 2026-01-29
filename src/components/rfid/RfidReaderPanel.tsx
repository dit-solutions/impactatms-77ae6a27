import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScanLine, StopCircle, Scan, CreditCard, FileText, Settings, Wifi, WifiOff } from 'lucide-react';
import { useRfidReader } from '@/hooks/use-rfid-reader';
import { RfidTagHistory } from './RfidTagHistory';
import { FastTagHistory } from './FastTagHistory';
import type { RfidTagData } from '@/services/rfid';

interface RfidReaderPanelProps {
  onTagDetected?: (tag: RfidTagData) => void;
  className?: string;
}

/**
 * RFID reader scanning panel
 * Connection controls moved to Settings page
 */
export function RfidReaderPanel({ onTagDetected, className }: RfidReaderPanelProps) {
  const {
    isConnected,
    isScanning,
    mode,
    tagHistory,
    fastTagHistory,
    readSingleWithDetails,
    startContinuous,
    stopContinuous,
    clearHistory
  } = useRfidReader(onTagDetected);

  const handleScanAction = async () => {
    if (mode === 'single') {
      await readSingleWithDetails();
    } else {
      if (isScanning) {
        await stopContinuous();
      } else {
        await startContinuous();
      }
    }
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Scan className="h-5 w-5" />
            RFID Reader
          </CardTitle>
          {/* Connection Status Badge */}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
            isConnected 
              ? 'bg-green-500/10 text-green-600' 
              : 'bg-muted text-muted-foreground'
          }`}>
            {isConnected ? (
              <>
                <Wifi className="h-4 w-4" />
                <span>Connected</span>
                {isScanning && (
                  <span className="ml-1 h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                )}
              </>
            ) : (
              <>
                <WifiOff className="h-4 w-4" />
                <span>Disconnected</span>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {!isConnected ? (
          /* Not connected - show message to go to settings */
          <div className="text-center py-8">
            <WifiOff className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground mb-4">Reader not connected</p>
            <Button asChild>
              <Link to="/settings">
                <Settings className="h-4 w-4 mr-2" />
                Go to Settings to Connect
              </Link>
            </Button>
          </div>
        ) : (
          <>
            {/* Single large scan button */}
            <Button 
              onClick={handleScanAction}
              size="lg"
              className="w-full h-16 text-lg"
              variant={isScanning ? 'destructive' : 'default'}
            >
              {mode === 'single' ? (
                <>
                  <ScanLine className="h-6 w-6 mr-2" />
                  Scan Tag
                </>
              ) : isScanning ? (
                <>
                  <StopCircle className="h-6 w-6 mr-2" />
                  Stop Scanning
                </>
              ) : (
                <>
                  <ScanLine className="h-6 w-6 mr-2" />
                  Start Scanning
                </>
              )}
            </Button>
            
            <Separator />
            
            {/* Tag History with Tabs */}
            <Tabs defaultValue="fastag" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="fastag" className="text-xs">
                  <CreditCard className="h-3 w-3 mr-1" />
                  FASTag ({fastTagHistory.length})
                </TabsTrigger>
                <TabsTrigger value="raw" className="text-xs">
                  <FileText className="h-3 w-3 mr-1" />
                  Raw Data ({tagHistory.length})
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="fastag" className="mt-3">
                <FastTagHistory
                  tags={fastTagHistory}
                  onClear={clearHistory}
                />
              </TabsContent>
              
              <TabsContent value="raw" className="mt-3">
                <RfidTagHistory
                  tags={tagHistory}
                  onClear={clearHistory}
                />
              </TabsContent>
            </Tabs>
          </>
        )}
      </CardContent>
    </Card>
  );
}
