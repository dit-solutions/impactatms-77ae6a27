import React from 'react';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Signal, SignalLow, SignalMedium, SignalHigh } from 'lucide-react';

interface RfidPowerSliderProps {
  power: number;
  onPowerChange: (power: number) => void;
  disabled?: boolean;
  min?: number;
  max?: number;
}

/**
 * Slider control for adjusting RFID reader power level
 */
export function RfidPowerSlider({ 
  power, 
  onPowerChange, 
  disabled = false,
  min = 5,
  max = 33
}: RfidPowerSliderProps) {
  const getSignalIcon = () => {
    const percentage = (power - min) / (max - min);
    if (percentage < 0.33) return <SignalLow className="h-5 w-5" />;
    if (percentage < 0.66) return <SignalMedium className="h-5 w-5" />;
    return <SignalHigh className="h-5 w-5" />;
  };

  const getPowerLabel = () => {
    if (power < 15) return 'Low';
    if (power < 25) return 'Medium';
    return 'High';
  };

  return (
    <div className="p-4 bg-card rounded-lg border space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Signal className="h-4 w-4 text-muted-foreground" />
          <Label className="text-sm font-medium">Reader Power</Label>
        </div>
        <div className="flex items-center gap-2">
          {getSignalIcon()}
          <span className="text-sm font-mono">{power} dBm</span>
          <span className="text-xs text-muted-foreground">({getPowerLabel()})</span>
        </div>
      </div>
      
      <Slider
        value={[power]}
        onValueChange={([value]) => onPowerChange(value)}
        min={min}
        max={max}
        step={1}
        disabled={disabled}
        className="w-full"
      />
      
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Short Range</span>
        <span>Long Range</span>
      </div>
    </div>
  );
}
