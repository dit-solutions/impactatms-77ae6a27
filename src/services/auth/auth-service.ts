import type { 
  User, 
  UserRole, 
  CreateUserData, 
  UpdateUserData, 
  ValidationResult,
  LockoutState,
  LoginAttempt,
  DeviceConfig
} from '@/types/auth';
import { ROLE_HIERARCHY, canManageUser } from '@/types/auth';

const STORAGE_KEYS = {
  USERS: 'impact_atms_users',
  SESSION: 'impact_atms_session',
  LOCKOUT: 'impact_atms_lockout',
  ATTEMPTS: 'impact_atms_login_attempts',
  DEVICE_ID: 'impact_atms_device_id',
  DEVICE_CONFIG: 'impact_atms_device_config'
};

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 5 * 60 * 1000; // 5 minutes
const UNLOCK_CODE_VALIDITY_MS = 30 * 60 * 1000; // 30 minutes

// Get or create device ID based on configured prefix and device number
function getDeviceId(): string {
  // First check if we have a cached formatted ID
  let deviceId = localStorage.getItem(STORAGE_KEYS.DEVICE_ID);
  if (deviceId) return deviceId;
  
  // Try to get from config
  const config = getDeviceConfig();
  if (config) {
    deviceId = `${config.prefix}-${config.deviceNumber}`;
    localStorage.setItem(STORAGE_KEYS.DEVICE_ID, deviceId);
    return deviceId;
  }
  
  // Fallback for legacy - should not happen after setup
  deviceId = `DEVICE-${Date.now().toString(36).toUpperCase()}`;
  localStorage.setItem(STORAGE_KEYS.DEVICE_ID, deviceId);
  return deviceId;
}

// Get device configuration
function getDeviceConfig(): DeviceConfig | null {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.DEVICE_CONFIG);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

// Save device configuration
function saveDeviceConfig(config: DeviceConfig): void {
  localStorage.setItem(STORAGE_KEYS.DEVICE_CONFIG, JSON.stringify(config));
  // Also update the cached device ID
  const deviceId = `${config.prefix}-${config.deviceNumber}`;
  localStorage.setItem(STORAGE_KEYS.DEVICE_ID, deviceId);
}

// Generate a deterministic unlock code based on lockoutId + deviceId + timestamp window
async function generateUnlockCode(lockoutId: string, deviceId: string, timestamp: number): Promise<string> {
  // Create a 30-min time window
  const timeWindow = Math.floor(timestamp / UNLOCK_CODE_VALIDITY_MS);
  const input = `${lockoutId}:${deviceId}:${timeWindow}:impact_unlock_salt`;
  
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  
  // Take first 6 digits from hash
  const code = hashArray.slice(0, 3).map(b => (b % 10).toString()).join('') +
               hashArray.slice(3, 6).map(b => (b % 10).toString()).join('');
  return code;
}

// Hash PIN using SHA-256
async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin + 'impact_atms_salt');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Generate unique ID
function generateId(): string {
  return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Get users from localStorage
function getStoredUsers(): User[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.USERS);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

// Save users to localStorage
function saveUsers(users: User[]): void {
  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
}

// Get current session from sessionStorage
function getSession(): User | null {
  try {
    const data = sessionStorage.getItem(STORAGE_KEYS.SESSION);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

// Save session to sessionStorage
function saveSession(user: User | null): void {
  if (user) {
    sessionStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(user));
  } else {
    sessionStorage.removeItem(STORAGE_KEYS.SESSION);
  }
}

// Get lockout state
function getLockoutState(): LockoutState {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.LOCKOUT);
    if (!data) return { isLocked: false, attemptCount: 0 };
    
    const state: LockoutState = JSON.parse(data);
    
    // Check if lockout has expired
    if (state.isLocked && state.lockedUntil && Date.now() > state.lockedUntil) {
      clearLockout();
      return { isLocked: false, attemptCount: 0 };
    }
    
    return state;
  } catch {
    return { isLocked: false, attemptCount: 0 };
  }
}

// Save lockout state
function saveLockoutState(state: LockoutState): void {
  localStorage.setItem(STORAGE_KEYS.LOCKOUT, JSON.stringify(state));
}

// Clear lockout
function clearLockout(): void {
  localStorage.removeItem(STORAGE_KEYS.LOCKOUT);
  localStorage.removeItem(STORAGE_KEYS.ATTEMPTS);
}

// Generate unique lockout ID
function generateLockoutId(): string {
  return `lockout_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
}

// Record login attempt
function recordLoginAttempt(userId: string, success: boolean): void {
  const attempts: LoginAttempt[] = JSON.parse(
    localStorage.getItem(STORAGE_KEYS.ATTEMPTS) || '[]'
  );
  
  attempts.push({ userId, timestamp: Date.now(), success });
  
  // Keep only recent attempts (last hour)
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  const recentAttempts = attempts.filter(a => a.timestamp > oneHourAgo);
  
  localStorage.setItem(STORAGE_KEYS.ATTEMPTS, JSON.stringify(recentAttempts));
  
  if (!success) {
    const failedCount = recentAttempts.filter(a => !a.success).length;
    
    if (failedCount >= MAX_LOGIN_ATTEMPTS) {
      saveLockoutState({
        isLocked: true,
        lockedUntil: Date.now() + LOCKOUT_DURATION_MS,
        attemptCount: failedCount,
        lockoutId: generateLockoutId()
      });
    } else {
      saveLockoutState({
        isLocked: false,
        attemptCount: failedCount
      });
    }
  } else {
    clearLockout();
  }
}

// Auth Service
export const authService = {
  // Check if system is initialized (has Super Admin)
  isInitialized(): boolean {
    const users = getStoredUsers();
    return users.some(u => u.role === 'super_admin' && u.isSystem);
  },

// Initialize system with Super Admin and device config
  async initializeSuperAdmin(
    name: string, 
    pin: string, 
    email?: string,
    deviceConfig?: DeviceConfig
  ): Promise<User> {
    if (this.isInitialized()) {
      throw new Error('System already initialized');
    }

    // Save device configuration if provided
    if (deviceConfig) {
      saveDeviceConfig(deviceConfig);
    }

    const pinHash = await hashPin(pin);
    const superAdmin: User = {
      id: generateId(),
      name,
      role: 'super_admin',
      pinHash,
      isSystem: true,
      isArchived: false,
      createdAt: Date.now(),
      email
    };

    saveUsers([superAdmin]);
    saveSession(superAdmin);
    
    return superAdmin;
  },

  // Get device configuration
  getDeviceConfig(): DeviceConfig | null {
    return getDeviceConfig();
  },

  // Update device configuration (Super Admin only)
  updateDeviceConfig(config: DeviceConfig): void {
    saveDeviceConfig(config);
  },

  // Get all users (optionally include archived)
  getUsers(includeArchived = false): User[] {
    const users = getStoredUsers();
    return includeArchived ? users : users.filter(u => !u.isArchived);
  },

  // Get user by ID
  getUser(userId: string): User | undefined {
    return getStoredUsers().find(u => u.id === userId);
  },

  // Get current session
  getCurrentUser(): User | null {
    return getSession();
  },

  // Get lockout status
  getLockoutStatus(): LockoutState {
    return getLockoutState();
  },

  // Login with user ID and PIN
  async login(userId: string, pin: string): Promise<{ success: boolean; user?: User; error?: string }> {
    const lockout = getLockoutState();
    
    if (lockout.isLocked && lockout.lockedUntil) {
      const remainingMs = lockout.lockedUntil - Date.now();
      const remainingMin = Math.ceil(remainingMs / 60000);
      return { 
        success: false, 
        error: `Too many failed attempts. Try again in ${remainingMin} minute(s).` 
      };
    }

    const user = getStoredUsers().find(u => u.id === userId && !u.isArchived);
    
    if (!user) {
      recordLoginAttempt(userId, false);
      return { success: false, error: 'User not found' };
    }

    const pinHash = await hashPin(pin);
    
    if (pinHash !== user.pinHash) {
      recordLoginAttempt(userId, false);
      const newLockout = getLockoutState();
      const remaining = MAX_LOGIN_ATTEMPTS - newLockout.attemptCount;
      
      if (newLockout.isLocked) {
        return { success: false, error: 'Too many failed attempts. Account locked for 5 minutes.' };
      }
      
      return { 
        success: false, 
        error: `Incorrect PIN. ${remaining} attempt(s) remaining.` 
      };
    }

    // Success
    recordLoginAttempt(userId, true);
    const updatedUser = { ...user, lastLogin: Date.now() };
    
    // Update lastLogin in storage
    const users = getStoredUsers();
    const idx = users.findIndex(u => u.id === userId);
    if (idx >= 0) {
      users[idx] = updatedUser;
      saveUsers(users);
    }
    
    saveSession(updatedUser);
    return { success: true, user: updatedUser };
  },

  // Logout
  logout(): void {
    saveSession(null);
  },

  // Create new user
  async createUser(data: CreateUserData, createdBy: string): Promise<User> {
    const currentUser = this.getUser(createdBy);
    if (!currentUser) {
      throw new Error('Creator not found');
    }

    // Validate creator can create this role
    if (!canManageUser(currentUser.role, data.role)) {
      throw new Error('Insufficient permissions to create this role');
    }

    // Cannot create super_admin
    if (data.role === 'super_admin') {
      throw new Error('Cannot create Super Admin users');
    }

    const pinHash = await hashPin(data.pin);
    const newUser: User = {
      id: generateId(),
      name: data.name,
      role: data.role,
      pinHash,
      isSystem: false,
      isArchived: false,
      createdAt: Date.now(),
      createdBy
    };

    const users = getStoredUsers();
    users.push(newUser);
    saveUsers(users);

    return newUser;
  },

  // Update user
  async updateUser(userId: string, data: UpdateUserData, updatedBy: string): Promise<User> {
    const users = getStoredUsers();
    const userIndex = users.findIndex(u => u.id === userId);
    
    if (userIndex < 0) {
      throw new Error('User not found');
    }

    const targetUser = users[userIndex];
    const currentUser = this.getUser(updatedBy);

    if (!currentUser) {
      throw new Error('Updater not found');
    }

    // Cannot modify super_admin role
    if (targetUser.isSystem && data.role && data.role !== 'super_admin') {
      throw new Error('Cannot demote system Super Admin');
    }

    // Check if user can modify target
    if (targetUser.id !== updatedBy && !canManageUser(currentUser.role, targetUser.role)) {
      throw new Error('Insufficient permissions');
    }

    // Update fields
    if (data.name) targetUser.name = data.name;
    if (data.role && !targetUser.isSystem) {
      // Validate new role is creatable by current user
      if (!canManageUser(currentUser.role, data.role)) {
        throw new Error('Cannot assign this role');
      }
      targetUser.role = data.role;
    }
    if (data.pin) {
      targetUser.pinHash = await hashPin(data.pin);
    }

    users[userIndex] = targetUser;
    saveUsers(users);

    // Update session if user updated themselves
    if (userId === updatedBy) {
      saveSession(targetUser);
    }

    return targetUser;
  },

  // Archive user (soft delete)
  archiveUser(userId: string, archivedBy: string): ValidationResult {
    const validation = this.canDeleteUser(userId);
    if (!validation.allowed) return validation;

    const users = getStoredUsers();
    const userIndex = users.findIndex(u => u.id === userId);
    
    if (userIndex >= 0) {
      users[userIndex].isArchived = true;
      saveUsers(users);
    }

    return { allowed: true };
  },

  // Delete user permanently
  deleteUser(userId: string, deletedBy: string): ValidationResult {
    const validation = this.canDeleteUser(userId);
    if (!validation.allowed) return validation;

    const users = getStoredUsers();
    const filtered = users.filter(u => u.id !== userId);
    saveUsers(filtered);

    return { allowed: true };
  },

  // Check if user can be deleted
  canDeleteUser(userId: string): ValidationResult {
    const user = this.getUser(userId);
    
    if (!user) {
      return { allowed: false, reason: 'User not found' };
    }

    if (user.isSystem) {
      return { allowed: false, reason: 'System user cannot be deleted' };
    }

    return { allowed: true };
  },

  // Check if role can be deleted (has no active users)
  canDeleteRole(roleId: UserRole): ValidationResult {
    if (roleId === 'super_admin') {
      return { allowed: false, reason: 'System role cannot be deleted' };
    }

    const activeUsers = getStoredUsers().filter(
      u => u.role === roleId && !u.isArchived
    );

    if (activeUsers.length > 0) {
      return {
        allowed: false,
        reason: `${activeUsers.length} active user(s) must be reassigned first`,
        userCount: activeUsers.length
      };
    }

    return { allowed: true };
  },

  // Get users by role
  getUsersByRole(roleId: UserRole, includeArchived = false): User[] {
    return this.getUsers(includeArchived).filter(u => u.role === roleId);
  },

// Verify PIN for current user (for sensitive actions)
  async verifyPin(userId: string, pin: string): Promise<boolean> {
    const user = this.getUser(userId);
    if (!user) return false;

    const pinHash = await hashPin(pin);
    return pinHash === user.pinHash;
  },

  // Get Super Admin contact info for lockout notification
  getSuperAdminContact(): { name: string; email?: string } | null {
    const superAdmin = getStoredUsers().find(u => u.isSystem && u.role === 'super_admin');
    if (!superAdmin) return null;
    return { name: superAdmin.name, email: superAdmin.email };
  },

  // Get device ID for unlock codes
  getDeviceId(): string {
    return getDeviceId();
  },

  // Generate unlock code for Super Admin to provide
  async generateUnlockCodeForAdmin(): Promise<{ code: string; deviceId: string; expiresIn: number } | null> {
    const lockout = getLockoutState();
    if (!lockout.isLocked || !lockout.lockoutId) return null;
    
    const deviceId = getDeviceId();
    const code = await generateUnlockCode(lockout.lockoutId, deviceId, Date.now());
    
    return {
      code,
      deviceId,
      expiresIn: 30 // minutes
    };
  },

  // Validate unlock code entered on locked device
  async validateUnlockCode(code: string): Promise<boolean> {
    const lockout = getLockoutState();
    if (!lockout.isLocked || !lockout.lockoutId) return false;
    
    const deviceId = getDeviceId();
    const expectedCode = await generateUnlockCode(lockout.lockoutId, deviceId, Date.now());
    
    if (code === expectedCode) {
      clearLockout();
      return true;
    }
    return false;
  },

  // Get current lockout info for display
  getLockoutInfo(): { lockoutId?: string; deviceId: string } | null {
    const lockout = getLockoutState();
    if (!lockout.isLocked) return null;
    return {
      lockoutId: lockout.lockoutId,
      deviceId: getDeviceId()
    };
  }
};
