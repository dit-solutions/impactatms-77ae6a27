// User roles in hierarchy order (higher = more permissions)
export type UserRole = 'operator' | 'supervisor' | 'admin' | 'super_admin';

// Granular permissions for feature access
export type Permission = 
  | 'scanning'
  | 'settings:connect'
  | 'settings:power'
  | 'settings:mode'
  | 'settings:debug'
  | 'user:manage'
  | 'role:manage';

// Role definition with metadata
export interface Role {
  id: UserRole;
  name: string;
  description: string;
  permissions: Permission[];
  isSystem: boolean; // true = cannot be deleted (Super Admin)
  order: number; // For display ordering
}

// User entity
export interface User {
  id: string;
  name: string;
  role: UserRole;
  pinHash: string; // SHA-256 hashed PIN
  isSystem: boolean; // true = Super Admin user, cannot be deleted/demoted
  isArchived: boolean; // Soft delete flag
  createdAt: number;
  lastLogin?: number;
  createdBy?: string; // User ID who created this user
}

// For creating new users
export interface CreateUserData {
  name: string;
  role: UserRole;
  pin: string;
}

// For updating users
export interface UpdateUserData {
  name?: string;
  role?: UserRole;
  pin?: string;
}

// Validation result for delete/modify operations
export interface ValidationResult {
  allowed: boolean;
  reason?: string;
  userCount?: number;
}

// Auth state for context
export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isInitialized: boolean; // Has app been set up with Super Admin?
}

// Login attempt tracking for lockout
export interface LoginAttempt {
  userId: string;
  timestamp: number;
  success: boolean;
}

// Lockout state
export interface LockoutState {
  isLocked: boolean;
  lockedUntil?: number;
  attemptCount: number;
}

// Role definitions with permissions
export const ROLES: Role[] = [
  {
    id: 'super_admin',
    name: 'Super Admin',
    description: 'System owner with full access. Cannot be deleted.',
    permissions: ['scanning', 'settings:connect', 'settings:power', 'settings:mode', 'settings:debug', 'user:manage', 'role:manage'],
    isSystem: true,
    order: 0
  },
  {
    id: 'admin',
    name: 'Admin',
    description: 'Full system control and user management.',
    permissions: ['scanning', 'settings:connect', 'settings:power', 'settings:mode', 'settings:debug', 'user:manage'],
    isSystem: false,
    order: 1
  },
  {
    id: 'supervisor',
    name: 'Supervisor',
    description: 'Device configuration and monitoring.',
    permissions: ['scanning', 'settings:connect', 'settings:power', 'settings:mode', 'settings:debug'],
    isSystem: false,
    order: 2
  },
  {
    id: 'operator',
    name: 'Operator',
    description: 'Tag scanning only.',
    permissions: ['scanning'],
    isSystem: false,
    order: 3
  }
];

// Role-permission mapping for quick lookups
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  operator: ['scanning'],
  supervisor: ['scanning', 'settings:connect', 'settings:power', 'settings:mode', 'settings:debug'],
  admin: ['scanning', 'settings:connect', 'settings:power', 'settings:mode', 'settings:debug', 'user:manage'],
  super_admin: ['scanning', 'settings:connect', 'settings:power', 'settings:mode', 'settings:debug', 'user:manage', 'role:manage']
};

// Role hierarchy for permission inheritance
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  operator: 0,
  supervisor: 1,
  admin: 2,
  super_admin: 3
};

// Get role by ID
export function getRole(roleId: UserRole): Role | undefined {
  return ROLES.find(r => r.id === roleId);
}

// Check if role has permission
export function roleHasPermission(roleId: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[roleId]?.includes(permission) ?? false;
}

// Get roles a user can create based on their role
export function getCreatableRoles(userRole: UserRole): UserRole[] {
  const userLevel = ROLE_HIERARCHY[userRole];
  
  if (userRole === 'super_admin') {
    // Super Admin can create all roles except super_admin
    return ['admin', 'supervisor', 'operator'];
  }
  
  if (userRole === 'admin') {
    // Admin can create supervisor and operator only
    return ['supervisor', 'operator'];
  }
  
  return [];
}

// Check if user can manage another user based on role hierarchy
export function canManageUser(managerRole: UserRole, targetRole: UserRole): boolean {
  // Super admin cannot be managed by anyone
  if (targetRole === 'super_admin') return false;
  
  // Only super_admin can manage admins
  if (targetRole === 'admin' && managerRole !== 'super_admin') return false;
  
  return ROLE_HIERARCHY[managerRole] > ROLE_HIERARCHY[targetRole];
}
