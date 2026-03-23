import React, { useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings, WifiOff } from 'lucide-react';
import { RfidReaderPanel } from '@/components/rfid';
import { useDevice } from '@/contexts/DeviceContext';
import { useReadCapture } from '@/domain/use-cases/submit-read';
import type { RfidTagData } from '@/services/rfid';
import logoLight from '@/assets/logo-light.png';

const ScanScreen = () => {
  const { config, isOnline, lanes, selectedLane, setSelectedLane } = useDevice();
  const { captureRead, lastResult } = useReadCapture();

  const handleTagDetected = useCallback(async (tag: RfidTagData) => {
    if (selectedLane) {
      await captureRead(tag, selectedLane.id);
    }
  }, [captureRead, selectedLane]);

  const handleLaneChange = useCallback((laneId: string) => {
    const lane = lanes.find(l => l.id === laneId) || null;
    setSelectedLane(lane);
  }, [lanes, setSelectedLane]);

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

        <header className="mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={logoLight} alt="Impact ATMS" className="h-10 w-auto dark:hidden" />
              <div>
                <h1 className="text-xl font-bold text-secondary">Impact ATMS</h1>
                {config && (
                  <p className="text-xs text-muted-foreground">
                    {config.plaza.name}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={logout} title="Logout">
                <LogOut className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" asChild>
                <Link to="/diagnostics">
                  <Settings className="h-5 w-5" />
                </Link>
              </Button>
            </div>
          </div>
        </header>

        {/* Lane selector */}
        <div className="mb-4">
          <Select
            value={selectedLane?.id || ''}
            onValueChange={handleLaneChange}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a lane to begin scanning" />
            </SelectTrigger>
            <SelectContent>
              {lanes.map(lane => (
                <SelectItem key={lane.id} value={lane.id}>
                  {lane.name}{lane.lane_number != null ? ` (#${lane.lane_number})` : ''}
                </SelectItem>
              ))}
              {lanes.length === 0 && (
                <div className="px-3 py-2 text-sm text-muted-foreground">No lanes available</div>
              )}
            </SelectContent>
          </Select>
        </div>

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

        {/* Disable reader if no lane selected */}
        {!selectedLane ? (
          <div className="p-8 rounded-xl border border-dashed border-muted-foreground/30 text-center text-muted-foreground">
            <p className="text-sm">Please select a lane above to start scanning</p>
          </div>
        ) : (
          <RfidReaderPanel onTagDetected={handleTagDetected} />
        )}
      </div>
    </div>
  );
};

export default ScanScreen;
