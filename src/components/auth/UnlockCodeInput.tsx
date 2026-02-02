import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Lock, Mail, Phone, Shield, KeyRound, Copy, Check } from 'lucide-react';
import { authService } from '@/services/auth';
import { toast } from 'sonner';

interface UnlockCodeInputProps {
  onUnlocked: () => void;
  lockoutRemaining: number;
}

export function UnlockCodeInput({ onUnlocked, lockoutRemaining }: UnlockCodeInputProps) {
  const [code, setCode] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState('');
  const [copiedDeviceId, setCopiedDeviceId] = useState(false);

  const superAdminContact = authService.getSuperAdminContact();
  const lockoutInfo = authService.getLockoutInfo();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) {
      setError('Enter 6-digit unlock code');
      return;
    }

    setIsValidating(true);
    setError('');

    try {
      const isValid = await authService.validateUnlockCode(code);
      if (isValid) {
        toast.success('Device unlocked successfully');
        onUnlocked();
      } else {
        setError('Invalid unlock code. Please check with Super Admin.');
        setCode('');
      }
    } catch (err) {
      setError('Failed to validate code');
    } finally {
      setIsValidating(false);
    }
  };

  const copyDeviceId = async () => {
    if (lockoutInfo?.deviceId) {
      await navigator.clipboard.writeText(lockoutInfo.deviceId);
      setCopiedDeviceId(true);
      toast.success('Device ID copied');
      setTimeout(() => setCopiedDeviceId(false), 2000);
    }
  };

  return (
    <div className="space-y-4">
      {/* Lockout Alert */}
      <Alert variant="destructive" className="border-destructive/50 bg-destructive/10">
        <Lock className="h-4 w-4" />
        <AlertTitle>Device Locked</AlertTitle>
        <AlertDescription>
          Too many failed login attempts. Auto-unlock in {lockoutRemaining} minute(s), 
          or contact Super Admin for immediate unlock.
        </AlertDescription>
      </Alert>

      {/* Super Admin Contact Card */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Contact Super Admin</CardTitle>
          </div>
          <CardDescription>
            Request an unlock code from the system administrator
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {superAdminContact ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium">{superAdminContact.name}</span>
              </div>
              {superAdminContact.email && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <a 
                    href={`mailto:${superAdminContact.email}?subject=Device Unlock Request&body=Device ID: ${lockoutInfo?.deviceId || 'Unknown'}`}
                    className="text-primary hover:underline"
                  >
                    {superAdminContact.email}
                  </a>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Super Admin contact not available
            </p>
          )}

          {/* Device ID for reference */}
          {lockoutInfo?.deviceId && (
            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground mb-1">Your Device ID:</p>
              <div className="flex items-center gap-2">
                <code className="text-xs bg-muted px-2 py-1 rounded flex-1 truncate">
                  {lockoutInfo.deviceId}
                </code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={copyDeviceId}
                  className="h-7 w-7 p-0"
                >
                  {copiedDeviceId ? (
                    <Check className="h-3 w-3 text-primary" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Unlock Code Entry */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Enter Unlock Code</CardTitle>
          </div>
          <CardDescription>
            Get a 6-digit code from Super Admin to unlock this device
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                placeholder="000000"
                value={code}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '');
                  setCode(value);
                  setError('');
                }}
                className="text-center text-2xl tracking-[0.5em] font-mono"
                disabled={isValidating}
              />
              {error && (
                <p className="text-sm text-destructive text-center">{error}</p>
              )}
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={code.length !== 6 || isValidating}
            >
              {isValidating ? 'Validating...' : 'Unlock Device'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
