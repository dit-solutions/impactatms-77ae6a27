import { useMemo } from 'react';
import { useAuth } from './use-auth';
import type { Permission, UserRole } from '@/types/auth';
import { ROLE_PERMISSIONS, roleHasPermission, canManageUser, getCreatableRoles } from '@/types/auth';

export function usePermissions() {
  const { user, isAuthenticated } = useAuth();

  const permissions = useMemo(() => {
    if (!user) return [];
    return ROLE_PERMISSIONS[user.role] || [];
  }, [user]);

  const hasPermission = useMemo(() => {
    return (permission: Permission): boolean => {
      if (!user) return false;
      return roleHasPermission(user.role, permission);
    };
  }, [user]);

  const hasAnyPermission = useMemo(() => {
    return (...perms: Permission[]): boolean => {
      if (!user) return false;
      return perms.some(p => roleHasPermission(user.role, p));
    };
  }, [user]);

  const hasAllPermissions = useMemo(() => {
    return (...perms: Permission[]): boolean => {
      if (!user) return false;
      return perms.every(p => roleHasPermission(user.role, p));
    };
  }, [user]);

  const canManage = useMemo(() => {
    return (targetRole: UserRole): boolean => {
      if (!user) return false;
      return canManageUser(user.role, targetRole);
    };
  }, [user]);

  const creatableRoles = useMemo(() => {
    if (!user) return [];
    return getCreatableRoles(user.role);
  }, [user]);

  // Convenience checks
  const canAccessSettings = useMemo(() => {
    return hasAnyPermission('settings:connect', 'settings:power', 'settings:mode', 'settings:debug');
  }, [hasAnyPermission]);

  const canManageUsers = useMemo(() => {
    return hasPermission('user:manage');
  }, [hasPermission]);

  const isSuperAdmin = useMemo(() => {
    return user?.role === 'super_admin';
  }, [user]);

  const isAdmin = useMemo(() => {
    return user?.role === 'admin' || user?.role === 'super_admin';
  }, [user]);

  return {
    permissions,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    canManage,
    creatableRoles,
    canAccessSettings,
    canManageUsers,
    isSuperAdmin,
    isAdmin,
    role: user?.role,
    isAuthenticated
  };
}
