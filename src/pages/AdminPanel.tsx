import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Shield, Key, Copy, Check, AlertCircle, Smartphone, Lock } from 'lucide-react';
import { PinInput } from '@/components/auth/PinInput';
import { hashPin, verifyStoredPin, generateDeterministicCode } from '@/services/auth/auth-service';

const ADMIN_MASTER_KEY = 'impact_admin_master_hash';

export default function AdminPanel() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [deviceId, setDeviceId] = useState('');
  const [unlockCode, setUnlockCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [codeExpiry, setCodeExpiry] = useState<Date | null>(null);

  const handlePinSubmit = async () => {
    if (pin.length !== 6) {
      setPinError('PIN must be 6 digits');
      return;
    }

    // Verify against stored Super Admin PIN
    // For web-based admin, we use a master PIN stored in localStorage on first setup
    const storedAdminHash = localStorage.getItem(ADMIN_MASTER_KEY);
    
    if (!storedAdminHash) {
      // First time setup - store this PIN as the master admin PIN
      const hash = await hashPin(pin);
      localStorage.setItem(ADMIN_MASTER_KEY, hash);
      setIsAuthenticated(true);
      setPinError('');
    } else {
      // Verify PIN
      const isValid = await verifyStoredPin(pin, storedAdminHash);
      if (isValid) {
        setIsAuthenticated(true);
        setPinError('');
      } else {
        setPinError('Invalid PIN');
      }
    }
    setPin('');
  };

  const generateUnlockCode = () => {
    if (!deviceId.trim()) return;

    // Use current lockout ID (simplified - just use a counter that increments)
    const lockoutId = 1; // In a real scenario, this would be communicated by the locked device
    const code = generateDeterministicCode(deviceId.trim().toUpperCase(), lockoutId);
    setUnlockCode(code);
    
    // Calculate expiry (30 minutes from now)
    const expiry = new Date();
    expiry.setMinutes(expiry.getMinutes() + 30);
    setCodeExpiry(expiry);
  };

  const copyToClipboard = async () => {
    if (!unlockCode) return;
    await navigator.clipboard.writeText(unlockCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Shield className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Admin Access</CardTitle>
            <CardDescription>
              Enter your Super Admin PIN to access remote device management
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="admin-pin">Super Admin PIN</Label>
              <PinInput
                value={pin}
                onChange={setPin}
                length={6}
              />
              {pinError && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {pinError}
                </p>
              )}
            </div>
            <Button 
              onClick={handlePinSubmit} 
              className="w-full"
              disabled={pin.length !== 6}
            >
              <Key className="w-4 h-4 mr-2" />
              Authenticate
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              First-time users: The PIN you enter will become your master admin PIN.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Remote Admin Panel</h1>
          <p className="text-muted-foreground">
            Generate unlock codes for locked devices remotely
          </p>
          <Badge variant="outline" className="mt-2">
            <Shield className="w-3 h-3 mr-1" />
            Super Admin Access
          </Badge>
        </div>

        {/* Device Unlock Generator */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Generate Device Unlock Code
            </CardTitle>
            <CardDescription>
              Enter the Device ID shown on the locked device's screen
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="deviceId">Device ID</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="deviceId"
                    placeholder="e.g., IMPACT-001"
                    value={deviceId}
                    onChange={(e) => setDeviceId(e.target.value.toUpperCase())}
                    className="pl-10 uppercase"
                  />
                </div>
                <Button onClick={generateUnlockCode} disabled={!deviceId.trim()}>
                  Generate
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                The user will read this ID from their locked device screen
              </p>
            </div>

            {unlockCode && (
              <div className="p-4 bg-muted rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Unlock Code:</span>
                  <Badge variant="secondary" className="text-xs">
                    Valid for ~30 min
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 text-center">
                    <span className="text-4xl font-mono font-bold tracking-[0.5em] text-primary">
                      {unlockCode}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={copyToClipboard}
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                {codeExpiry && (
                  <p className="text-xs text-muted-foreground text-center">
                    Expires around {codeExpiry.toLocaleTimeString()}
                  </p>
                )}
              </div>
            )}

            <div className="p-3 bg-accent/50 rounded-lg">
              <h4 className="text-sm font-medium mb-1">
                How it works:
              </h4>
              <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                <li>User at locked device calls/texts you with their Device ID</li>
                <li>Enter the Device ID above and click Generate</li>
                <li>Give them the 6-digit code to enter on their device</li>
                <li>Code is valid for approximately 30 minutes</li>
              </ol>
            </div>
          </CardContent>
        </Card>

        {/* Logout */}
        <div className="text-center">
          <Button 
            variant="ghost" 
            onClick={() => setIsAuthenticated(false)}
          >
            Lock Admin Panel
          </Button>
        </div>
      </div>
    </div>
  );
}
