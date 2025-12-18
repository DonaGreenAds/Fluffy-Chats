'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  BarChart3,
  Settings,
  Plug,
  MessageCircle,
  Flame,
  LogOut,
  Crown,
  Shield,
  Eye,
  ChevronDown
} from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '@/context/AuthContext';
import { useLeads } from '@/context/LeadContext';
import { canSeeNavItem } from '@/types/auth';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Leads', href: '/leads', icon: Users },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Integrations', href: '/integrations', icon: Plug },
];

const roleIcons = {
  owner: Crown,
  admin: Shield,
  viewer: Eye,
};

const roleLabels = {
  owner: 'Owner',
  admin: 'Admin',
  viewer: 'Viewer',
};

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { leads } = useLeads();

  // Get leads from the past 3 days
  const recentLeads = useMemo(() => {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const threeDaysAgoStr = threeDaysAgo.toISOString().split('T')[0];

    return leads.filter(l => {
      if (!l.conversation_date) return false;
      return l.conversation_date >= threeDaysAgoStr;
    });
  }, [leads]);

  // Calculate hot leads from past 3 days data
  const hotLeadsCount = useMemo(() => {
    return recentLeads.filter(l => l.is_hot_lead === true).length;
  }, [recentLeads]);

  const handleLogout = () => {
    logout();
    router.push('/auth/login');
  };

  // Filter navigation based on user role
  const filteredNavigation = navigation.filter(item =>
    user ? canSeeNavItem(user.role, item.name) : false
  );

  // Check if user can see settings
  const canSeeSettings = user ? canSeeNavItem(user.role, 'Settings') : false;

  return (
    // 60% - White background (dominant neutral)
    <aside className="fixed left-0 top-0 h-screen w-64 bg-white border-r border-[var(--border)] flex flex-col z-50">
      {/* Logo - 10% accent only on brand icon */}
      <div className="p-6">
        <div className="flex items-center gap-3">
          {/* Only the logo icon uses accent color (10% rule) */}
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--accent-1)] to-[var(--accent-2)] flex items-center justify-center shadow-md">
            <MessageCircle className="w-5 h-5 text-white" />
          </div>
          <div>
            {/* 30% - Dark text for headings */}
            <h1 className="font-bold text-lg text-[var(--text)]">FluffyChats</h1>
            <p className="text-xs text-[var(--muted)]">by Twistify</p>
          </div>
        </div>
      </div>

      {/* User Info - 60% neutral background, 30% text */}
      {user && (
        <div className="px-4 pb-4">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--surface-2)] hover:bg-[var(--surface-3)] transition-colors cursor-pointer">
            {/* Avatar uses subtle gray, not accent */}
            <div className="w-10 h-10 rounded-full bg-[var(--surface-3)] flex items-center justify-center text-[var(--text-2)] font-semibold text-sm">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[var(--text)] truncate">{user.name}</p>
              <p className="text-xs text-[var(--muted)]">@{user.role}</p>
            </div>
            <ChevronDown className="w-4 h-4 text-[var(--muted)]" />
          </div>
        </div>
      )}

      {/* Navigation - 10% accent ONLY on active state */}
      <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
        {filteredNavigation.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== '/' && pathname.startsWith(item.href));

          return (
            <Link
              key={item.name}
              href={item.href}
              className={clsx(
                'group flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                isActive
                  // 10% - Accent ONLY for active state
                  ? 'bg-gradient-to-r from-[var(--accent-1)] to-[var(--accent-2)] text-white shadow-sm'
                  // 30% - Gray text for inactive, 60% - hover uses subtle gray
                  : 'text-[var(--text-2)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]'
              )}
            >
              <item.icon className={clsx(
                "w-5 h-5 transition-colors",
                isActive ? "text-white" : "text-[var(--muted)] group-hover:text-[var(--text-2)]"
              )} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Hot Leads Card - Uses semantic warning color (part of 10%) */}
      <div className="p-4 mt-auto">
        <div className="bg-[var(--surface-2)] rounded-xl p-4 border border-[var(--border)]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {/* Semantic color for status indicator */}
              <div className="p-1.5 bg-[var(--warning-soft)] rounded-lg">
                <Flame className="w-4 h-4 text-[var(--warning)]" />
              </div>
              <span className="font-medium text-sm text-[var(--text)]">Hot Leads</span>
            </div>
            <span className="text-xs text-[var(--muted)]">3 days</span>
          </div>

          <div>
            <span className="text-3xl font-bold text-[var(--text)] tracking-tight">{hotLeadsCount}</span>
            <p className="text-xs text-[var(--muted)] mt-1">High Intent</p>
          </div>
        </div>
      </div>

      {/* Settings & Logout - 30% secondary colors */}
      <div className="p-4 space-y-1 pb-6 border-t border-[var(--border)]">
        {canSeeSettings && (
          <Link
            href="/settings"
            className={clsx(
              'flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
              pathname === '/settings'
                ? 'bg-gradient-to-r from-[var(--accent-1)] to-[var(--accent-2)] text-white shadow-sm'
                : 'text-[var(--text-2)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]'
            )}
          >
            <Settings className="w-5 h-5" />
            Settings
          </Link>
        )}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-[var(--muted)] hover:bg-[var(--danger-soft)] hover:text-[var(--danger)] transition-all"
        >
          <LogOut className="w-5 h-5" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
