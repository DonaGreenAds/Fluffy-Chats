/**
 * =============================================================================
 * AUTHENTICATION CONTEXT
 * =============================================================================
 *
 * Manages user authentication and authorization throughout the application.
 *
 * ⚠️  DEVELOPMENT/DEMO IMPLEMENTATION
 *
 * This implementation uses simplified security suitable for demos:
 * - SHA-256 hashing with static salt (NOT bcrypt/argon2)
 * - localStorage for session storage (vulnerable to XSS)
 * - 24-hour session without refresh token rotation
 *
 * For production, implement:
 * - bcrypt or argon2 for password hashing
 * - Per-user salt generation
 * - Secure HttpOnly cookie sessions
 * - JWT with refresh token rotation
 * - Rate limiting on login attempts
 *
 * DEFAULT DEMO CREDENTIALS:
 * - Email: owner@telinfy.com
 * - Password: Owner@123
 *
 * ROLE HIERARCHY:
 * - owner: Full access, can manage team and settings
 * - admin: Can manage leads, view analytics
 * - viewer: Read-only access to leads
 *
 * =============================================================================
 */

'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserRole, canAccessRoute, Organization, DEFAULT_USER_PREFERENCES } from '@/types/auth';

/**
 * Hashes a password using SHA-256 with a static salt
 *
 * ⚠️  For demo purposes only - use bcrypt/argon2 in production
 *
 * @param password - Plain text password
 * @returns Hex-encoded hash string
 */
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  // Static salt - in production, use per-user random salts
  const data = encoder.encode(password + 'fluffychats_salt_2024');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

interface StoredUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  passwordHash: string;
  createdAt: string;
  phone?: string;
  title?: string;
  avatar?: string;
  organizationId?: string;
  status?: 'active' | 'invited' | 'suspended';
}

interface AuthContextType {
  user: User | null;
  organization: Organization | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (name: string, email: string, password: string, role: UserRole) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  canAccess: (path: string) => boolean;
  updateUser: (updates: Partial<Pick<User, 'name' | 'email' | 'phone' | 'title' | 'avatar'>>) => void;
  updateOrganization: (updates: Partial<Organization>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Default demo user - auto-created on first load
 * Password: Owner@123 (hash generated dynamically)
 */
const DEFAULT_USERS: StoredUser[] = [
  {
    id: 'owner-1',
    email: 'owner@telinfy.com',
    name: 'Owner User',
    role: 'owner',
    passwordHash: '', // Will be set on first load with hashPassword('Owner@123')
    createdAt: new Date().toISOString(),
    organizationId: 'org-1',
    status: 'active',
  },
];

/**
 * Default demo organization - Telinfy
 */
const DEFAULT_ORGANIZATION: Organization = {
  id: 'org-1',
  name: 'Telinfy',
  slug: 'telinfy',
  industry: 'Technology',
  size: 'small',
  timezone: 'Asia/Kolkata',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ownerId: 'owner-1',
  settings: {
    allowSignups: true,
    defaultRole: 'viewer',
    requireEmailVerification: false,
    leadAssignmentMode: 'manual',
  },
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize default users and check for existing session
  useEffect(() => {
    const initAuth = async () => {
      // Hash default password for demo owner account
      const defaultHash = await hashPassword('Owner@123');

      // Initialize or fix default users
      const storedUsers = localStorage.getItem('fluffychats_users');
      if (!storedUsers) {
        // No users - create default
        const usersWithHash = DEFAULT_USERS.map(u => ({ ...u, passwordHash: defaultHash }));
        localStorage.setItem('fluffychats_users', JSON.stringify(usersWithHash));
      } else {
        // Ensure default owner exists with correct password
        try {
          const users: StoredUser[] = JSON.parse(storedUsers);
          const ownerExists = users.find(u => u.email === 'owner@telinfy.com');
          if (!ownerExists) {
            // Add default owner if missing
            users.push({ ...DEFAULT_USERS[0], passwordHash: defaultHash });
            localStorage.setItem('fluffychats_users', JSON.stringify(users));
          } else if (!ownerExists.passwordHash || ownerExists.passwordHash === '') {
            // Fix owner with empty password hash
            const updatedUsers = users.map(u =>
              u.email === 'owner@telinfy.com' ? { ...u, passwordHash: defaultHash } : u
            );
            localStorage.setItem('fluffychats_users', JSON.stringify(updatedUsers));
          }
        } catch {
          // Corrupted data - reset
          const usersWithHash = DEFAULT_USERS.map(u => ({ ...u, passwordHash: defaultHash }));
          localStorage.setItem('fluffychats_users', JSON.stringify(usersWithHash));
        }
      }

      // Initialize default organization if not present
      const storedOrg = localStorage.getItem('fluffychats_organization');
      if (!storedOrg) {
        localStorage.setItem('fluffychats_organization', JSON.stringify(DEFAULT_ORGANIZATION));
      }

      // Check for existing session
      const session = localStorage.getItem('fluffychats_session');
      if (session) {
        try {
          const sessionData = JSON.parse(session);
          // Verify session hasn't expired (24 hours)
          const sessionAge = Date.now() - sessionData.timestamp;
          if (sessionAge < 24 * 60 * 60 * 1000) {
            setUser(sessionData.user);
            // Load organization
            const orgData = localStorage.getItem('fluffychats_organization');
            if (orgData) {
              setOrganization(JSON.parse(orgData));
            }
          } else {
            localStorage.removeItem('fluffychats_session');
          }
        } catch {
          localStorage.removeItem('fluffychats_session');
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const storedUsers = localStorage.getItem('fluffychats_users');
      if (!storedUsers) {
        return { success: false, error: 'No users found. Please sign up first.' };
      }

      const users: StoredUser[] = JSON.parse(storedUsers);
      const foundUser = users.find(u => u.email.toLowerCase() === email.toLowerCase());

      if (!foundUser) {
        return { success: false, error: 'Invalid email or password.' };
      }

      const inputHash = await hashPassword(password);
      if (inputHash !== foundUser.passwordHash) {
        return { success: false, error: 'Invalid email or password.' };
      }

      const userWithoutPassword: User = {
        id: foundUser.id,
        email: foundUser.email,
        name: foundUser.name,
        role: foundUser.role,
        createdAt: foundUser.createdAt,
        phone: foundUser.phone,
        title: foundUser.title,
        avatar: foundUser.avatar,
        organizationId: foundUser.organizationId,
        status: foundUser.status || 'active',
        preferences: DEFAULT_USER_PREFERENCES,
      };

      // Create session
      localStorage.setItem('fluffychats_session', JSON.stringify({
        user: userWithoutPassword,
        timestamp: Date.now(),
      }));

      // Load organization
      const orgData = localStorage.getItem('fluffychats_organization');
      if (orgData) {
        setOrganization(JSON.parse(orgData));
      }

      setUser(userWithoutPassword);
      return { success: true };
    } catch {
      return { success: false, error: 'An error occurred. Please try again.' };
    }
  };

  const signup = async (
    name: string,
    email: string,
    password: string,
    role: UserRole
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      // Password validation
      if (password.length < 8) {
        return { success: false, error: 'Password must be at least 8 characters long.' };
      }
      if (!/[A-Z]/.test(password)) {
        return { success: false, error: 'Password must contain at least one uppercase letter.' };
      }
      if (!/[a-z]/.test(password)) {
        return { success: false, error: 'Password must contain at least one lowercase letter.' };
      }
      if (!/[0-9]/.test(password)) {
        return { success: false, error: 'Password must contain at least one number.' };
      }
      if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
        return { success: false, error: 'Password must contain at least one special character.' };
      }

      const storedUsers = localStorage.getItem('fluffychats_users');
      const users: StoredUser[] = storedUsers ? JSON.parse(storedUsers) : [];

      // Check if email already exists
      if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
        return { success: false, error: 'An account with this email already exists.' };
      }

      const passwordHash = await hashPassword(password);
      const newUser: StoredUser = {
        id: `user-${Date.now()}`,
        email,
        name,
        role,
        passwordHash,
        createdAt: new Date().toISOString(),
      };

      users.push(newUser);
      localStorage.setItem('fluffychats_users', JSON.stringify(users));

      const userWithoutPassword: User = {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        createdAt: newUser.createdAt,
        organizationId: 'org-1', // Default org
        status: 'active',
        preferences: DEFAULT_USER_PREFERENCES,
      };

      // Auto login after signup
      localStorage.setItem('fluffychats_session', JSON.stringify({
        user: userWithoutPassword,
        timestamp: Date.now(),
      }));

      // Load organization
      const orgData = localStorage.getItem('fluffychats_organization');
      if (orgData) {
        setOrganization(JSON.parse(orgData));
      }

      setUser(userWithoutPassword);
      return { success: true };
    } catch {
      return { success: false, error: 'An error occurred. Please try again.' };
    }
  };

  const logout = () => {
    localStorage.removeItem('fluffychats_session');
    setUser(null);
    setOrganization(null);
  };

  const canAccess = (path: string): boolean => {
    if (!user) return false;
    return canAccessRoute(user.role, path);
  };

  const updateUser = (updates: Partial<Pick<User, 'name' | 'email' | 'phone' | 'title' | 'avatar'>>) => {
    if (!user) return;

    // Update user state
    const updatedUser = { ...user, ...updates };
    setUser(updatedUser);

    // Update session
    localStorage.setItem('fluffychats_session', JSON.stringify({
      user: updatedUser,
      timestamp: Date.now(),
    }));

    // Update stored users list
    const storedUsers = localStorage.getItem('fluffychats_users');
    if (storedUsers) {
      const users: StoredUser[] = JSON.parse(storedUsers);
      const updatedUsers = users.map(u =>
        u.id === user.id ? { ...u, ...updates } : u
      );
      localStorage.setItem('fluffychats_users', JSON.stringify(updatedUsers));
    }
  };

  const updateOrganization = (updates: Partial<Organization>) => {
    if (!organization) return;

    // Update organization state
    const updatedOrg = { ...organization, ...updates, updatedAt: new Date().toISOString() };
    setOrganization(updatedOrg);

    // Update stored organization
    localStorage.setItem('fluffychats_organization', JSON.stringify(updatedOrg));
  };

  return (
    <AuthContext.Provider value={{
      user,
      organization,
      isAuthenticated: !!user,
      isLoading,
      login,
      signup,
      logout,
      canAccess,
      updateUser,
      updateOrganization,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
