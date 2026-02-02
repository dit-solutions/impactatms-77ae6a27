import { useAuthContext } from '@/contexts/AuthContext';

// Re-export the context hook for convenience
export function useAuth() {
  return useAuthContext();
}
