import React from 'react';
import { useAuth } from '@/hooks/use-auth';
import { usePermissions } from '@/hooks/use-permissions';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { LogOut, LogIn, Users, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getRole } from '@/types/auth';

export function UserMenu() {
  const { user, logout, isAuthenticated } = useAuth();
  const { canManageUsers } = usePermissions();

  // Show login button when not authenticated
  if (!isAuthenticated) {
    return (
      <Button variant="ghost" size="sm" asChild>
        <Link to="/login">
          <LogIn className="h-4 w-4 mr-2" />
          Admin Login
        </Link>
      </Button>
    );
  }

  if (!user) return null;

  const role = getRole(user.role);
  const initials = user.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const getRoleBadgeVariant = () => {
    switch (user.role) {
      case 'super_admin':
        return 'default';
      case 'admin':
        return 'secondary';
      case 'supervisor':
        return 'outline';
      default:
        return 'outline';
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-primary text-primary-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-2">
            <p className="text-sm font-medium leading-none">{user.name}</p>
            <Badge variant={getRoleBadgeVariant()} className="w-fit text-xs">
              {user.role === 'super_admin' && <Shield className="h-3 w-3 mr-1" />}
              {role?.name || user.role}
            </Badge>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {canManageUsers && (
          <>
            <DropdownMenuItem asChild>
              <Link to="/users" className="cursor-pointer">
                <Users className="mr-2 h-4 w-4" />
                <span>Manage Users</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        
        <DropdownMenuItem 
          className="cursor-pointer text-destructive focus:text-destructive"
          onClick={logout}
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
