import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { QrCode, Camera, Loader2, AlertCircle } from 'lucide-react';
import { useDevice } from '@/contexts/DeviceContext';
import { apiClient } from '@/data/remote/api-client';
import { collectDeviceInfo } from '@/security/device-fingerprint';
import { logger } from '@/utils/logger';
import { toast } from '@/hooks/use-toast';
import logoLight from '@/assets/logo-light.png';

const ProvisioningScreen = () => {
  const { completeProvisioning } = useDevice();
  const [scanning, setScanning] = useState(false);
  const [provisioning, setProvisioning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scannerRef = useRef<any>(null);

  const stopCamera = async () => {
    try {
      if (scannerRef.current) {
        await scannerRef.current.stop();
        scannerRef.current = null;
      }
    } catch {}
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setScanning(false);
  };

  useEffect(() => {
    return () => { stopCamera(); };
  }, []);

  const startCamera = async () => {
    setError(null);
    setScanning(true);

    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      const scanner = new Html5Qrcode('qr-reader');
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          handleQrResult(decodedText);
        },
        () => {
          // QR not found in this frame
        }
      );
    } catch (err) {
      const errMsg = String(err);
      if (errMsg.includes('NotAllowedError') || errMsg.includes('Permission')) {
        setError('Camera permission denied. Please grant camera access in your device Settings → Apps → impactatms → Permissions, then tap "Open Camera" again.');
      } else {
        setError('Could not access camera: ' + errMsg);
      }
      setScanning(false);
      logger.error('Camera access failed: ' + errMsg);
    }
  };

  const handleQrResult = async (text: string) => {
    await stopCamera();
    setProvisioning(true);
    setError(null);

    try {
      let qrData: { backend_url: string; provisioning_token: string };
      try {
        qrData = JSON.parse(text);
      } catch {
        throw new Error('Invalid QR code format. Expected JSON with backend_url and provisioning_token.');
      }

      if (!qrData.backend_url || !qrData.provisioning_token) {
        throw new Error('QR code missing required fields: backend_url, provisioning_token');
      }

      logger.info(`QR scanned — backend: ${qrData.backend_url}`);
      apiClient.setBaseUrl(qrData.backend_url);

      const deviceInfo = await collectDeviceInfo();

      const response = await apiClient.provision({
        provisioning_token: qrData.provisioning_token,
        ...deviceInfo,
      });

      await completeProvisioning(
        response.device_id,
        response.device_token,
        qrData.backend_url,
      );

      toast({
        title: 'Device Provisioned',
        description: `Registered as ${response.device_id}`,
      });

      logger.info(`Provisioning complete — device: ${response.device_id}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      logger.error(`Provisioning failed: ${msg}`);
    } finally {
      setProvisioning(false);
    }
  };

  const handleManualInput = () => {
    const input = prompt('Paste QR JSON ({"backend_url":"...","provisioning_token":"..."})');
    if (input) handleQrResult(input);
  };

  return (
    <div className="min-h-screen bg-background p-4 flex flex-col items-center justify-center">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center">
          <img src={logoLight} alt="Impact ATMS" className="h-12 w-auto mx-auto mb-4 dark:hidden" />
          <h1 className="text-2xl font-bold text-foreground">Device Setup</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Scan the QR code from your admin panel to register this device
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <QrCode className="h-5 w-5 text-primary" />
              Scan Provisioning QR
            </CardTitle>
            <CardDescription>
              Point the camera at the QR code displayed in the web admin panel
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {scanning ? (
              <div className="space-y-3">
                <div id="qr-reader" className="rounded-lg overflow-hidden" />
                <Button variant="secondary" size="sm" className="w-full" onClick={stopCamera}>
                  Cancel
                </Button>
              </div>
            ) : provisioning ? (
              <div className="flex flex-col items-center py-8 gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Registering device...</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div id="qr-reader" />
                <Button onClick={startCamera} className="w-full h-14 text-lg">
                  <Camera className="h-5 w-5 mr-2" />
                  Open Camera
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={handleManualInput}
                >
                  Enter code manually (dev)
                </Button>
              </div>
            )}

            {error && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <div>
                  <span>{error}</span>
                  {apiClient.getBaseUrl() && (
                    <span className="text-xs opacity-70 mt-1 block">
                      Backend: {apiClient.getBaseUrl()}
                    </span>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProvisioningScreen;
