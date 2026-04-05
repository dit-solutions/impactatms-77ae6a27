import React, { useEffect, useState } from 'react';
import { useDevice } from '@/contexts/DeviceContext';
import logoLight from '@/assets/logo-light.png';

/**
 * Splash screen shown on app start.
 * Checks token → routes to provisioning or scan screen.
 */
const SplashScreen = () => {
  const { deviceState } = useDevice();
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    // Show splash for at least 1.5s
    const timer = setTimeout(() => setShowSplash(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  if (showSplash || deviceState === 'loading') {
    return (
      <div className="min-h-screen bg-secondary flex flex-col items-center justify-center gap-6 pt-[var(--safe-area-top)]">
        <img src={logoLight} alt="Impact ATMS" className="h-16 w-auto" />
        <div className="text-center">
          <h1 className="text-2xl font-bold text-secondary-foreground">Impact ATMS</h1>
          <p className="text-sm text-secondary-foreground/70 mt-1">
            Automated Toll Management
          </p>
        </div>
        <div className="h-1 w-32 bg-primary/30 rounded-full overflow-hidden">
          <div className="h-full w-1/2 bg-primary rounded-full animate-pulse" />
        </div>
      </div>
    );
  }

  // After splash, parent router handles navigation based on deviceState
  return null;
};

export default SplashScreen;
