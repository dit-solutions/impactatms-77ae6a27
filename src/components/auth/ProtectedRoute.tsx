import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';
import { usePermissions } from '@/hooks/use-permissions';
import type { Permission } from '@/types/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  permissions?: Permission[];
  requireAll?: boolean; // If true, user must have ALL permissions. Default: any one.
  requireAuth?: boolean; // If true, user must be logged in. Default: false for open access
  fallbackPath?: string;
}

export function ProtectedRoute({
  children,
  permissions = [],
  requireAll = false,
  requireAuth = false,
  fallbackPath = '/'
}: ProtectedRouteProps) {
  const { isAuthenticated, isInitialized } = useAuth();
  const { hasPermission, hasAllPermissions, hasAnyPermission } = usePermissions();
  const location = useLocation();

  // Not initialized - redirect to setup
  if (!isInitialized) {
    return <Navigate to="/setup" state={{ from: location }} replace />;
  }

  // Check if authentication is required
  if (requireAuth && !isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check permissions if specified (only applies when user is logged in)
  if (permissions.length > 0 && isAuthenticated) {
    const hasAccess = requireAll 
      ? hasAllPermissions(...permissions)
      : hasAnyPermission(...permissions);
    
    if (!hasAccess) {
      return <Navigate to={fallbackPath} replace />;
    }
  }

  // If permissions specified but not logged in, require login
  if (permissions.length > 0 && !isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

// Wrapper for public routes that should redirect if already authenticated
interface PublicRouteProps {
  children: React.ReactNode;
  redirectTo?: string;
}

export function PublicRoute({ children, redirectTo = '/' }: PublicRouteProps) {
  const { isAuthenticated, isInitialized } = useAuth();

  // If not initialized, let them through to setup
  if (!isInitialized) {
    return <>{children}</>;
  }

  // If authenticated, redirect
  if (isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}
