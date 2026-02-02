

# User Role & Permission (URP) System for Toll Plaza Kiosk

## Overview

Build a local PIN-based authentication system with role-based access control for toll plaza kiosk devices. Users authenticate with a simple 4-6 digit PIN, and their role determines which features they can access.

---

## Role Hierarchy

| Role | Description | Access Level | Deletable |
|------|-------------|--------------|-----------|
| **Super Admin** | System owner, cannot be deleted | All features + User Management | No |
| **Admin** | Full system control | All features + User Management | Yes (if no users) |
| **Supervisor** | Device configuration and monitoring | Scanning + Settings + Debug | Yes (if no users) |
| **Operator** | Tag scanning only | Scanning only | Yes (if no users) |

---

## Permission Matrix

| Feature | Operator | Supervisor | Admin | Super Admin |
|---------|:--------:|:----------:|:-----:|:-----------:|
| RFID Scanning | Yes | Yes | Yes | Yes |
| View Tag History | Yes | Yes | Yes | Yes |
| Settings - Connect/Disconnect | No | Yes | Yes | Yes |
| Settings - Power Level | No | Yes | Yes | Yes |
| Settings - Read Mode | No | Yes | Yes | Yes |
| Settings - Debug Panel | No | Yes | Yes | Yes |
| User Management | No | No | Yes | Yes |
| Role Management | No | No | No | Yes |

---

## Role & User Protection Rules

### Super Admin Protection
- One default Super Admin is created on first app launch
- Super Admin role cannot be deleted from the system
- Super Admin user cannot be deleted or demoted
- Super Admin can create additional Admins who can manage users

### Role Deletion Rules
- Roles with active users cannot be deleted
- Before deleting a role, users must be:
  - Moved to another role, OR
  - Archived (soft deleted), OR
  - Permanently removed
- System shows clear error message with user count when deletion is blocked

```text
Role Deletion Flow:

User clicks "Delete Role"
        |
        v
+-------------------+
| Has active users? |
+-------------------+
    |           |
   Yes          No
    |           |
    v           v
+-------------+  +-----------+
| Show error: |  | Confirm & |
| "X users    |  | Delete    |
| must be     |  +-----------+
| reassigned" |
+-------------+
    |
    v
+------------------+
| Options:         |
| - Move to role   |
| - Archive users  |
| - Delete users   |
+------------------+
```

---

## User Experience Flow

```text
First Launch (Setup)
        |
        v
+------------------------+
|  Initial Setup Screen  |
|  Create Super Admin    |
|  [Enter Name]          |
|  [Set 6-digit PIN]     |
|  [Confirm PIN]         |
+------------------------+
        |
        v
Subsequent Launches
        |
        v
+------------------+
|   Login Screen   |
|   [Select User]  |
|   [Enter PIN]    |
+------------------+
        |
        v (authenticated)
+------------------+
|   Main Scanner   |
|   (UI adapts to  |
|    user's role)  |
+------------------+
```

---

## Architecture

### New Files to Create

| File | Purpose |
|------|---------|
| `src/types/auth.ts` | User, Role, Permission type definitions |
| `src/services/auth/auth-service.ts` | Local PIN storage and verification |
| `src/services/auth/index.ts` | Auth service exports |
| `src/contexts/AuthContext.tsx` | Global auth state provider |
| `src/hooks/use-auth.ts` | Hook for auth actions and state |
| `src/hooks/use-permissions.ts` | Hook for checking feature permissions |
| `src/pages/Login.tsx` | PIN entry login screen |
| `src/pages/InitialSetup.tsx` | First-time Super Admin setup |
| `src/pages/UserManagement.tsx` | Admin page for managing users |
| `src/components/auth/ProtectedRoute.tsx` | Route wrapper for permission checks |
| `src/components/auth/UserMenu.tsx` | Current user display + logout button |
| `src/components/auth/PinInput.tsx` | Reusable 6-digit PIN input component |

### Files to Modify

| File | Changes |
|------|---------|
| `src/App.tsx` | Wrap with AuthProvider, add protected routes |
| `src/pages/Index.tsx` | Add UserMenu, conditional Settings button |
| `src/pages/Settings.tsx` | Permission checks for each section |

---

## Technical Details

### Type Definitions

```typescript
// src/types/auth.ts

export type UserRole = 'super_admin' | 'admin' | 'supervisor' | 'operator';

export type Permission = 
  | 'scanning'
  | 'settings:connect'
  | 'settings:power'
  | 'settings:mode'
  | 'settings:debug'
  | 'user:manage'
  | 'role:manage';

export interface Role {
  id: UserRole;
  name: string;
  permissions: Permission[];
  isSystem: boolean;      // true = cannot be deleted (Super Admin)
  createdAt: number;
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
  pinHash: string;        // SHA-256 hashed
  isSystem: boolean;      // true = Super Admin user, cannot be deleted
  isArchived: boolean;    // Soft delete flag
  createdAt: number;
  lastLogin?: number;
}
```

### Role-Permission Mapping

```typescript
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  operator: ['scanning'],
  supervisor: ['scanning', 'settings:connect', 'settings:power', 'settings:mode', 'settings:debug'],
  admin: ['scanning', 'settings:connect', 'settings:power', 'settings:mode', 'settings:debug', 'user:manage'],
  super_admin: ['scanning', 'settings:connect', 'settings:power', 'settings:mode', 'settings:debug', 'user:manage', 'role:manage']
};
```

### Role Deletion Logic

```typescript
// In auth-service.ts

function canDeleteRole(roleId: UserRole): { allowed: boolean; reason?: string; userCount?: number } {
  // Super Admin role cannot be deleted
  if (roleId === 'super_admin') {
    return { allowed: false, reason: 'System role cannot be deleted' };
  }
  
  // Count active (non-archived) users with this role
  const activeUsers = users.filter(u => u.role === roleId && !u.isArchived);
  
  if (activeUsers.length > 0) {
    return { 
      allowed: false, 
      reason: `${activeUsers.length} active user(s) must be reassigned first`,
      userCount: activeUsers.length
    };
  }
  
  return { allowed: true };
}
```

### User Deletion Protection

```typescript
function canDeleteUser(userId: string): { allowed: boolean; reason?: string } {
  const user = users.find(u => u.id === userId);
  
  if (!user) {
    return { allowed: false, reason: 'User not found' };
  }
  
  // Super Admin user cannot be deleted
  if (user.isSystem) {
    return { allowed: false, reason: 'System user cannot be deleted' };
  }
  
  return { allowed: true };
}
```

---

## User Management Features

### For Super Admin
- Create/edit/delete Admins, Supervisors, Operators
- Archive users (soft delete)
- View all users including archived
- Cannot delete or demote themselves

### For Admin
- Create/edit/delete Supervisors, Operators
- Cannot create other Admins
- Cannot modify Super Admin
- Cannot delete or demote themselves

### User Actions

| Action | Operator | Supervisor | Admin | Super Admin |
|--------|:--------:|:----------:|:-----:|:-----------:|
| View users | No | No | Yes | Yes |
| Create Operator | No | No | Yes | Yes |
| Create Supervisor | No | No | Yes | Yes |
| Create Admin | No | No | No | Yes |
| Edit own PIN | Yes | Yes | Yes | Yes |
| Edit other users | No | No | Yes | Yes |
| Archive users | No | No | Yes | Yes |
| Delete users | No | No | Yes | Yes |
| Delete Super Admin | No | No | No | No |

---

## Security Features

| Feature | Implementation |
|---------|----------------|
| PIN Storage | SHA-256 hashed via Web Crypto API |
| Session | Memory + sessionStorage for tab persistence |
| Lockout | 5 failed attempts = 5-minute lockout |
| Auto-logout | Configurable inactivity timeout |
| Audit Log | Local log of login attempts and user changes |

---

## Initial Setup Flow

1. App launches for first time
2. Detects no users in storage
3. Shows "Initial Setup" screen
4. User creates Super Admin account:
   - Enter display name
   - Set 6-digit PIN
   - Confirm PIN
5. Super Admin logged in automatically
6. Can now add other users from User Management

---

## Files Summary

### New Files (12)

1. `src/types/auth.ts` - Type definitions
2. `src/services/auth/auth-service.ts` - Core authentication logic
3. `src/services/auth/index.ts` - Service exports
4. `src/contexts/AuthContext.tsx` - React context for auth state
5. `src/hooks/use-auth.ts` - Auth hook
6. `src/hooks/use-permissions.ts` - Permission checking hook
7. `src/pages/Login.tsx` - Login page with PIN entry
8. `src/pages/InitialSetup.tsx` - First-time Super Admin setup
9. `src/pages/UserManagement.tsx` - Admin user management page
10. `src/components/auth/ProtectedRoute.tsx` - Route protection component
11. `src/components/auth/UserMenu.tsx` - User dropdown with logout
12. `src/components/auth/PinInput.tsx` - PIN input component

### Modified Files (3)

1. `src/App.tsx` - Add AuthProvider and protected routes
2. `src/pages/Index.tsx` - Add UserMenu, conditional Settings button
3. `src/pages/Settings.tsx` - Permission checks for each section

---

## Future API Integration

The auth service is designed with a clean interface that can switch from localStorage to your Impact ATMS API:

```typescript
interface AuthService {
  // Authentication
  login(userId: string, pin: string): Promise<User | null>;
  logout(): void;
  
  // User Management
  getUsers(): User[];
  createUser(data: CreateUserData): Promise<User>;
  updateUser(id: string, data: UpdateUserData): Promise<User>;
  deleteUser(id: string): Promise<boolean>;
  archiveUser(id: string): Promise<boolean>;
  
  // Role Validation
  canDeleteRole(roleId: UserRole): ValidationResult;
  canDeleteUser(userId: string): ValidationResult;
}
```

When ready to integrate with your backend, create an `ApiAuthService` class that implements this interface and calls your Impact ATMS API endpoints.

