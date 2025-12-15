'use client';

import { ReactNode } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Permission, hasPermission, hasAllPermissions, hasAnyPermission } from '@/lib/permissions';
import { UserRole } from '@/types/auth';
import { Lock } from 'lucide-react';

interface PermissionGateProps {
  children: ReactNode;
  // Single permission check
  permission?: Permission;
  // Multiple permissions - require ALL
  permissions?: Permission[];
  // Multiple permissions - require ANY
  anyPermission?: Permission[];
  // Direct role check (alternative to permission-based)
  role?: UserRole;
  roles?: UserRole[];
  // Fallback content when permission denied
  fallback?: ReactNode;
  // Show locked indicator instead of hiding
  showLocked?: boolean;
  // Custom locked message
  lockedMessage?: string;
}

export default function PermissionGate({
  children,
  permission,
  permissions,
  anyPermission,
  role,
  roles,
  fallback = null,
  showLocked = false,
  lockedMessage = 'You do not have permission to access this feature',
}: PermissionGateProps) {
  const { user } = useAuth();

  if (!user) {
    return showLocked ? (
      <LockedContent message={lockedMessage} />
    ) : (
      <>{fallback}</>
    );
  }

  let hasAccess = true;

  // Check single permission
  if (permission) {
    hasAccess = hasPermission(user.role, permission);
  }

  // Check ALL permissions required
  if (permissions && permissions.length > 0) {
    hasAccess = hasAccess && hasAllPermissions(user.role, permissions);
  }

  // Check ANY permission required
  if (anyPermission && anyPermission.length > 0) {
    hasAccess = hasAccess && hasAnyPermission(user.role, anyPermission);
  }

  // Check specific role
  if (role) {
    hasAccess = hasAccess && user.role === role;
  }

  // Check any of the specified roles
  if (roles && roles.length > 0) {
    hasAccess = hasAccess && roles.includes(user.role);
  }

  if (!hasAccess) {
    return showLocked ? (
      <LockedContent message={lockedMessage} />
    ) : (
      <>{fallback}</>
    );
  }

  return <>{children}</>;
}

// Locked content display
function LockedContent({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 px-4 py-3 bg-[var(--muted)] rounded-lg border border-[var(--border)] text-[var(--muted-foreground)]">
      <Lock className="w-4 h-4 shrink-0" />
      <span className="text-sm">{message}</span>
    </div>
  );
}

// Hook for checking permissions in logic
export function usePermission(permission: Permission): boolean {
  const { user } = useAuth();
  if (!user) return false;
  return hasPermission(user.role, permission);
}

// Hook for checking multiple permissions
export function usePermissions(permissions: Permission[]): {
  hasAll: boolean;
  hasAny: boolean;
  check: (p: Permission) => boolean;
} {
  const { user } = useAuth();

  if (!user) {
    return {
      hasAll: false,
      hasAny: false,
      check: () => false,
    };
  }

  return {
    hasAll: hasAllPermissions(user.role, permissions),
    hasAny: hasAnyPermission(user.role, permissions),
    check: (p: Permission) => hasPermission(user.role, p),
  };
}

// Hook to check if current user is owner
export function useIsOwner(): boolean {
  const { user } = useAuth();
  return user?.role === 'owner';
}

// Hook to check if current user is admin or above
export function useIsAdmin(): boolean {
  const { user } = useAuth();
  return user?.role === 'owner' || user?.role === 'admin';
}

// Component that shows content only for owners
export function OwnerOnly({
  children,
  fallback,
  showLocked,
  lockedMessage = 'Only organization owners can access this feature',
}: {
  children: ReactNode;
  fallback?: ReactNode;
  showLocked?: boolean;
  lockedMessage?: string;
}) {
  return (
    <PermissionGate
      role="owner"
      fallback={fallback}
      showLocked={showLocked}
      lockedMessage={lockedMessage}
    >
      {children}
    </PermissionGate>
  );
}

// Component that shows content for admins and above
export function AdminOnly({
  children,
  fallback,
  showLocked,
  lockedMessage = 'Only admins can access this feature',
}: {
  children: ReactNode;
  fallback?: ReactNode;
  showLocked?: boolean;
  lockedMessage?: string;
}) {
  return (
    <PermissionGate
      roles={['owner', 'admin']}
      fallback={fallback}
      showLocked={showLocked}
      lockedMessage={lockedMessage}
    >
      {children}
    </PermissionGate>
  );
}

// Component that hides content from viewers
export function NotViewer({
  children,
  fallback,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) {
  return (
    <PermissionGate roles={['owner', 'admin']} fallback={fallback}>
      {children}
    </PermissionGate>
  );
}
