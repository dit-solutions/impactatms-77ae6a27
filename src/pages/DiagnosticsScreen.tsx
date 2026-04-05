import React, { useState, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ArrowLeft, Settings as SettingsIcon, Zap, Repeat, Power, PowerOff,
  Bug, Wifi, WifiOff, Activity, Download, RotateCcw,
  Loader2, Trash2, Clock, LogOut
} from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import { RfidModeSwitch } from '@/components/rfid/RfidModeSwitch';
import { RfidPowerSlider } from '@/components/rfid/RfidPowerSlider';
import { RfidDebugPanel } from '@/components/rfid/RfidDebugPanel';
import { AppVersionBadge } from '@/components/app/AppVersionBadge';
import { useRfidSettings } from '@/hooks/use-rfid-settings';
import { rfidService } from '@/services/rfid';
import { useDevice } from '@/contexts/DeviceContext';
import { logger } from '@/utils/logger';
import { apiClient } from '@/data/remote/api-client';
import { db } from '@/data/local/database';
import { toast } from '@/hooks/use-toast';
import type { PendingRead } from '@/data/local/entities';

const DiagnosticsScreen = () => {
  const [searchParams] = useSearchParams();
  const initialTab = ['device', 'reader', 'debug'].includes(searchParams.get('tab') || '') 
    ? searchParams.get('tab')! 
    : 'device';
  const { power, mode, isConnected, setPower, setMode, refreshStatus } = useRfidSettings();
  const { deviceId, config, lastHeartbeat, lastSync, pendingCount, resetDevice, logout } = useDevice();
  const [connecting, setConnecting] = useState(false);
  const [testing, setTesting] = useState(false);
  const [recentReads, setRecentReads] = useState<PendingRead[]>([]);
  const [loadingReads, setLoadingReads] = useState(false);
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
    if (confirm('⚠️ This will erase ALL device data and return to the setup screen. This action cannot be undone. Continue?')) {
      await resetDevice();
      navigate('/');
    }
  };

  const handleExportLogs = () => {
    logger.downloadLogs();
    toast({ title: 'Logs Exported', description: 'Log file downloaded' });
  };

  const loadRecentReads = async () => {
    setLoadingReads(true);
    try {
      const reads = await db.getRecentReads(30, 20);
      setRecentReads(reads);
    } catch (err) {
      logger.warn(`Failed to load recent reads: ${err}`);
    } finally {
      setLoadingReads(false);
    }
  };

  const handleClearOldLogs = async () => {
    if (confirm('Delete scanned tag logs older than 30 days?')) {
      const deleted = await db.deleteOlderThan(30);
      toast({ title: 'Cleared', description: `${deleted} old entries removed` });
      loadRecentReads();
    }
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

        <Tabs defaultValue={initialTab} className="w-full">
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

          {/* Device Info Tab — only info, no actions */}
          <TabsContent value="device" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Device Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <InfoRow label="Device ID" value={deviceId || 'Not provisioned'} />
                <InfoRow label="Plaza" value={config?.plaza.name || '—'} />
                <InfoRow label="Lane" value={config?.lane.name || '—'} />
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

            {/* Danger Zone */}
            <Card className="border-destructive/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-destructive">Danger Zone</CardTitle>
              </CardHeader>
              <CardContent>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="w-full justify-start">
                      <LogOut className="h-4 w-4 mr-2" />
                      Sign Out
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you sure you want to sign out?</AlertDialogTitle>
                      <AlertDialogDescription>
                        You will need to sign in again to access the scanner.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={logout}>Sign Out</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <p className="text-xs text-muted-foreground mt-2">
                  Signs you out of the current session.
                </p>
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

          {/* Debug Tab — includes actions, tag log, reset */}
          <TabsContent value="debug" className="space-y-4">
            <RfidDebugPanel />

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
              </CardContent>
            </Card>

            {/* Scanned Tags Log */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Last 20 Scans
                  </CardTitle>
                  <Button variant="ghost" size="sm" onClick={handleClearOldLogs}>
                    <Trash2 className="h-3 w-3 mr-1" />
                    Clear Old
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {recentReads.length === 0 && !loadingReads ? (
                  <Button onClick={loadRecentReads} variant="outline" className="w-full">
                    <Clock className="h-4 w-4 mr-2" />
                    Load Recent Scans
                  </Button>
                ) : loadingReads ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <ScrollArea className="h-64">
                    <div className="space-y-2">
                      {recentReads.map((read, i) => (
                        <div key={read.id || i} className="flex items-center justify-between text-xs border-b border-border pb-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-mono truncate">{read.epc}</p>
                            <p className="text-muted-foreground">
                              {new Date(read.createdAt).toLocaleString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 ml-2 shrink-0">
                            <Badge variant={read.syncStatus === 'synced' ? 'default' : 'secondary'} className="text-[10px]">
                              {read.syncStatus}
                            </Badge>
                            {read.action && (
                              <Badge variant={read.action === 'ALLOW' ? 'default' : 'destructive'} className="text-[10px]">
                                {read.action}
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>

            {/* Danger Zone */}
            <Card className="border-destructive/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-destructive">Danger Zone</CardTitle>
              </CardHeader>
              <CardContent>
                <Button
                  variant="destructive"
                  className="w-full justify-start"
                  onClick={handleResetDevice}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset Device
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  Erases all device data and returns to provisioning setup.
                </p>
              </CardContent>
            </Card>
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
