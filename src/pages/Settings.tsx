import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Settings as SettingsIcon, Zap, Repeat, Power, PowerOff, Bug, Wifi, WifiOff } from 'lucide-react';
import { RfidModeSwitch } from '@/components/rfid/RfidModeSwitch';
import { RfidPowerSlider } from '@/components/rfid/RfidPowerSlider';
import { RfidDebugPanel } from '@/components/rfid/RfidDebugPanel';
import { AppVersionBadge } from '@/components/app/AppVersionBadge';
import { useRfidSettings } from '@/hooks/use-rfid-settings';
import { rfidService } from '@/services/rfid';
import { toast } from '@/hooks/use-toast';

const Settings = () => {
  const { power, mode, isConnected, setPower, setMode, refreshStatus } = useRfidSettings();
  const [connecting, setConnecting] = React.useState(false);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const success = await rfidService.connect();
      if (success) {
        toast({ title: 'Connected', description: 'RFID reader connected successfully' });
        refreshStatus();
      }
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    await rfidService.disconnect();
    toast({ title: 'Disconnected', description: 'RFID reader disconnected' });
    refreshStatus();
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-md mx-auto">
        {/* Header with back button */}
        <header className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <SettingsIcon className="h-6 w-6" />
                Settings
              </h1>
              <p className="text-sm text-muted-foreground">
                Configure reader options
              </p>
            </div>
          </div>
        </header>

        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="general">
              <SettingsIcon className="h-4 w-4 mr-2" />
              General
            </TabsTrigger>
            <TabsTrigger value="debug">
              <Bug className="h-4 w-4 mr-2" />
              Debug
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4">
            {/* Connection Control */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  {isConnected ? (
                    <Wifi className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <WifiOff className="h-4 w-4 text-destructive" />
                  )}
                  Reader Connection
                </CardTitle>
                <CardDescription>
                  {isConnected ? 'Reader is connected and ready' : 'Connect to start scanning'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!isConnected ? (
                  <Button onClick={handleConnect} className="w-full" disabled={connecting}>
                    <Power className="h-4 w-4 mr-2" />
                    {connecting ? 'Connecting...' : 'Connect Reader'}
                  </Button>
                ) : (
                  <Button onClick={handleDisconnect} variant="outline" className="w-full">
                    <PowerOff className="h-4 w-4 mr-2" />
                    Disconnect
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Reader Mode */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Repeat className="h-4 w-4" />
                  Read Mode
                </CardTitle>
                <CardDescription>
                  Single read requires a button press each time. Continuous mode scans automatically.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RfidModeSwitch
                  mode={mode}
                  onModeChange={setMode}
                  disabled={false}
                />
              </CardContent>
            </Card>

            {/* Power Level */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Read Power
                </CardTitle>
                <CardDescription>
                  Higher power increases range but uses more battery.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RfidPowerSlider
                  power={power}
                  onPowerChange={setPower}
                  disabled={false}
                />
                {!isConnected && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Connect the reader to apply power changes.
                  </p>
                )}
              </CardContent>
            </Card>

            <Separator />

            {/* About */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">About</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Developer</span>
                  <span className="font-medium">D IT Solutions Pvt. Ltd.®</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Powered By</span>
                  <span className="font-medium">Impact ATMS™</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Deployed For</span>
                  <span className="font-medium">Chakraoda Toll Plaza (UJTPL)</span>
                </div>
                <Separator />
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">SDK Version</span>
                  <span>Mivanta UHF v1.1.0</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Hardware</span>
                  <span>CX1500N</span>
                </div>
                <Separator />
                <div className="flex justify-center pt-2">
                  <AppVersionBadge />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="debug">
            <RfidDebugPanel />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Settings;
