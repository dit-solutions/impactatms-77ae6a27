import { useState, useEffect, useRef } from 'react';
import { toast } from '@/hooks/use-toast';

interface BatteryManager extends EventTarget {
  level: number;
  charging: boolean;
  addEventListener(type: string, listener: EventListener): void;
  removeEventListener(type: string, listener: EventListener): void;
}

export function useBattery() {
  const [percent, setPercent] = useState<number | null>(null);
  const [isCharging, setIsCharging] = useState(false);
  const warnedRef = useRef(false);

  useEffect(() => {
    let battery: BatteryManager | null = null;

    const update = () => {
      if (!battery) return;
      const level = Math.round(battery.level * 100);
      setPercent(level);
      setIsCharging(battery.charging);

      if (level <= 15 && !battery.charging && !warnedRef.current) {
        warnedRef.current = true;
        toast({
          title: '⚠️ Low Battery',
          description: `Battery is at ${level}%. Please charge the device.`,
          variant: 'destructive',
        });
      }
      if (level > 15) {
        warnedRef.current = false;
      }
    };

    const init = async () => {
      try {
        battery = await (navigator as any).getBattery();
        update();
        battery!.addEventListener('levelchange', update);
        battery!.addEventListener('chargingchange', update);
      } catch {
        // Battery API not available
      }
    };

    init();

    return () => {
      if (battery) {
        battery.removeEventListener('levelchange', update);
        battery.removeEventListener('chargingchange', update);
      }
    };
  }, []);

  return { percent, isCharging };
}
