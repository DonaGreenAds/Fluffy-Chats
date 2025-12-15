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
  Eye
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

  // Calculate leads needing action from past 3 days (new status or needs immediate followup)
  const needsActionCount = useMemo(() => {
    return recentLeads.filter(l => l.needs_immediate_followup === true || l.status === 'new' || !l.status).length;
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

  const RoleIcon = user ? roleIcons[user.role] : Eye;

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-white/70 backdrop-blur-xl border-r border-white/40 flex flex-col z-50 shadow-[var(--shadow-glass)]">
      {/* Logo */}
      <div className="p-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--color-brand-start)] to-[var(--color-brand-end)] flex items-center justify-center shadow-lg shadow-purple-500/20">
            <MessageCircle className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">FluffyChats</h1>
            <p className="text-xs text-gray-500 font-medium">by Telinfy</p>
          </div>
        </div>
      </div>

      {/* User Info */}
      {user && (
        <div className="px-6 pb-6">
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/50 border border-white/50 shadow-sm">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center text-[var(--color-brand-start)] font-bold border border-white">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800 truncate">{user.name}</p>
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <RoleIcon className="w-3 h-3" />
                {roleLabels[user.role]}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-4 space-y-2 overflow-y-auto custom-scrollbar">
        {filteredNavigation.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== '/' && pathname.startsWith(item.href));

          return (
            <Link
              key={item.name}
              href={item.href}
              className={clsx(
                'group flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-gradient-to-r from-[var(--color-brand-start)] to-[var(--color-brand-end)] text-white shadow-md shadow-purple-500/25 translate-x-1'
                  : 'text-gray-600 hover:bg-white/60 hover:text-[var(--color-brand-start)] hover:shadow-sm'
              )}
            >
              <item.icon className={clsx(
                "w-5 h-5 transition-colors",
                isActive ? "text-white" : "text-gray-400 group-hover:text-[var(--color-brand-start)]"
              )} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Hot Leads Indicator */}
      <div className="p-4 mt-auto">
        <div className="bg-gradient-to-br from-orange-50 to-white border border-orange-100/60 rounded-2xl p-4 shadow-[0_2px_12px_-4px_rgba(249,115,22,0.15)] group hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-orange-100/50 rounded-lg text-orange-500">
                <Flame className="w-4 h-4" />
              </div>
              <span className="font-semibold text-sm text-gray-700">Hot Leads</span>
            </div>
            <span className="text-[10px] font-medium text-orange-400 bg-orange-50 px-2 py-0.5 rounded-full">3 days</span>
          </div>

          <div className="space-y-1">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-gray-900 tracking-tight">{hotLeadsCount}</span>
              <span className="text-xs text-gray-500 font-medium">high intent</span>
            </div>

            {needsActionCount > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-orange-600 font-medium pt-1">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
                </span>
                {needsActionCount} require attention
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Settings & Logout */}
      <div className="p-4 space-y-2 pb-6">
        {canSeeSettings && (
          <Link
            href="/settings"
            className={clsx(
              'flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-all duration-200',
              pathname === '/settings'
                ? 'bg-gradient-to-r from-[var(--color-brand-start)] to-[var(--color-brand-end)] text-white shadow-md shadow-purple-500/25'
                : 'text-gray-600 hover:bg-white/60 hover:text-[var(--color-brand-start)] hover:shadow-sm'
            )}
          >
            <Settings className="w-5 h-5" />
            Settings
          </Link>
        )}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 transition-all border border-transparent hover:border-red-100"
        >
          <LogOut className="w-5 h-5" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
