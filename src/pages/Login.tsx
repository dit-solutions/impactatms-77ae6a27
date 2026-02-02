import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PinInput, NumericKeypad, UnlockCodeInput } from '@/components/auth';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Lock, AlertCircle, User, Shield } from 'lucide-react';
import { getRole } from '@/types/auth';
import { authService } from '@/services/auth';
import logoLight from '@/assets/logo-light.png';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { users, login, isAuthenticated, isInitialized, lockoutState } = useAuth();
  
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect if not initialized
  useEffect(() => {
    if (!isInitialized) {
      navigate('/setup', { replace: true });
    }
  }, [isInitialized, navigate]);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const from = (location.state as any)?.from?.pathname || '/';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location.state]);

  // Auto-select if only one user
  useEffect(() => {
    if (users.length === 1 && !selectedUserId) {
      setSelectedUserId(users[0].id);
    }
  }, [users, selectedUserId]);

  const selectedUser = users.find(u => u.id === selectedUserId);

  const handlePinComplete = async (enteredPin: string) => {
    if (!selectedUserId) {
      setError('Please select a user');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const result = await login(selectedUserId, enteredPin);
      
      if (!result.success) {
        setError(result.error || 'Login failed');
        setPin('');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
      setPin('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeypadDigit = (digit: string) => {
    if (pin.length < 6) {
      const newPin = pin + digit;
      setPin(newPin);
      if (newPin.length === 6) {
        handlePinComplete(newPin);
      }
    }
  };

  const handleKeypadBackspace = () => {
    setPin(prev => prev.slice(0, -1));
    setError('');
  };

  const handleKeypadClear = () => {
    setPin('');
    setError('');
  };

  const getInitials = (name: string) => 
    name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const isLocked = lockoutState.isLocked;
  const lockoutRemaining = lockoutState.lockedUntil 
    ? Math.ceil((lockoutState.lockedUntil - Date.now()) / 60000)
    : 0;

  const handleUnlocked = () => {
    // Refresh lockout state after unlock
    window.location.reload();
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
          <h1 className="text-2xl font-bold text-foreground">Welcome Back</h1>
          <p className="text-muted-foreground mt-2">
            Enter your PIN to continue
          </p>
        </div>

        <Card>
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
              <Lock className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Sign In</CardTitle>
            <CardDescription>
              Select your account and enter your PIN
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Lockout with Unlock Code Input */}
            {isLocked ? (
              <UnlockCodeInput 
                onUnlocked={handleUnlocked} 
                lockoutRemaining={lockoutRemaining} 
              />
            ) : (
              <>
                {/* Error Message */}
                {error && (
                  <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-lg text-center">
                    {error}
                  </div>
                )}

                {/* User Selection */}
                <div className="space-y-2">
                  <Select 
                    value={selectedUserId} 
                    onValueChange={id => {
                      setSelectedUserId(id);
                      setPin('');
                      setError('');
                    }}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger className="h-auto py-3">
                      <SelectValue placeholder="Select user...">
                        {selectedUser && (
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="bg-primary/20 text-primary text-xs">
                                {getInitials(selectedUser.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="text-left">
                              <p className="font-medium">{selectedUser.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {getRole(selectedUser.role)?.name}
                              </p>
                            </div>
                          </div>
                        )}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {users.map(user => {
                        const role = getRole(user.role);
                        return (
                          <SelectItem key={user.id} value={user.id}>
                            <div className="flex items-center gap-3 py-1">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback className="bg-primary/20 text-primary text-xs">
                                  {getInitials(user.name)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium flex items-center gap-1">
                                  {user.name}
                                  {user.isSystem && <Shield className="h-3 w-3 text-primary" />}
                                </p>
                                <p className="text-xs text-muted-foreground">{role?.name}</p>
                              </div>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                {/* PIN Input */}
                {selectedUserId && (
                  <>
                    <PinInput
                      value={pin}
                      onChange={setPin}
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
                  </>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-xs text-muted-foreground text-center mt-6">
          Impact ATMS • RFID Tag Scanner
        </p>
      </div>
    </div>
  );
}
