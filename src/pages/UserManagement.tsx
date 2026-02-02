import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';
import { usePermissions } from '@/hooks/use-permissions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { PinInput, NumericKeypad } from '@/components/auth/PinInput';
import { ArrowLeft, Users, Plus, Pencil, Trash2, Shield, Archive, Key } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import type { User, UserRole, CreateUserData } from '@/types/auth';
import { getRole, ROLES, canManageUser, getCreatableRoles } from '@/types/auth';

export default function UserManagement() {
  const { user: currentUser, users, createUser, updateUser, deleteUser, archiveUser } = useAuth();
  const { creatableRoles, canManage, isSuperAdmin } = usePermissions();
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [changingPinUser, setChangingPinUser] = useState<User | null>(null);

  const getInitials = (name: string) => 
    name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const getRoleBadgeVariant = (role: UserRole) => {
    switch (role) {
      case 'super_admin': return 'default';
      case 'admin': return 'secondary';
      default: return 'outline';
    }
  };

  // Group users by role
  const usersByRole = ROLES.map(role => ({
    role,
    users: users.filter(u => u.role === role.id && !u.isArchived)
  })).filter(group => group.users.length > 0);

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <header className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" asChild>
                <Link to="/">
                  <ArrowLeft className="h-5 w-5" />
                </Link>
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                  <Users className="h-6 w-6" />
                  User Management
                </h1>
                <p className="text-sm text-muted-foreground">
                  Manage system users and permissions
                </p>
              </div>
            </div>
            
            {creatableRoles.length > 0 && (
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-1" />
                    Add User
                  </Button>
                </DialogTrigger>
                <AddUserDialog 
                  onClose={() => setIsAddDialogOpen(false)}
                  creatableRoles={creatableRoles}
                  onSubmit={async (data) => {
                    await createUser(data);
                    toast({ title: 'User created', description: `${data.name} has been added.` });
                    setIsAddDialogOpen(false);
                  }}
                />
              </Dialog>
            )}
          </div>
        </header>

        {/* User List by Role */}
        <div className="space-y-6">
          {usersByRole.map(({ role, users: roleUsers }) => (
            <Card key={role.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {role.id === 'super_admin' && <Shield className="h-4 w-4 text-primary" />}
                    <CardTitle className="text-base">{role.name}</CardTitle>
                    <Badge variant="secondary" className="text-xs">
                      {roleUsers.length}
                    </Badge>
                  </div>
                </div>
                <CardDescription className="text-xs">{role.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {roleUsers.map(user => {
                  const canEdit = user.id === currentUser?.id || canManage(user.role);
                  const canDelete = !user.isSystem && canManage(user.role) && user.id !== currentUser?.id;
                  
                  return (
                    <div 
                      key={user.id} 
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-primary/20 text-primary">
                            {getInitials(user.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium flex items-center gap-1">
                            {user.name}
                            {user.isSystem && (
                              <Badge variant="default" className="text-[10px] px-1.5 py-0 ml-1">
                                System
                              </Badge>
                            )}
                            {user.id === currentUser?.id && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 ml-1">
                                You
                              </Badge>
                            )}
                          </p>
                          {user.lastLogin && (
                            <p className="text-xs text-muted-foreground">
                              Last login: {new Date(user.lastLogin).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        {/* Change PIN - anyone can change their own */}
                        {(user.id === currentUser?.id || canEdit) && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8"
                            onClick={() => setChangingPinUser(user)}
                          >
                            <Key className="h-4 w-4" />
                          </Button>
                        )}
                        
                        {/* Edit */}
                        {canEdit && !user.isSystem && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8"
                            onClick={() => setEditingUser(user)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        
                        {/* Delete */}
                        {canDelete && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete {user.name}?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This action cannot be undone. This will permanently delete the user account.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  onClick={() => {
                                    deleteUser(user.id);
                                    toast({ title: 'User deleted', description: `${user.name} has been removed.` });
                                  }}
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Edit User Dialog */}
        {editingUser && (
          <EditUserDialog
            user={editingUser}
            creatableRoles={creatableRoles}
            onClose={() => setEditingUser(null)}
            onSubmit={async (data) => {
              await updateUser(editingUser.id, data);
              toast({ title: 'User updated', description: `${editingUser.name} has been updated.` });
              setEditingUser(null);
            }}
          />
        )}

        {/* Change PIN Dialog */}
        {changingPinUser && (
          <ChangePinDialog
            user={changingPinUser}
            isSelf={changingPinUser.id === currentUser?.id}
            onClose={() => setChangingPinUser(null)}
            onSubmit={async (newPin) => {
              await updateUser(changingPinUser.id, { pin: newPin });
              toast({ title: 'PIN changed', description: `PIN has been updated for ${changingPinUser.name}.` });
              setChangingPinUser(null);
            }}
          />
        )}
      </div>
    </div>
  );
}

// Add User Dialog Component
function AddUserDialog({ 
  onClose, 
  creatableRoles, 
  onSubmit 
}: { 
  onClose: () => void;
  creatableRoles: UserRole[];
  onSubmit: (data: CreateUserData) => Promise<void>;
}) {
  const [step, setStep] = useState<'info' | 'pin'>('info');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>(creatableRoles[0]);
  const [pin, setPin] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleInfoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) {
      setError('Name must be at least 2 characters');
      return;
    }
    setError('');
    setStep('pin');
  };

  const handlePinComplete = async (enteredPin: string) => {
    setIsSubmitting(true);
    try {
      await onSubmit({ name: name.trim(), role, pin: enteredPin });
    } catch (err: any) {
      setError(err.message || 'Failed to create user');
      setPin('');
      setIsSubmitting(false);
    }
  };

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>
          {step === 'info' ? 'Add New User' : 'Set PIN'}
        </DialogTitle>
        <DialogDescription>
          {step === 'info' 
            ? 'Enter user details' 
            : `Create a 6-digit PIN for ${name}`}
        </DialogDescription>
      </DialogHeader>

      {error && (
        <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-lg text-center">
          {error}
        </div>
      )}

      {step === 'info' ? (
        <form onSubmit={handleInfoSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Enter user name"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select value={role} onValueChange={v => setRole(v as UserRole)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {creatableRoles.map(r => {
                  const roleInfo = getRole(r);
                  return (
                    <SelectItem key={r} value={r}>
                      {roleInfo?.name || r}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim()}>
              Continue
            </Button>
          </DialogFooter>
        </form>
      ) : (
        <div className="space-y-4">
          <PinInput
            value={pin}
            onChange={setPin}
            onComplete={handlePinComplete}
            disabled={isSubmitting}
            autoFocus
          />
          <NumericKeypad
            onDigit={d => {
              if (pin.length < 6) {
                const newPin = pin + d;
                setPin(newPin);
                if (newPin.length === 6) handlePinComplete(newPin);
              }
            }}
            onBackspace={() => setPin(p => p.slice(0, -1))}
            onClear={() => setPin('')}
            disabled={isSubmitting}
          />
          <Button variant="ghost" className="w-full" onClick={() => setStep('info')}>
            Back
          </Button>
        </div>
      )}
    </DialogContent>
  );
}

// Edit User Dialog Component
function EditUserDialog({ 
  user, 
  creatableRoles, 
  onClose, 
  onSubmit 
}: { 
  user: User;
  creatableRoles: UserRole[];
  onClose: () => void;
  onSubmit: (data: { name?: string; role?: UserRole }) => Promise<void>;
}) {
  const [name, setName] = useState(user.name);
  const [role, setRole] = useState<UserRole>(user.role);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) {
      setError('Name must be at least 2 characters');
      return;
    }
    
    setIsSubmitting(true);
    try {
      const data: { name?: string; role?: UserRole } = {};
      if (name !== user.name) data.name = name.trim();
      if (role !== user.role) data.role = role;
      await onSubmit(data);
    } catch (err: any) {
      setError(err.message || 'Failed to update user');
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
          <DialogDescription>Update user details</DialogDescription>
        </DialogHeader>

        {error && (
          <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-lg text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Name</Label>
            <Input
              id="edit-name"
              value={name}
              onChange={e => setName(e.target.value)}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-role">Role</Label>
            <Select value={role} onValueChange={v => setRole(v as UserRole)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {creatableRoles.map(r => {
                  const roleInfo = getRole(r);
                  return (
                    <SelectItem key={r} value={r}>
                      {roleInfo?.name || r}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Change PIN Dialog Component
function ChangePinDialog({ 
  user, 
  isSelf,
  onClose, 
  onSubmit 
}: { 
  user: User;
  isSelf: boolean;
  onClose: () => void;
  onSubmit: (newPin: string) => Promise<void>;
}) {
  const [pin, setPin] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handlePinComplete = async (enteredPin: string) => {
    setIsSubmitting(true);
    try {
      await onSubmit(enteredPin);
    } catch (err: any) {
      setError(err.message || 'Failed to change PIN');
      setPin('');
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Change PIN</DialogTitle>
          <DialogDescription>
            {isSelf 
              ? 'Enter a new 6-digit PIN' 
              : `Set a new PIN for ${user.name}`}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-lg text-center">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <PinInput
            value={pin}
            onChange={setPin}
            onComplete={handlePinComplete}
            disabled={isSubmitting}
            autoFocus
          />
          <NumericKeypad
            onDigit={d => {
              if (pin.length < 6) {
                const newPin = pin + d;
                setPin(newPin);
                if (newPin.length === 6) handlePinComplete(newPin);
              }
            }}
            onBackspace={() => setPin(p => p.slice(0, -1))}
            onClear={() => setPin('')}
            disabled={isSubmitting}
          />
          <Button variant="outline" className="w-full" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
