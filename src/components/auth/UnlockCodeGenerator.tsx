import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { KeyRound, Copy, Check, RefreshCw, Shield, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface UnlockCodeGeneratorProps {
  className?: string;
}

// This uses the same algorithm as auth-service but allows Super Admin to generate
// codes for any device+lockout combination
async function generateUnlockCodeForDevice(lockoutId: string, deviceId: string): Promise<string> {
  const UNLOCK_CODE_VALIDITY_MS = 30 * 60 * 1000; // 30 minutes - must match auth-service
  const timeWindow = Math.floor(Date.now() / UNLOCK_CODE_VALIDITY_MS);
  const input = `${lockoutId}:${deviceId}:${timeWindow}:impact_unlock_salt`;
  
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  
  // Take first 6 digits from hash - same algorithm as auth-service
  const code = hashArray.slice(0, 3).map(b => (b % 10).toString()).join('') +
               hashArray.slice(3, 6).map(b => (b % 10).toString()).join('');
  return code;
}

export function UnlockCodeGenerator({ className }: UnlockCodeGeneratorProps) {
  const [deviceId, setDeviceId] = useState('');
  const [lockoutId, setLockoutId] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [expiresIn, setExpiresIn] = useState(30);
  const [isGenerating, setIsGenerating] = useState(false);

  // Countdown timer for code expiry
  useEffect(() => {
    if (!generatedCode) return;
    
    const interval = setInterval(() => {
      setExpiresIn(prev => {
        if (prev <= 1) {
          setGeneratedCode('');
          return 30;
        }
        return prev - 1;
      });
    }, 60000); // Every minute

    return () => clearInterval(interval);
  }, [generatedCode]);

  const handleGenerate = async () => {
    if (!deviceId.trim()) {
      toast.error('Device ID is required');
      return;
    }

    setIsGenerating(true);
    try {
      // Use the provided lockoutId or generate based on current time if not provided
      const effectiveLockoutId = lockoutId.trim() || `lockout_${Date.now()}`;
      const code = await generateUnlockCodeForDevice(effectiveLockoutId, deviceId.trim());
      setGeneratedCode(code);
      setExpiresIn(30);
      toast.success('Unlock code generated');
    } catch (err) {
      toast.error('Failed to generate code');
    } finally {
      setIsGenerating(false);
    }
  };

  const copyCode = async () => {
    if (generatedCode) {
      await navigator.clipboard.writeText(generatedCode);
      setCopied(true);
      toast.success('Code copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-full bg-primary/10">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle>Generate Unlock Code</CardTitle>
            <CardDescription>
              Create a one-time code to unlock a locked device
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <KeyRound className="h-4 w-4" />
          <AlertDescription>
            When a device is locked due to failed login attempts, the user will see 
            their Device ID on screen. Enter it here to generate an unlock code.
          </AlertDescription>
        </Alert>

        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="deviceId">Device ID *</Label>
            <Input
              id="deviceId"
              placeholder="e.g., IMPACT-001"
              value={deviceId}
              onChange={(e) => setDeviceId(e.target.value.toUpperCase())}
            />
            <p className="text-xs text-muted-foreground">
              The user will provide this from their locked device screen (format: PREFIX-NUMBER)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="lockoutId">Lockout ID (optional)</Label>
            <Input
              id="lockoutId"
              placeholder="Auto-generated if not provided"
              value={lockoutId}
              onChange={(e) => setLockoutId(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Usually not needed - leave blank unless user provides it
            </p>
          </div>
        </div>

        <Button 
          onClick={handleGenerate} 
          className="w-full"
          disabled={!deviceId.trim() || isGenerating}
        >
          {isGenerating ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <KeyRound className="h-4 w-4 mr-2" />
              Generate Unlock Code
            </>
          )}
        </Button>

        {/* Generated Code Display */}
        {generatedCode && (
          <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Unlock Code:</span>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                Expires in ~{expiresIn}m
              </div>
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-center text-3xl font-mono tracking-[0.3em] py-3 bg-background rounded border">
                {generatedCode}
              </code>
              <Button
                variant="outline"
                size="icon"
                onClick={copyCode}
                className="h-12 w-12"
              >
                {copied ? (
                  <Check className="h-5 w-5 text-primary" />
                ) : (
                  <Copy className="h-5 w-5" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Share this code with the user to unlock their device
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
