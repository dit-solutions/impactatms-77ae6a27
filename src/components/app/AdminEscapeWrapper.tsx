import React, { useRef, useState, useCallback } from 'react';
import { AdminEscape } from '@/services/admin-escape-plugin';
import { toast } from '@/hooks/use-toast';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';

interface AdminEscapeWrapperProps {
  children: React.ReactNode;
}

const AdminEscapeWrapper: React.FC<AdminEscapeWrapperProps> = ({ children }) => {
  const [showConfirm, setShowConfirm] = useState(false);
  const tapCount = useRef(0);
  const lastTap = useRef(0);

  const handleTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTap.current < 3000) {
      tapCount.current += 1;
    } else {
      tapCount.current = 1;
    }
    lastTap.current = now;

    if (tapCount.current >= 10) {
      tapCount.current = 0;
      setShowConfirm(true);
    }
  }, []);

  const handleExitKiosk = async () => {
    try {
      await AdminEscape.exitKiosk();
      toast({ title: 'Kiosk Mode Exited', description: 'Device is now unlocked' });
    } catch (err) {
      toast({ title: 'Error', description: String(err), variant: 'destructive' });
    }
    setShowConfirm(false);
  };

  return (
    <>
      <div onClick={handleTap} className="cursor-default select-none">
        {children}
      </div>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Exit Kiosk Mode?</AlertDialogTitle>
            <AlertDialogDescription>
              This will unpin the app and allow access to the device home screen and other apps.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleExitKiosk}>Exit Kiosk</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default AdminEscapeWrapper;
