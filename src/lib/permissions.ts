// FluffyChats Role-Based Permission System
// Implements a 3-tier hierarchy: Owner > Admin > Viewer

import { UserRole } from '@/types/auth';

// All available permissions in the system
export type Permission =
  // Dashboard
  | 'dashboard:view'
  // Leads
  | 'leads:view'
  | 'leads:create'
  | 'leads:edit'
  | 'leads:delete'
  | 'leads:export'
  | 'leads:assign'
  | 'leads:bulk_actions'
  // Analytics
  | 'analytics:view'
  | 'analytics:export'
  // Integrations
  | 'integrations:view'
  | 'integrations:connect'
  | 'integrations:disconnect'
  | 'integrations:configure'
  | 'integrations:sync'
  // Settings - Profile
  | 'settings:profile:view'
  | 'settings:profile:edit'
  // Settings - Organization
  | 'settings:organization:view'
  | 'settings:organization:edit'
  // Settings - Export
  | 'settings:export:view'
  | 'settings:export:configure'
  // Settings - Security
  | 'settings:security:view'
  | 'settings:security:edit'
  | 'settings:security:api_keys'
  // Settings - Team
  | 'settings:team:view'
  | 'settings:team:invite'
  | 'settings:team:remove'
  | 'settings:team:change_roles'
  // Settings - Danger Zone
  | 'settings:danger:view'
  | 'settings:danger:delete_data'
  | 'settings:danger:delete_organization'
  | 'settings:danger:transfer_ownership';

// Permission definitions for each role
const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  owner: [
    // Dashboard
    'dashboard:view',
    // Leads - Full access
    'leads:view',
    'leads:create',
    'leads:edit',
    'leads:delete',
    'leads:export',
    'leads:assign',
    'leads:bulk_actions',
    // Analytics - Full access
    'analytics:view',
    'analytics:export',
    // Integrations - Full access
    'integrations:view',
    'integrations:connect',
    'integrations:disconnect',
    'integrations:configure',
    'integrations:sync',
    // Settings - All sections
    'settings:profile:view',
    'settings:profile:edit',
    'settings:organization:view',
    'settings:organization:edit',
    'settings:export:view',
    'settings:export:configure',
    'settings:security:view',
    'settings:security:edit',
    'settings:security:api_keys',
    'settings:team:view',
    'settings:team:invite',
    'settings:team:remove',
    'settings:team:change_roles',
    'settings:danger:view',
    'settings:danger:delete_data',
    'settings:danger:delete_organization',
    'settings:danger:transfer_ownership',
  ],
  admin: [
    // Dashboard
    'dashboard:view',
    // Leads - Can view, edit, export but not delete
    'leads:view',
    'leads:create',
    'leads:edit',
    'leads:export',
    'leads:assign',
    'leads:bulk_actions',
    // Analytics - Full access
    'analytics:view',
    'analytics:export',
    // Integrations - Can view and sync, but not connect/disconnect
    'integrations:view',
    'integrations:sync',
    // Settings - Limited
    'settings:profile:view',
    'settings:profile:edit',
    'settings:export:view',
    'settings:export:configure',
    'settings:security:view',
    'settings:security:edit',
    'settings:team:view',
  ],
  viewer: [
    // Dashboard
    'dashboard:view',
    // Leads - View only
    'leads:view',
    // Analytics - View only
    'analytics:view',
    // Settings - Profile only
    'settings:profile:view',
    'settings:profile:edit',
  ],
};

// Check if a role has a specific permission
export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

// Check if a role has ALL of the specified permissions
export function hasAllPermissions(role: UserRole, permissions: Permission[]): boolean {
  return permissions.every(p => hasPermission(role, p));
}

// Check if a role has ANY of the specified permissions
export function hasAnyPermission(role: UserRole, permissions: Permission[]): boolean {
  return permissions.some(p => hasPermission(role, p));
}

// Get all permissions for a role
export function getPermissions(role: UserRole): Permission[] {
  return ROLE_PERMISSIONS[role] || [];
}

// Settings tab visibility based on role
export type SettingsTab =
  | 'profile'
  | 'organization'
  | 'export'
  | 'security'
  | 'team'
  | 'danger';

const TAB_REQUIRED_PERMISSIONS: Record<SettingsTab, Permission> = {
  profile: 'settings:profile:view',
  organization: 'settings:organization:view',
  export: 'settings:export:view',
  security: 'settings:security:view',
  team: 'settings:team:view',
  danger: 'settings:danger:view',
};

export function canAccessSettingsTab(role: UserRole, tab: SettingsTab): boolean {
  return hasPermission(role, TAB_REQUIRED_PERMISSIONS[tab]);
}

export function getAccessibleSettingsTabs(role: UserRole): SettingsTab[] {
  return (Object.keys(TAB_REQUIRED_PERMISSIONS) as SettingsTab[])
    .filter(tab => canAccessSettingsTab(role, tab));
}

// Role hierarchy - higher number = more privileges
const ROLE_HIERARCHY: Record<UserRole, number> = {
  owner: 3,
  admin: 2,
  viewer: 1,
};

// Check if role A can manage role B (change role, remove, etc.)
export function canManageRole(managerRole: UserRole, targetRole: UserRole): boolean {
  // Can only manage roles below your own level
  return ROLE_HIERARCHY[managerRole] > ROLE_HIERARCHY[targetRole];
}

// Check if a role can assign another role
export function canAssignRole(assignerRole: UserRole, roleToAssign: UserRole): boolean {
  // Can only assign roles below your own level
  return ROLE_HIERARCHY[assignerRole] > ROLE_HIERARCHY[roleToAssign];
}

// Get roles that can be assigned by a given role
export function getAssignableRoles(role: UserRole): UserRole[] {
  const roles: UserRole[] = ['viewer', 'admin', 'owner'];
  return roles.filter(r => canAssignRole(role, r));
}

// Role display information
export interface RoleDisplayInfo {
  label: string;
  description: string;
  color: string;
  bgColor: string;
  borderColor: string;
  gradient: string;
  icon: 'crown' | 'shield' | 'eye';
}

export const ROLE_DISPLAY: Record<UserRole, RoleDisplayInfo> = {
  owner: {
    label: 'Owner',
    description: 'Full access to all features including billing and organization management',
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    gradient: 'from-amber-400 to-orange-500',
    icon: 'crown',
  },
  admin: {
    label: 'Admin',
    description: 'Can manage leads, analytics, and team members',
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-200',
    gradient: 'from-indigo-500 to-purple-600',
    icon: 'shield',
  },
  viewer: {
    label: 'Viewer',
    description: 'Read-only access to dashboard and leads',
    color: 'text-slate-600',
    bgColor: 'bg-slate-50',
    borderColor: 'border-slate-200',
    gradient: 'from-slate-400 to-slate-500',
    icon: 'eye',
  },
};

// Export role hierarchy for use in UI
export { ROLE_HIERARCHY };
