import React from 'react';
import { RfidReaderPanel, RfidDebugPanel } from '@/components/rfid';
import { AppVersionBadge } from '@/components/app/AppVersionBadge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Scan, Bug } from 'lucide-react';
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
        
        <Tabs defaultValue="scanner" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="scanner">
              <Scan className="h-4 w-4 mr-2" />
              Scanner
            </TabsTrigger>
            <TabsTrigger value="debug">
              <Bug className="h-4 w-4 mr-2" />
              Debug
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="scanner">
            <RfidReaderPanel onTagDetected={handleTagDetected} />
          </TabsContent>
          
          <TabsContent value="debug">
            <RfidDebugPanel />
          </TabsContent>
        </Tabs>
        
        <footer className="mt-6 text-center text-xs text-muted-foreground space-y-3">
          <p>Connected to Mivanta UHF SDK v1.1.0</p>
          <AppVersionBadge />
        </footer>
      </div>
    </div>
  );
};

export default Index;
