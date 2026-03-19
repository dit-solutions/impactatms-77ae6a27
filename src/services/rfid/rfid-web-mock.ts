import type { 
  MivantaRfidPlugin, 
  RfidTagData, 
  ConnectionResult, 
  SingleReadResult, 
  TagDetailsResult,
  ScanningResult, 
  PowerResult, 
  RfidStatus,
  DebugInfoResult,
  ModeResult,
  TriggerEventData,
  TriggerScanResult,
  KeyEventData,
  TriggerKeyCodesResult
} from './mivanta-rfid-plugin';

type TagListenerCallback = (data: RfidTagData) => void;
type TriggerListenerCallback = (data: TriggerEventData) => void;
type TriggerScanResultCallback = (data: TriggerScanResult) => void;
type KeyEventCallback = (data: KeyEventData) => void;

/**
 * Web mock implementation for development/testing
 * Simulates RFID reader behavior when running in browser
 */
export class MivantaRfidWeb implements MivantaRfidPlugin {
  private connected = false;
  private scanning = false;
  private power = 30;
  private mode = 'single';
  private tagListeners: TagListenerCallback[] = [];
  private triggerPressedListeners: TriggerListenerCallback[] = [];
  private triggerReleasedListeners: TriggerListenerCallback[] = [];
  private triggerScanResultListeners: TriggerScanResultCallback[] = [];
  private keyEventListeners: KeyEventCallback[] = [];
  private scanInterval: ReturnType<typeof setInterval> | null = null;

  // Mock FASTag data with realistic TID, EPC, and User data
  private mockFastTags = [
    {
      tid: 'E200341234567890ABCD',
      epc: '3034E28011052D1234567890',
      userData: '4D48415241534854524131323334353637383930'
    },
    {
      tid: 'E2003412FEDCBA987654',
      epc: '3034E28011052D0987654321',
      userData: '44454C4849313233343536373839304142434445'
    },
    {
      tid: 'E20034AABBCCDD112233',
      epc: '3034E28011052DAABBCCDDEE',
      userData: '55505241353030313233343536373839414243'
    },
    {
      tid: 'E200341122334455AABB',
      epc: '3034E28011052D5566778899',
      userData: '4752414A3132333435363738393041424344'
    },
    {
      tid: 'E20034FFEEDDCCBBAA99',
      epc: '3034E28011052DDEADBEEF12',
      userData: '544E3132333435363738393041424344454647'
    }
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
    
    const tag = this.mockFastTags[Math.floor(Math.random() * this.mockFastTags.length)];
    return {
      success: true,
      epc: tag.epc,
      rssi: -45 + Math.floor(Math.random() * 20),
      timestamp: Date.now()
    };
  }

  async readTagDetails(): Promise<TagDetailsResult> {
    if (!this.connected) {
      throw new Error('Reader not connected');
    }
    
    console.log('[RFID Mock] Reading tag details (TID/EPC/User)...');
    await this.delay(800); // Longer delay for multi-bank read
    
    const tag = this.mockFastTags[Math.floor(Math.random() * this.mockFastTags.length)];
    const result: TagDetailsResult = {
      success: true,
      tid: tag.tid,
      epc: tag.epc,
      userData: tag.userData,
      rssi: -45 + Math.floor(Math.random() * 20),
      timestamp: Date.now()
    };
    
    console.log('[RFID Mock] Tag details:', result);
    return result;
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
        const tag = this.mockFastTags[Math.floor(Math.random() * this.mockFastTags.length)];
        const tagData: RfidTagData = {
          epc: tag.epc,
          rssi: -45 + Math.floor(Math.random() * 20),
          count: 1,
          timestamp: Date.now()
        };
        
        console.log('[RFID Mock] Tag detected:', tagData.epc);
        this.tagListeners.forEach(listener => listener(tagData));
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

  async setMode(options: { mode: string }): Promise<ModeResult> {
    console.log('[RFID Mock] Setting mode to:', options.mode);
    this.mode = options.mode;
    return { mode: options.mode };
  }

  async getStatus(): Promise<RfidStatus> {
    return {
      connected: this.connected,
      scanning: this.scanning,
      power: this.power,
      mode: this.mode
    };
  }

  async getDebugInfo(): Promise<DebugInfoResult> {
    return {
      sdkAvailable: true,
      nativeLibsLoaded: true,
      isConnected: this.connected,
      methods: 'Web Mock - No native SDK methods available\n\nThis is a browser simulation. Deploy to a real device to see actual SDK methods.',
      currentMode: this.mode
    };
  }

  async addListener(
    eventName: 'tagDetected' | 'triggerPressed' | 'triggerReleased' | 'triggerScanResult',
    listenerFunc: TagListenerCallback | TriggerListenerCallback | TriggerScanResultCallback
  ): Promise<{ remove: () => void }> {
    if (eventName === 'tagDetected') {
      this.tagListeners.push(listenerFunc as TagListenerCallback);
      return {
        remove: () => {
          const index = this.tagListeners.indexOf(listenerFunc as TagListenerCallback);
          if (index > -1) {
            this.tagListeners.splice(index, 1);
          }
        }
      };
    } else if (eventName === 'triggerPressed') {
      this.triggerPressedListeners.push(listenerFunc as TriggerListenerCallback);
      return {
        remove: () => {
          const index = this.triggerPressedListeners.indexOf(listenerFunc as TriggerListenerCallback);
          if (index > -1) {
            this.triggerPressedListeners.splice(index, 1);
          }
        }
      };
    } else if (eventName === 'triggerReleased') {
      this.triggerReleasedListeners.push(listenerFunc as TriggerListenerCallback);
      return {
        remove: () => {
          const index = this.triggerReleasedListeners.indexOf(listenerFunc as TriggerListenerCallback);
          if (index > -1) {
            this.triggerReleasedListeners.splice(index, 1);
          }
        }
      };
    } else if (eventName === 'triggerScanResult') {
      this.triggerScanResultListeners.push(listenerFunc as TriggerScanResultCallback);
      return {
        remove: () => {
          const index = this.triggerScanResultListeners.indexOf(listenerFunc as TriggerScanResultCallback);
          if (index > -1) {
            this.triggerScanResultListeners.splice(index, 1);
          }
        }
      };
    }
    return { remove: () => {} };
  }

  async removeAllListeners(): Promise<void> {
    this.tagListeners = [];
    this.triggerPressedListeners = [];
    this.triggerReleasedListeners = [];
    this.triggerScanResultListeners = [];
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
