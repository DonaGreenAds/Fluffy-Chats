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
    <aside className="fixed left-0 top-0 h-screen w-64 bg-white border-r border-gray-100 flex flex-col z-50">
      {/* Logo */}
      <div className="p-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#8B5CF6] to-[#D946EF] flex items-center justify-center shadow-lg shadow-purple-500/20">
            <MessageCircle className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg text-gray-900">FluffyChats</h1>
            <p className="text-xs text-gray-400 font-medium">by Twistify</p>
          </div>
        </div>
      </div>

      {/* User Info */}
      {user && (
        <div className="px-4 pb-4">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center text-[#8B5CF6] font-semibold text-sm">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800 truncate">{user.name}</p>
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <span>@{user.role}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-4 space-y-1 overflow-y-auto custom-scrollbar">
        {filteredNavigation.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== '/' && pathname.startsWith(item.href));

          return (
            <Link
              key={item.name}
              href={item.href}
              className={clsx(
                'group flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-gradient-to-r from-[#8B5CF6] to-[#D946EF] text-white shadow-lg shadow-purple-500/30'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-[#8B5CF6]'
              )}
            >
              <item.icon className={clsx(
                "w-5 h-5 transition-colors",
                isActive ? "text-white" : "text-gray-400 group-hover:text-[#8B5CF6]"
              )} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Hot Leads Indicator */}
      <div className="p-4 mt-auto">
        <div className="bg-gradient-to-r from-[#FEF3E2] via-[#FDE8D7] to-[#FCE0F0] rounded-2xl p-4 transition-all">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-white/60 rounded-lg">
                <Flame className="w-4 h-4 text-[#F97316]" />
              </div>
              <span className="font-semibold text-sm text-[#F97316]">Hot Leads</span>
            </div>
            <span className="text-xs font-medium text-[#F97316]">3 days</span>
          </div>

          <div className="space-y-1">
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-bold text-gray-900 tracking-tight">{hotLeadsCount}</span>
            </div>
            <span className="text-xs text-gray-500 font-medium">High Intent</span>
          </div>
        </div>
      </div>

      {/* Settings & Logout */}
      <div className="p-4 space-y-1 pb-6">
        {canSeeSettings && (
          <Link
            href="/settings"
            className={clsx(
              'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200',
              pathname === '/settings'
                ? 'bg-gradient-to-r from-[#8B5CF6] to-[#D946EF] text-white shadow-lg shadow-purple-500/30'
                : 'text-gray-600 hover:bg-gray-50 hover:text-[#8B5CF6]'
            )}
          >
            <Settings className="w-5 h-5" />
            Settings
          </Link>
        )}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-500 hover:bg-red-50 hover:text-red-500 transition-all"
        >
          <LogOut className="w-5 h-5" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
