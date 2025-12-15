// FluffyChats Authentication & Authorization Types

export type UserRole = 'owner' | 'admin' | 'viewer';

// Organization represents a company/workspace
export interface Organization {
  id: string;
  name: string;
  slug: string; // URL-friendly name
  logo?: string;
  industry?: string;
  size?: 'startup' | 'small' | 'medium' | 'enterprise';
  timezone: string;
  createdAt: string;
  updatedAt: string;
  ownerId: string; // User ID of the owner
  settings: OrganizationSettings;
}

export interface OrganizationSettings {
  allowSignups: boolean;
  defaultRole: UserRole;
  requireEmailVerification: boolean;
  leadAssignmentMode: 'manual' | 'round-robin' | 'load-balanced';
  notificationEmail?: string;
  webhookUrl?: string;
}

// Extended User interface with organization context
export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: string;
  updatedAt?: string;
  // Profile fields
  phone?: string;
  avatar?: string;
  title?: string;
  // Organization context
  organizationId?: string;
  // Status
  status: 'active' | 'invited' | 'suspended';
  lastLoginAt?: string;
  // Preferences
  preferences?: UserPreferences;
  // Security
  twoFactorEnabled?: boolean;
  emailVerified?: boolean;
}

export interface UserPreferences {
  // Display
  theme: 'light' | 'dark' | 'system';
  leadsPerPage: number;
  defaultSort: string;
  compactView: boolean;
  showAvatars: boolean;
  showCompleteness: boolean;
  // Notifications
  emailNotifications: boolean;
  hotLeadAlerts: boolean;
  weeklyDigest: boolean;
  // Export
  exportFormat: 'csv' | 'json' | 'excel';
  includeConversations: boolean;
  includeContactInfo: boolean;
}

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  theme: 'light',
  leadsPerPage: 25,
  defaultSort: 'conversation_date',
  compactView: false,
  showAvatars: true,
  showCompleteness: true,
  emailNotifications: true,
  hotLeadAlerts: true,
  weeklyDigest: false,
  exportFormat: 'csv',
  includeConversations: true,
  includeContactInfo: true,
};

// Team member representation (user within org context)
export interface TeamMember {
  id: string;
  userId: string;
  organizationId: string;
  role: UserRole;
  user: Pick<User, 'id' | 'email' | 'name' | 'avatar' | 'status' | 'lastLoginAt'>;
  joinedAt: string;
  invitedBy?: string;
}

// Invitation for new team members
export interface Invitation {
  id: string;
  email: string;
  role: UserRole;
  organizationId: string;
  invitedBy: string;
  invitedByName: string;
  createdAt: string;
  expiresAt: string;
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
  token: string;
}

// Audit log entry for tracking important actions
export interface AuditLogEntry {
  id: string;
  organizationId: string;
  userId: string;
  userName: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

// Session information
export interface Session {
  id: string;
  userId: string;
  device: string;
  browser: string;
  os: string;
  location: string;
  ip: string;
  lastActive: string;
  createdAt: string;
  current: boolean;
}

// API Key for integrations
export interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string; // First 8 chars for display
  permissions: string[];
  createdAt: string;
  lastUsedAt?: string;
  expiresAt?: string;
  createdBy: string;
}

// Auth state for context
export interface AuthState {
  user: User | null;
  organization: Organization | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// Role permissions - what each role can access (routes)
export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  // Owner: Full access - Dashboard, Leads, Analytics, Integrations, Settings
  owner: ['/', '/leads', '/analytics', '/integrations', '/settings'],
  // Admin: Dashboard, Leads, Analytics, Settings (limited)
  admin: ['/', '/leads', '/analytics', '/settings'],
  // Viewer: Dashboard, Leads only, Settings (profile only)
  viewer: ['/', '/leads', '/settings'],
};

// Navigation items visibility by role
export const ROLE_NAV_ITEMS: Record<UserRole, string[]> = {
  owner: ['Dashboard', 'Leads', 'Analytics', 'Integrations', 'Settings'],
  admin: ['Dashboard', 'Leads', 'Analytics', 'Settings'],
  viewer: ['Dashboard', 'Leads', 'Settings'],
};

export function canAccessRoute(role: UserRole, path: string): boolean {
  const permissions = ROLE_PERMISSIONS[role];
  return permissions.some(p => {
    if (p === path) return true;
    if (p !== '/' && path.startsWith(p)) return true;
    return false;
  });
}

export function canSeeNavItem(role: UserRole, itemName: string): boolean {
  return ROLE_NAV_ITEMS[role].includes(itemName);
}

// Helper to get role display name
export function getRoleDisplayName(role: UserRole): string {
  const names: Record<UserRole, string> = {
    owner: 'Owner',
    admin: 'Admin',
    viewer: 'Viewer',
  };
  return names[role];
}

// Helper to get role description
export function getRoleDescription(role: UserRole): string {
  const descriptions: Record<UserRole, string> = {
    owner: 'Full access to all features, billing, and organization settings',
    admin: 'Can manage leads, analytics, and view team members',
    viewer: 'Read-only access to dashboard and leads',
  };
  return descriptions[role];
}
