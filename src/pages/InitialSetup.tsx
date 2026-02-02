import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PinInput, NumericKeypad } from '@/components/auth/PinInput';
import { Shield, CheckCircle2 } from 'lucide-react';
import logoLight from '@/assets/logo-light.png';

export default function InitialSetup() {
  const navigate = useNavigate();
  const { initializeSuperAdmin, isInitialized } = useAuth();
  
  const [step, setStep] = useState<'name' | 'email' | 'pin' | 'confirm'>('name');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If already initialized, redirect
  React.useEffect(() => {
    if (isInitialized) {
      navigate('/login', { replace: true });
    }
  }, [isInitialized, navigate]);

  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) {
      setError('Name must be at least 2 characters');
      return;
    }
    setError('');
    setStep('email');
  };

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError('Please enter a valid email address');
      return;
    }
    setError('');
    setStep('pin');
  };

  const handlePinComplete = (enteredPin: string) => {
    if (step === 'pin') {
      setPin(enteredPin);
      setStep('confirm');
    } else if (step === 'confirm') {
      setConfirmPin(enteredPin);
      handleFinalSubmit(enteredPin);
    }
  };

  const handleFinalSubmit = async (confirmedPin: string) => {
    if (pin !== confirmedPin) {
      setError('PINs do not match. Please try again.');
      setConfirmPin('');
      setStep('pin');
      setPin('');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await initializeSuperAdmin(name.trim(), pin, email.trim());
      navigate('/', { replace: true });
    } catch (err) {
      setError('Failed to create Super Admin. Please try again.');
      setIsSubmitting(false);
    }
  };

  const handleKeypadDigit = (digit: string) => {
    if (step === 'pin' && pin.length < 6) {
      const newPin = pin + digit;
      setPin(newPin);
      if (newPin.length === 6) {
        setTimeout(() => handlePinComplete(newPin), 100);
      }
    } else if (step === 'confirm' && confirmPin.length < 6) {
      const newPin = confirmPin + digit;
      setConfirmPin(newPin);
      if (newPin.length === 6) {
        setTimeout(() => handlePinComplete(newPin), 100);
      }
    }
  };

  const handleKeypadBackspace = () => {
    if (step === 'pin') {
      setPin(prev => prev.slice(0, -1));
    } else if (step === 'confirm') {
      setConfirmPin(prev => prev.slice(0, -1));
    }
  };

  const handleKeypadClear = () => {
    if (step === 'pin') {
      setPin('');
    } else if (step === 'confirm') {
      setConfirmPin('');
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo and Header */}
        <div className="text-center mb-8">
          <img 
            src={logoLight} 
            alt="Impact ATMS" 
            className="h-16 mx-auto mb-4"
          />
          <h1 className="text-2xl font-bold text-foreground">Initial Setup</h1>
          <p className="text-muted-foreground mt-2">
            Create the Super Admin account to get started
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="flex justify-center gap-2 mb-6">
          {['name', 'email', 'pin', 'confirm'].map((s, i) => (
            <div
              key={s}
              className={`h-2 w-12 rounded-full transition-colors ${
                step === s 
                  ? 'bg-primary' 
                  : ['name', 'email', 'pin', 'confirm'].indexOf(step) > i 
                    ? 'bg-primary/60' 
                    : 'bg-muted'
              }`}
            />
          ))}
        </div>

        <Card>
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>
              {step === 'name' && 'Enter Your Name'}
              {step === 'email' && 'Enter Contact Email'}
              {step === 'pin' && 'Create PIN'}
              {step === 'confirm' && 'Confirm PIN'}
            </CardTitle>
            <CardDescription>
              {step === 'name' && 'This will be your Super Admin display name'}
              {step === 'email' && 'Used for lockout notifications and recovery'}
              {step === 'pin' && 'Create a 6-digit PIN for secure access'}
              {step === 'confirm' && 'Re-enter your PIN to confirm'}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {error && (
              <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-lg text-center">
                {error}
              </div>
            )}

            {step === 'name' && (
              <form onSubmit={handleNameSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Display Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g., John Admin"
                    autoFocus
                    autoComplete="off"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={!name.trim()}>
                  Continue
                </Button>
              </form>
            )}

            {step === 'email' && (
              <form onSubmit={handleEmailSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Contact Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="admin@company.com"
                    autoFocus
                    autoComplete="off"
                  />
                  <p className="text-xs text-muted-foreground">
                    This email will be shown to users when the device is locked
                  </p>
                </div>
                <Button type="submit" className="w-full" disabled={!email.trim()}>
                  Continue
                </Button>
              </form>
            )}

            {(step === 'pin' || step === 'confirm') && (
              <div className="space-y-6">
                <PinInput
                  value={step === 'pin' ? pin : confirmPin}
                  onChange={step === 'pin' ? setPin : setConfirmPin}
                  onComplete={handlePinComplete}
                  disabled={isSubmitting}
                  error={!!error}
                  autoFocus
                />

                <NumericKeypad
                  onDigit={handleKeypadDigit}
                  onBackspace={handleKeypadBackspace}
                  onClear={handleKeypadClear}
                  disabled={isSubmitting}
                />

                {step === 'confirm' && (
                  <Button
                    variant="ghost"
                    className="w-full"
                    onClick={() => {
                      setStep('pin');
                      setPin('');
                      setConfirmPin('');
                      setError('');
                    }}
                    disabled={isSubmitting}
                  >
                    Start Over
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Security Note */}
        <p className="text-xs text-muted-foreground text-center mt-6">
          <CheckCircle2 className="inline-block h-3 w-3 mr-1" />
          Your PIN is encrypted and stored securely on this device
        </p>
      </div>
    </div>
  );
}
