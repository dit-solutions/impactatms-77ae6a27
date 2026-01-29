import React from 'react';
import { Link } from 'react-router-dom';
import { RfidReaderPanel } from '@/components/rfid';
import { Button } from '@/components/ui/button';
import { Settings } from 'lucide-react';
import type { RfidTagData } from '@/services/rfid';
import logoLight from '@/assets/logo-light.png';

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
            <div className="flex items-center gap-3">
              <img 
                src={logoLight} 
                alt="Impact ATMS" 
                className="h-10 w-auto dark:hidden"
              />
              <div>
                <h1 className="text-xl font-bold text-secondary">Impact ATMS</h1>
                <p className="text-xs text-muted-foreground">
                  RFID Tag Scanner
                </p>
              </div>
            </div>
            <Button variant="ghost" size="icon" asChild>
              <Link to="/settings">
                <Settings className="h-5 w-5" />
              </Link>
            </Button>
          </div>
        </header>
        
        <RfidReaderPanel onTagDetected={handleTagDetected} />
      </div>
    </div>
  );
};

export default Index;
