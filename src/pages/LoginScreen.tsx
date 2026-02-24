import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, AlertCircle, LogIn } from 'lucide-react';
import { useDevice } from '@/contexts/DeviceContext';
import { apiClient } from '@/data/remote/api-client';
import { logger } from '@/utils/logger';
import logoLight from '@/assets/logo-light.png';

const LoginScreen = () => {
  const { completeLogin } = useDevice();
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedLogin = login.trim();
    if (!trimmedLogin || !password) {
      setError('Please enter your email/phone and password.');
      return;
    }

    setLoading(true);
    try {
      const response = await apiClient.login({ login: trimmedLogin, password });
      await completeLogin(response.user, response.token);
      logger.info(`Login successful for ${response.user.email}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      logger.error(`Login failed: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 flex flex-col items-center justify-center">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center">
          <img src={logoLight} alt="Impact ATMS" className="h-12 w-auto mx-auto mb-4 dark:hidden" />
          <h1 className="text-2xl font-bold text-foreground">Operator Login</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Sign in with your assigned credentials
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <LogIn className="h-5 w-5 text-primary" />
              Sign In
            </CardTitle>
            <CardDescription>
              Enter your email or phone number and password
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login">Email / Phone</Label>
                <Input
                  id="login"
                  type="text"
                  placeholder="user@example.com or 9876543210"
                  value={login}
                  onChange={(e) => setLogin(e.target.value)}
                  disabled={loading}
                  autoComplete="username"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  autoComplete="current-password"
                />
              </div>

              {error && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <Button type="submit" className="w-full h-12 text-lg" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    <LogIn className="h-5 w-5 mr-2" />
                    Sign In
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LoginScreen;
