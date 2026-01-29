import React from 'react';
import { RfidReaderPanel } from '@/components/rfid';
import { AppVersionBadge } from '@/components/app/AppVersionBadge';
import type { RfidTagData } from '@/services/rfid';

const Index = () => {
  const handleTagDetected = (tag: RfidTagData) => {
    // This is where you integrate with your toll automation API
    console.log('Tag detected - send to API:', tag.epc);
    
    // Example API call (uncomment and modify for your API):
    // fetch('https://your-toll-api.com/vehicle/identify', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ epc: tag.epc, timestamp: tag.timestamp })
    // });
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-md mx-auto">
        <header className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-foreground">Toll RFID Scanner</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Mivanta CX1500N Handheld Reader
          </p>
        </header>
        
        <RfidReaderPanel onTagDetected={handleTagDetected} />
        
        <footer className="mt-6 text-center text-xs text-muted-foreground space-y-3">
          <p>Connected to Mivanta UHF SDK v1.1.0</p>
          <AppVersionBadge />
        </footer>
      </div>
    </div>
  );
};

export default Index;
