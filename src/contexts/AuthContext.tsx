// Auth Context - Provides authentication state and actions
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User, AuthState, CreateUserData, UpdateUserData, LockoutState, DeviceConfig } from '@/types/auth';
import { authService } from '@/services/auth';

interface AuthContextType extends AuthState {
  // Actions
  login: (userId: string, pin: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  initializeSuperAdmin: (name: string, pin: string, email?: string, deviceConfig?: DeviceConfig) => Promise<User>;
  
  // User management
  users: User[];
  refreshUsers: () => void;
  createUser: (data: CreateUserData) => Promise<User>;
  updateUser: (userId: string, data: UpdateUserData) => Promise<User>;
  archiveUser: (userId: string) => void;
  deleteUser: (userId: string) => void;
  
  // Lockout
  lockoutState: LockoutState;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isInitialized: false
  });
  const [users, setUsers] = useState<User[]>([]);
  const [lockoutState, setLockoutState] = useState<LockoutState>({ isLocked: false, attemptCount: 0 });

  // Initialize on mount
  useEffect(() => {
    const isInit = authService.isInitialized();
    const currentUser = authService.getCurrentUser();
    
    setState({
      user: currentUser,
      isAuthenticated: !!currentUser,
      isInitialized: isInit
    });

    if (isInit) {
      setUsers(authService.getUsers());
    }
    
    setLockoutState(authService.getLockoutStatus());
  }, []);

  const refreshUsers = useCallback(() => {
    setUsers(authService.getUsers());
  }, []);

  const login = useCallback(async (userId: string, pin: string) => {
    const result = await authService.login(userId, pin);
    setLockoutState(authService.getLockoutStatus());
    
    if (result.success && result.user) {
      setState({
        user: result.user,
        isAuthenticated: true,
        isInitialized: true
      });
      refreshUsers();
      return { success: true };
    }
    
    return { success: false, error: result.error };
  }, [refreshUsers]);

  const logout = useCallback(() => {
    authService.logout();
    setState(prev => ({
      ...prev,
      user: null,
      isAuthenticated: false
    }));
  }, []);

  const initializeSuperAdmin = useCallback(async (name: string, pin: string, email?: string, deviceConfig?: DeviceConfig) => {
    const user = await authService.initializeSuperAdmin(name, pin, email, deviceConfig);
    setState({
      user,
      isAuthenticated: true,
      isInitialized: true
    });
    refreshUsers();
    return user;
  }, [refreshUsers]);

  const createUser = useCallback(async (data: CreateUserData) => {
    if (!state.user) throw new Error('Not authenticated');
    const newUser = await authService.createUser(data, state.user.id);
    refreshUsers();
    return newUser;
  }, [state.user, refreshUsers]);

  const updateUser = useCallback(async (userId: string, data: UpdateUserData) => {
    if (!state.user) throw new Error('Not authenticated');
    const updated = await authService.updateUser(userId, data, state.user.id);
    
    // If updated self, refresh state
    if (userId === state.user.id) {
      setState(prev => ({ ...prev, user: updated }));
    }
    
    refreshUsers();
    return updated;
  }, [state.user, refreshUsers]);

  const archiveUser = useCallback((userId: string) => {
    if (!state.user) return;
    authService.archiveUser(userId, state.user.id);
    refreshUsers();
  }, [state.user, refreshUsers]);

  const deleteUser = useCallback((userId: string) => {
    if (!state.user) return;
    authService.deleteUser(userId, state.user.id);
    refreshUsers();
  }, [state.user, refreshUsers]);

  const value: AuthContextType = {
    ...state,
    login,
    logout,
    initializeSuperAdmin,
    users,
    refreshUsers,
    createUser,
    updateUser,
    archiveUser,
    deleteUser,
    lockoutState
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within AuthProvider');
  }
  return context;
}
