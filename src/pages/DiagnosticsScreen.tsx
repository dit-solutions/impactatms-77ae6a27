import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft, Settings as SettingsIcon, Zap, Repeat, Power, PowerOff,
  Bug, Wifi, WifiOff, Activity, Download, RotateCcw, CheckCircle, XCircle,
  Loader2, Database
} from 'lucide-react';
import { RfidModeSwitch } from '@/components/rfid/RfidModeSwitch';
import { RfidPowerSlider } from '@/components/rfid/RfidPowerSlider';
import { RfidDebugPanel } from '@/components/rfid/RfidDebugPanel';
import { AppVersionBadge } from '@/components/app/AppVersionBadge';
import { useRfidSettings } from '@/hooks/use-rfid-settings';
import { rfidService } from '@/services/rfid';
import { useDevice } from '@/contexts/DeviceContext';
import { logger } from '@/utils/logger';
import { apiClient } from '@/data/remote/api-client';
import { toast } from '@/hooks/use-toast';

const DiagnosticsScreen = () => {
  const { power, mode, isConnected, setPower, setMode, refreshStatus } = useRfidSettings();
  const { deviceId, config, lastHeartbeat, lastSync, pendingCount, resetDevice } = useDevice();
  const [connecting, setConnecting] = useState(false);
  const [testing, setTesting] = useState(false);
  const navigate = useNavigate();

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

  const handleTestApi = async () => {
    setTesting(true);
    try {
      await apiClient.getConfig();
      toast({ title: 'API OK', description: 'Config endpoint responded' });
    } catch (err) {
      toast({ title: 'API Error', description: String(err), variant: 'destructive' });
    } finally {
      setTesting(false);
    }
  };

  const handleResetDevice = async () => {
    if (confirm('This will erase all device data and return to the setup screen. Continue?')) {
      await resetDevice();
      navigate('/');
    }
  };

  const handleExportLogs = () => {
    logger.downloadLogs();
    toast({ title: 'Logs Exported', description: 'Log file downloaded' });
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-md mx-auto">
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
                Diagnostics
              </h1>
              <p className="text-sm text-muted-foreground">
                Device settings & status
              </p>
            </div>
          </div>
        </header>

        <Tabs defaultValue="device" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="device">
              <Activity className="h-4 w-4 mr-1" />
              Device
            </TabsTrigger>
            <TabsTrigger value="reader">
              <SettingsIcon className="h-4 w-4 mr-1" />
              Reader
            </TabsTrigger>
            <TabsTrigger value="debug">
              <Bug className="h-4 w-4 mr-1" />
              Debug
            </TabsTrigger>
          </TabsList>

          {/* Device Info Tab */}
          <TabsContent value="device" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Device Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <InfoRow label="Device ID" value={deviceId || 'Not provisioned'} />
                <InfoRow
                  label="Plaza"
                  value={config?.plaza.name || '—'}
                />
                <InfoRow
                  label="Lane"
                  value={config?.lane.name || '—'}
                />
                <Separator />
                <InfoRow
                  label="Last Heartbeat"
                  value={lastHeartbeat ? lastHeartbeat.toLocaleTimeString() : 'Never'}
                />
                <InfoRow
                  label="Last Sync"
                  value={lastSync ? lastSync.toLocaleTimeString() : 'Never'}
                />
                <InfoRow
                  label="Pending Reads"
                  value={String(pendingCount)}
                  highlight={pendingCount > 0}
                />
              </CardContent>
            </Card>

            {/* Actions */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={handleTestApi}
                  disabled={testing}
                >
                  {testing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Activity className="h-4 w-4 mr-2" />}
                  Test API Connection
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={handleExportLogs}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export Logs
                </Button>
                <Separator />
                <Button
                  variant="destructive"
                  className="w-full justify-start"
                  onClick={handleResetDevice}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset Device
                </Button>
              </CardContent>
            </Card>

            {/* About */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">About</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <InfoRow label="Developer" value="D IT Solutions Pvt. Ltd.®" />
                <InfoRow label="Powered By" value="Impact ATMS™" />
                <InfoRow label="SDK" value="Mivanta UHF v1.1.0" />
                <InfoRow label="Hardware" value="CX1500N" />
                <Separator />
                <div className="flex justify-center pt-2">
                  <AppVersionBadge />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reader Tab */}
          <TabsContent value="reader" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  {isConnected ? <Wifi className="h-4 w-4 text-emerald-500" /> : <WifiOff className="h-4 w-4 text-destructive" />}
                  Reader Connection
                </CardTitle>
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

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Repeat className="h-4 w-4" />
                  Read Mode
                </CardTitle>
              </CardHeader>
              <CardContent>
                <RfidModeSwitch mode={mode} onModeChange={setMode} disabled={false} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Read Power
                </CardTitle>
              </CardHeader>
              <CardContent>
                <RfidPowerSlider power={power} onPowerChange={setPower} disabled={false} />
                {!isConnected && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Connect the reader to apply power changes.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Debug Tab */}
          <TabsContent value="debug">
            <RfidDebugPanel />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

function InfoRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-medium ${highlight ? 'text-primary' : ''}`}>{value}</span>
    </div>
  );
}

export default DiagnosticsScreen;
