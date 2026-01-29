import React from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ScanLine, MousePointerClick } from 'lucide-react';
import type { RfidReadMode } from '@/services/rfid';

interface RfidModeSwitchProps {
  mode: RfidReadMode;
  onModeChange: (mode: RfidReadMode) => void;
  disabled?: boolean;
}

/**
 * Toggle between single-read and continuous scanning modes
 */
export function RfidModeSwitch({ mode, onModeChange, disabled = false }: RfidModeSwitchProps) {
  const isContinuous = mode === 'continuous';

  return (
    <div className="flex items-center justify-between p-4 bg-card rounded-lg border">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-full ${isContinuous ? 'bg-primary/10' : 'bg-muted'}`}>
          {isContinuous ? (
            <ScanLine className="h-5 w-5 text-primary" />
          ) : (
            <MousePointerClick className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
        <div>
          <Label htmlFor="scan-mode" className="text-sm font-medium">
            {isContinuous ? 'Continuous Scan' : 'Single Read'}
          </Label>
          <p className="text-xs text-muted-foreground">
            {isContinuous 
              ? 'Automatically detect all tags in range' 
              : 'Tap to read one tag at a time'}
          </p>
        </div>
      </div>
      <Switch
        id="scan-mode"
        checked={isContinuous}
        onCheckedChange={(checked) => onModeChange(checked ? 'continuous' : 'single')}
        disabled={disabled}
      />
    </div>
  );
}
