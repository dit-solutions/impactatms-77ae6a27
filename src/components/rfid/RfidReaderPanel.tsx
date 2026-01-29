import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Power, PowerOff, ScanLine, StopCircle, Scan, CreditCard, FileText } from 'lucide-react';
import { useRfidReader } from '@/hooks/use-rfid-reader';
import { RfidConnectionStatus } from './RfidConnectionStatus';
import { RfidTagHistory } from './RfidTagHistory';
import { FastTagHistory } from './FastTagHistory';
import type { RfidTagData } from '@/services/rfid';

interface RfidReaderPanelProps {
  onTagDetected?: (tag: RfidTagData) => void;
  className?: string;
}

/**
 * Complete RFID reader control panel
 * Simplified UI - settings moved to Settings page
 */
export function RfidReaderPanel({ onTagDetected, className }: RfidReaderPanelProps) {
  const {
    isConnected,
    isScanning,
    mode,
    tagHistory,
    fastTagHistory,
    connect,
    disconnect,
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
          <RfidConnectionStatus 
            isConnected={isConnected} 
            isScanning={isScanning}
          />
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Connection Controls */}
        <div className="flex gap-2">
          {!isConnected ? (
            <Button onClick={connect} className="flex-1">
              <Power className="h-4 w-4 mr-2" />
              Connect Reader
            </Button>
          ) : (
            <Button onClick={disconnect} variant="outline" className="flex-1">
              <PowerOff className="h-4 w-4 mr-2" />
              Disconnect
            </Button>
          )}
        </div>

        {isConnected && (
          <>
            <Separator />
            
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
            
            {/* Tag History with Tabs - FASTag first, renamed Basic to Raw Data */}
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
