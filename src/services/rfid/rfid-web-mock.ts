import type { 
  MivantaRfidPlugin, 
  RfidTagData, 
  ConnectionResult, 
  SingleReadResult, 
  ScanningResult, 
  PowerResult, 
  RfidStatus 
} from './mivanta-rfid-plugin';

type ListenerCallback = (data: RfidTagData) => void;

/**
 * Web mock implementation for development/testing
 * Simulates RFID reader behavior when running in browser
 */
export class MivantaRfidWeb implements MivantaRfidPlugin {
  private connected = false;
  private scanning = false;
  private power = 30;
  private listeners: ListenerCallback[] = [];
  private scanInterval: ReturnType<typeof setInterval> | null = null;

  private mockEpcs = [
    'E200001234567890ABCD',
    'E200009876543210EFGH', 
    'E200005555666677778888',
    'E20000AABBCCDDEEFF0011',
    'E20000112233445566AABB'
  ];

  async connect(): Promise<ConnectionResult> {
    console.log('[RFID Mock] Connecting...');
    await this.delay(500);
    this.connected = true;
    return { connected: true, message: 'Mock UHF Reader connected' };
  }

  async disconnect(): Promise<ConnectionResult> {
    console.log('[RFID Mock] Disconnecting...');
    if (this.scanning) {
      await this.stopContinuous();
    }
    this.connected = false;
    return { connected: false, message: 'Mock UHF Reader disconnected' };
  }

  async readSingle(): Promise<SingleReadResult> {
    if (!this.connected) {
      throw new Error('Reader not connected');
    }
    
    console.log('[RFID Mock] Single read...');
    await this.delay(300);
    
    const epc = this.mockEpcs[Math.floor(Math.random() * this.mockEpcs.length)];
    return {
      success: true,
      epc,
      timestamp: Date.now()
    };
  }

  async startContinuous(): Promise<ScanningResult> {
    if (!this.connected) {
      throw new Error('Reader not connected');
    }
    
    if (this.scanning) {
      throw new Error('Already scanning');
    }

    console.log('[RFID Mock] Starting continuous scan...');
    this.scanning = true;

    // Simulate tag reads every 1.5-3 seconds
    this.scanInterval = setInterval(() => {
      if (this.scanning) {
        const tagData: RfidTagData = {
          epc: this.mockEpcs[Math.floor(Math.random() * this.mockEpcs.length)],
          rssi: -45 + Math.floor(Math.random() * 20),
          count: 1,
          timestamp: Date.now()
        };
        
        console.log('[RFID Mock] Tag detected:', tagData.epc);
        this.listeners.forEach(listener => listener(tagData));
      }
    }, 1500 + Math.random() * 1500);

    return { scanning: true, message: 'Mock continuous scanning started' };
  }

  async stopContinuous(): Promise<ScanningResult> {
    console.log('[RFID Mock] Stopping continuous scan...');
    
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
    }
    
    this.scanning = false;
    return { scanning: false, message: 'Mock scanning stopped' };
  }

  async setPower(options: { power: number }): Promise<PowerResult> {
    if (!this.connected) {
      throw new Error('Reader not connected');
    }
    
    const { power } = options;
    if (power < 5 || power > 33) {
      throw new Error('Power must be between 5 and 33 dBm');
    }
    
    console.log('[RFID Mock] Setting power to:', power);
    this.power = power;
    return { power, message: `Mock power set to ${power} dBm` };
  }

  async getStatus(): Promise<RfidStatus> {
    return {
      connected: this.connected,
      scanning: this.scanning,
      power: this.power
    };
  }

  async addListener(
    eventName: 'tagDetected',
    listenerFunc: ListenerCallback
  ): Promise<{ remove: () => void }> {
    if (eventName === 'tagDetected') {
      this.listeners.push(listenerFunc);
      return {
        remove: () => {
          const index = this.listeners.indexOf(listenerFunc);
          if (index > -1) {
            this.listeners.splice(index, 1);
          }
        }
      };
    }
    return { remove: () => {} };
  }

  async removeAllListeners(): Promise<void> {
    this.listeners = [];
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
