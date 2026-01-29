import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Power, PowerOff, ScanLine, StopCircle, Scan, CreditCard } from 'lucide-react';
import { useRfidReader } from '@/hooks/use-rfid-reader';
import { RfidConnectionStatus } from './RfidConnectionStatus';
import { RfidModeSwitch } from './RfidModeSwitch';
import { RfidPowerSlider } from './RfidPowerSlider';
import { RfidTagHistory } from './RfidTagHistory';
import { FastTagHistory } from './FastTagHistory';
import type { RfidTagData } from '@/services/rfid';

interface RfidReaderPanelProps {
  onTagDetected?: (tag: RfidTagData) => void;
  className?: string;
}

/**
 * Complete RFID reader control panel
 * Includes connection, mode switching, power control, and tag history
 */
export function RfidReaderPanel({ onTagDetected, className }: RfidReaderPanelProps) {
  const {
    isConnected,
    isScanning,
    power,
    mode,
    tagHistory,
    fastTagHistory,
    connect,
    disconnect,
    readSingle,
    readTagDetails,
    startContinuous,
    stopContinuous,
    setPower,
    setMode,
    clearHistory
  } = useRfidReader(onTagDetected);

  const handleScanAction = async () => {
    if (mode === 'single') {
      await readSingle();
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
            
            {/* Mode Switch */}
            <RfidModeSwitch
              mode={mode}
              onModeChange={setMode}
              disabled={isScanning}
            />
            
            {/* Scan Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <Button 
                onClick={handleScanAction}
                size="lg"
                className="h-14 text-base"
                variant={isScanning ? 'destructive' : 'default'}
              >
                {mode === 'single' ? (
                  <>
                    <ScanLine className="h-5 w-5 mr-2" />
                    Quick Read
                  </>
                ) : isScanning ? (
                  <>
                    <StopCircle className="h-5 w-5 mr-2" />
                    Stop
                  </>
                ) : (
                  <>
                    <ScanLine className="h-5 w-5 mr-2" />
                    Start Scan
                  </>
                )}
              </Button>
              
              <Button 
                onClick={readTagDetails}
                size="lg"
                className="h-14 text-base"
                variant="secondary"
                disabled={isScanning}
              >
                <CreditCard className="h-5 w-5 mr-2" />
                Read Details
              </Button>
            </div>
            
            <Separator />
            
            {/* Power Slider */}
            <RfidPowerSlider
              power={power}
              onPowerChange={setPower}
              disabled={isScanning}
            />
            
            <Separator />
            
            {/* Tag History with Tabs */}
            <Tabs defaultValue="fastag" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="fastag" className="text-xs">
                  <CreditCard className="h-3 w-3 mr-1" />
                  FASTag ({fastTagHistory.length})
                </TabsTrigger>
                <TabsTrigger value="basic" className="text-xs">
                  <Scan className="h-3 w-3 mr-1" />
                  Basic ({tagHistory.length})
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="fastag" className="mt-3">
                <FastTagHistory
                  tags={fastTagHistory}
                  onClear={clearHistory}
                />
              </TabsContent>
              
              <TabsContent value="basic" className="mt-3">
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
