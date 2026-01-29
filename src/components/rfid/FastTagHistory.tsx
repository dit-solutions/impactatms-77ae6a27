import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Tag, Trash2, Clock, CreditCard } from 'lucide-react';
import type { FastTagData } from '@/services/rfid';

interface FastTagHistoryProps {
  tags: FastTagData[];
  onClear: () => void;
  onTagClick?: (tag: FastTagData) => void;
  maxHeight?: string;
}

/**
 * Format hex string in groups of 4 for readability
 */
const formatHex = (hex: string, groupSize = 4) => {
  if (!hex) return '—';
  return hex.match(new RegExp(`.{1,${groupSize}}`, 'g'))?.join(' ') || hex;
};

/**
 * Try to decode hex to ASCII (for User data)
 */
const hexToAscii = (hex: string): string => {
  if (!hex) return '';
  let ascii = '';
  for (let i = 0; i < hex.length; i += 2) {
    const charCode = parseInt(hex.substring(i, i + 2), 16);
    // Only include printable ASCII characters
    if (charCode >= 32 && charCode <= 126) {
      ascii += String.fromCharCode(charCode);
    } else {
      ascii += '.';
    }
  }
  return ascii;
};

/**
 * Scrollable list showing detected FASTag data with TID, EPC, and User fields
 */
export const FastTagHistory = React.forwardRef<HTMLDivElement, FastTagHistoryProps>(({ 
  tags, 
  onClear, 
  onTagClick,
  maxHeight = '400px' 
}, ref) => {
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  if (tags.length === 0) {
    return (
      <div className="p-8 text-center border rounded-lg bg-card">
        <CreditCard className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
        <p className="text-sm text-muted-foreground">No FASTags detected yet</p>
        <p className="text-xs text-muted-foreground/70 mt-1">
          Scan a tag to see TID, EPC, and User data here
        </p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg bg-card">
      <div className="flex items-center justify-between p-3 border-b">
        <div className="flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">FASTag History</span>
          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
            {tags.length}
          </span>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onClear}
          className="h-8 px-2 text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="h-4 w-4 mr-1" />
          Clear
        </Button>
      </div>
      
      <ScrollArea style={{ maxHeight }}>
        <div className="divide-y">
          {tags.map((tag, index) => (
            <div 
              key={`${tag.tid}-${tag.timestamp}-${index}`}
              className={`p-4 hover:bg-muted/50 transition-colors ${onTagClick ? 'cursor-pointer' : ''}`}
              onClick={() => onTagClick?.(tag)}
            >
              {/* Header with time and RSSI */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-primary" />
                  <span className="text-xs font-medium text-primary">FASTag #{tags.length - index}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  {tag.rssi !== undefined && (
                    <span className="bg-muted px-2 py-0.5 rounded">
                      {tag.rssi} dBm
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatTime(tag.timestamp)}
                  </span>
                </div>
              </div>
              
              {/* TID */}
              <div className="mb-2">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  TID (Tag ID)
                </span>
                <code className="block text-xs font-mono text-foreground mt-1 bg-muted/50 p-2 rounded break-all">
                  {formatHex(tag.tid)}
                </code>
              </div>
              
              {/* EPC */}
              <div className="mb-2">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  EPC (Vehicle ID)
                </span>
                <code className="block text-xs font-mono text-foreground mt-1 bg-muted/50 p-2 rounded break-all">
                  {formatHex(tag.epc)}
                </code>
              </div>
              
              {/* User Data */}
              <div>
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  User Data
                </span>
                <code className="block text-xs font-mono text-foreground mt-1 bg-muted/50 p-2 rounded break-all">
                  {formatHex(tag.userData)}
                </code>
                {tag.userData && (
                  <div className="text-xs text-muted-foreground mt-1">
                    ASCII: <span className="font-mono">{hexToAscii(tag.userData)}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
});
FastTagHistory.displayName = "FastTagHistory";
