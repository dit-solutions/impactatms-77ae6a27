import React from 'react';
import { Link } from 'react-router-dom';
import { RfidReaderPanel, RfidDebugPanel } from '@/components/rfid';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Scan, Bug, Settings } from 'lucide-react';
import type { RfidTagData } from '@/services/rfid';

const Index = () => {
  const handleTagDetected = (tag: RfidTagData) => {
    // This is where you integrate with your toll automation API
    console.log('Tag detected - send to API:', tag.epc);
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-md mx-auto">
        <header className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Toll RFID Scanner</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Mivanta CX1500N Handheld Reader
              </p>
            </div>
            <Button variant="ghost" size="icon" asChild>
              <Link to="/settings">
                <Settings className="h-5 w-5" />
              </Link>
            </Button>
          </div>
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
      </div>
    </div>
  );
};

export default Index;
