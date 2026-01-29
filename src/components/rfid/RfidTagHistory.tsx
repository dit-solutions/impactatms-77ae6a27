import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Tag, Trash2, Clock } from 'lucide-react';
import type { RfidTagData } from '@/services/rfid';

interface RfidTagHistoryProps {
  tags: RfidTagData[];
  onClear: () => void;
  onTagClick?: (tag: RfidTagData) => void;
  maxHeight?: string;
}

/**
 * Scrollable list showing detected RFID tags
 */
export function RfidTagHistory({ 
  tags, 
  onClear, 
  onTagClick,
  maxHeight = '300px' 
}: RfidTagHistoryProps) {
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatEpc = (epc: string) => {
    // Format EPC in groups of 4 for readability
    return epc.match(/.{1,4}/g)?.join(' ') || epc;
  };

  if (tags.length === 0) {
    return (
      <div className="p-8 text-center border rounded-lg bg-card">
        <Tag className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
        <p className="text-sm text-muted-foreground">No tags detected yet</p>
        <p className="text-xs text-muted-foreground/70 mt-1">
          Scan an RFID tag to see it here
        </p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg bg-card">
      <div className="flex items-center justify-between p-3 border-b">
        <div className="flex items-center gap-2">
          <Tag className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Tag History</span>
          <span className="text-xs bg-muted px-2 py-0.5 rounded-full">
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
              key={`${tag.epc}-${tag.timestamp}-${index}`}
              className={`p-3 hover:bg-muted/50 transition-colors ${onTagClick ? 'cursor-pointer' : ''}`}
              onClick={() => onTagClick?.(tag)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <code className="text-xs font-mono text-primary break-all">
                    {formatEpc(tag.epc)}
                  </code>
                  {tag.rssi !== undefined && (
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-muted-foreground">
                        RSSI: {tag.rssi} dBm
                      </span>
                      {tag.count && tag.count > 1 && (
                        <span className="text-xs text-muted-foreground">
                          ×{tag.count}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
                  <Clock className="h-3 w-3" />
                  {formatTime(tag.timestamp)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
