'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Users,
  TrendingUp,
  Phone,
  Building2,
  Clock,
  ChevronRight,
  MessageCircle,
  Calendar,
  Mail,
  CheckCircle2,
  ArrowUpRight,
  MoreHorizontal,
  Filter,
  Flame,
  Globe
} from 'lucide-react';
import { useLeads } from '@/context/LeadContext';
import { useAuth } from '@/context/AuthContext';
import clsx from 'clsx';

export default function DashboardPage() {
  const { leads, stats } = useLeads();
  const { user } = useAuth();
  const [leadFilter, setLeadFilter] = useState('all');

  const [displayName, setDisplayName] = useState('');

  useMemo(() => {
    if (user?.name) {
      setDisplayName(user.name.split(' ')[0]);
    }
  }, [user?.name]);

  useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedSettings = localStorage.getItem('fluffychats_settings');
        if (savedSettings) {
          const settings = JSON.parse(savedSettings);
          if (settings.profile?.name) {
            setDisplayName(settings.profile.name.split(' ')[0]);
          }
        }
      } catch { }
    }
  });

  const recentLeads = useMemo(() => {
    return [...leads]
      .sort((a, b) => b.conversation_date.localeCompare(a.conversation_date))
      .slice(0, 5);
  }, [leads]);

  const leadStats = useMemo(() => {
    const total = leads.length;
    const previousTotal = Math.floor(total * 0.9);
    const growth = total - previousTotal;
    const growthPercent = Math.round((growth / previousTotal) * 100);
    return { total, growth, growthPercent };
  }, [leads]);

  const actionableLeads = useMemo(() => {
    return leads
      .filter((l) => l.status !== 'contacted')
      .sort((a, b) => b.conversation_date.localeCompare(a.conversation_date))
      .slice(0, 4);
  }, [leads]);

  const totalMessages = useMemo(() => leads.reduce((acc, l) => acc + l.total_messages, 0), [leads]);
  const avgDuration = useMemo(() => {
    if (leads.length === 0) return 0;
    return Math.round(leads.reduce((acc, l) => acc + l.duration_minutes, 0) / leads.length);
  }, [leads]);

  return (
    <div className="p-8 space-y-8 min-h-screen bg-gray-50/50">

      {/* Hero Section - Glassmorphism here only */}
      <div className="relative w-full overflow-hidden rounded-2xl bg-white/70 backdrop-blur-xl border border-white/50 shadow-sm">
        {/* Soft radial gradient on right side only */}
        <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-purple-100/40 via-pink-50/20 to-transparent pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between p-8">
          <div className="flex-1 space-y-4 max-w-xl">
            <h1 className="text-3xl font-semibold text-gray-900 tracking-tight">
              Welcome back, <span className="text-gray-900">{displayName || 'there'}</span>
            </h1>
            <p className="text-base text-gray-500 leading-relaxed">
              You have <span className="font-medium text-gray-700">{actionableLeads.length} pending follow-ups</span> that need your attention.
            </p>
            <div className="pt-2 flex flex-wrap gap-3">
              <button className="px-5 py-2.5 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors flex items-center gap-2 text-sm">
                View Reports <ArrowUpRight className="w-4 h-4" />
              </button>
              <button className="px-5 py-2.5 bg-white text-gray-600 border border-gray-200 rounded-lg font-medium hover:bg-gray-50 hover:border-gray-300 transition-colors text-sm">
                Manage Leads
              </button>
            </div>
          </div>
          <div className="hidden md:block relative w-[240px] h-[240px] -my-4">
            <Image
              src="/images/mascot.png"
              alt="Dashboard Mascot"
              fill
              className="object-contain drop-shadow-lg"
              priority
            />
          </div>
        </div>
      </div>

      {/* Stats Cards - Total Leads emphasized, others quiet */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Leads - Primary/Emphasized */}
        <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between mb-4">
            <div className="p-2.5 rounded-lg bg-gradient-to-br from-purple-500/80 to-indigo-500/80">
              <Users className="w-5 h-5 text-white" />
            </div>
            <span className="flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">
              +{leadStats.growthPercent}% <TrendingUp className="w-3 h-3" />
            </span>
          </div>
          <div>
            <h3 className="text-3xl font-bold text-gray-900 mb-1">{stats.total}</h3>
            <p className="text-sm text-gray-500">Total Leads</p>
          </div>
        </div>

        {/* Contacted - Quiet */}
        <div className="bg-white rounded-xl p-6 border border-gray-100 hover:border-gray-200 transition-colors">
          <div className="flex items-start justify-between mb-4">
            <div className="p-2.5 rounded-lg bg-emerald-50">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-bold text-gray-900 mb-1">{stats.contacted}</h3>
            <p className="text-sm text-gray-400">Contacted</p>
          </div>
        </div>

        {/* Needs Follow-up - Quiet */}
        <div className="bg-white rounded-xl p-6 border border-gray-100 hover:border-gray-200 transition-colors">
          <div className="flex items-start justify-between mb-4">
            <div className="p-2.5 rounded-lg bg-orange-50">
              <Phone className="w-5 h-5 text-orange-500" />
            </div>
            {stats.needsFollowup > 0 && (
              <span className="text-xs font-medium text-orange-600 bg-orange-50 px-2 py-1 rounded-full">
                Action needed
              </span>
            )}
          </div>
          <div>
            <h3 className="text-2xl font-bold text-gray-900 mb-1">{stats.needsFollowup}</h3>
            <p className="text-sm text-gray-400">Pending</p>
          </div>
        </div>

        {/* Avg Duration - Quiet */}
        <div className="bg-white rounded-xl p-6 border border-gray-100 hover:border-gray-200 transition-colors">
          <div className="flex items-start justify-between mb-4">
            <div className="p-2.5 rounded-lg bg-blue-50">
              <Clock className="w-5 h-5 text-blue-500" />
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-bold text-gray-900 mb-1">{avgDuration}m</h3>
            <p className="text-sm text-gray-400">Avg Response</p>
          </div>
        </div>
      </div>

      {/* Main Content Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Recent Leads Column */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Recent Leads</h2>
            <Link href="/leads" className="text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors">
              View all →
            </Link>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="divide-y divide-gray-50">
              {recentLeads.map((lead) => (
                <div key={lead.id} className="p-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors group">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-medium text-sm bg-gradient-to-br from-gray-700 to-gray-900">
                        {lead.prospect_name.charAt(0)}
                      </div>
                      {lead.is_hot_lead && (
                        <div className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-orange-400 border-2 border-white" />
                      )}
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">{lead.prospect_name}</h4>
                      <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                        <span>{lead.company_name || 'No company'}</span>
                        <span>·</span>
                        <span>{lead.primary_topic}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="text-xs font-medium text-gray-400 hidden sm:block">
                      {lead.lead_score || 0} pts
                    </span>
                    <button className="p-2 text-gray-300 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all opacity-0 group-hover:opacity-100">
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Follow-ups Column */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Follow-ups</h2>
            <span className="text-xs font-medium text-gray-400">{actionableLeads.length} pending</span>
          </div>

          <div className="space-y-3">
            {actionableLeads.map((lead) => (
              <div key={lead.id} className="bg-white rounded-xl p-4 border border-gray-100 border-l-2 border-l-blue-400 hover:border-gray-200 transition-colors group">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-medium text-gray-900 text-sm">{lead.prospect_name}</h4>
                  <span className="text-xs text-gray-400">{lead.conversation_date}</span>
                </div>
                <p className="text-xs text-gray-500 line-clamp-2 mb-3">
                  {lead.next_action || 'Follow up regarding recent inquiry...'}
                </p>
                <Link
                  href={`/leads?id=${lead.id}`}
                  className="text-xs font-medium text-gray-400 hover:text-blue-600 transition-colors"
                >
                  Take action →
                </Link>
              </div>
            ))}

            {actionableLeads.length === 0 && (
              <div className="bg-white rounded-xl p-8 border border-gray-100 text-center">
                <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-400" />
                <p className="text-sm text-gray-500">All caught up!</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Analytics Bento Grid - Enhanced Visual Design */}
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <div className="h-8 w-1 rounded-full bg-gradient-to-b from-purple-500 to-pink-500" />
          <h2 className="text-xl font-semibold text-gray-900">Analytics Overview</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">

          {/* Top Use Cases - Enhanced */}
          <div className="group bg-white rounded-2xl border border-gray-100 overflow-hidden flex flex-col hover:shadow-lg hover:shadow-purple-100/50 hover:border-purple-100 transition-all duration-300">
            <div className="px-5 py-4 border-b border-gray-50 bg-gradient-to-r from-gray-50/80 to-white">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gradient-to-br from-rose-400 to-orange-400 shadow-sm shadow-rose-200">
                  <Users className="w-4 h-4 text-white" />
                </div>
                <h3 className="font-semibold text-sm text-gray-800">Top Use Cases</h3>
              </div>
            </div>
            <div className="p-5 flex-1">
              <div className="space-y-4">
                {(() => {
                  const useCaseData = Object.entries(
                    leads.reduce((acc, l) => {
                      acc[l.use_case_category] = (acc[l.use_case_category] || 0) + 1;
                      return acc;
                    }, {} as Record<string, number>)
                  ).sort((a, b) => b[1] - a[1]).slice(0, 3);
                  const maxCount = useCaseData[0]?.[1] || 1;
                  const colors = ['from-rose-400 to-orange-400', 'from-amber-400 to-yellow-400', 'from-lime-400 to-green-400'];
                  return useCaseData.map(([category, count], index) => (
                    <div key={category} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">{category}</span>
                        <span className="text-sm font-bold text-gray-900">{count}</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full bg-gradient-to-r ${colors[index]} rounded-full transition-all duration-500 ease-out`}
                          style={{ width: `${(count / maxCount) * 100}%` }}
                        />
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>
          </div>

          {/* Product Interest - Enhanced */}
          <div className="group bg-white rounded-2xl border border-gray-100 overflow-hidden flex flex-col hover:shadow-lg hover:shadow-blue-100/50 hover:border-blue-100 transition-all duration-300">
            <div className="px-5 py-4 border-b border-gray-50 bg-gradient-to-r from-gray-50/80 to-white">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gradient-to-br from-blue-400 to-indigo-500 shadow-sm shadow-blue-200">
                  <TrendingUp className="w-4 h-4 text-white" />
                </div>
                <h3 className="font-semibold text-sm text-gray-800">Product Interest</h3>
              </div>
            </div>
            <div className="p-5 flex-1">
              <div className="space-y-4">
                {(() => {
                  const productData = Object.entries(
                    leads.reduce((acc, l) => {
                      acc[l.primary_topic] = (acc[l.primary_topic] || 0) + 1;
                      return acc;
                    }, {} as Record<string, number>)
                  ).sort((a, b) => b[1] - a[1]).slice(0, 3);
                  const maxCount = productData[0]?.[1] || 1;
                  const colors = ['from-blue-400 to-indigo-500', 'from-cyan-400 to-blue-400', 'from-teal-400 to-cyan-400'];
                  return productData.map(([topic, count], index) => (
                    <div key={topic} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700 truncate max-w-[65%]">{topic}</span>
                        <span className="text-sm font-bold text-gray-900">{count}</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full bg-gradient-to-r ${colors[index]} rounded-full transition-all duration-500 ease-out`}
                          style={{ width: `${(count / maxCount) * 100}%` }}
                        />
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>
          </div>

          {/* Top Regions - Enhanced with colored dots */}
          <div className="group bg-white rounded-2xl border border-gray-100 overflow-hidden flex flex-col hover:shadow-lg hover:shadow-emerald-100/50 hover:border-emerald-100 transition-all duration-300">
            <div className="px-5 py-4 border-b border-gray-50 bg-gradient-to-r from-gray-50/80 to-white">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 shadow-sm shadow-emerald-200">
                  <Globe className="w-4 h-4 text-white" />
                </div>
                <h3 className="font-semibold text-sm text-gray-800">Regions</h3>
              </div>
            </div>
            <div className="p-5 flex-1">
              <div className="space-y-4">
                {(() => {
                  const regionData = Object.entries(
                    leads.reduce((acc, l) => {
                      const region = l.region || 'Unknown';
                      acc[region] = (acc[region] || 0) + 1;
                      return acc;
                    }, {} as Record<string, number>)
                  ).sort((a, b) => b[1] - a[1]).slice(0, 3);
                  const dotColors = ['bg-emerald-500', 'bg-teal-400', 'bg-cyan-400'];
                  const bgColors = ['bg-emerald-50', 'bg-teal-50', 'bg-cyan-50'];
                  return regionData.map(([region, count], index) => (
                    <div key={region} className={`flex items-center justify-between p-2.5 rounded-xl ${bgColors[index]} transition-all hover:scale-[1.02]`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-2.5 h-2.5 rounded-full ${dotColors[index]} shadow-sm`} />
                        <span className="text-sm font-medium text-gray-700">{region}</span>
                      </div>
                      <span className="text-sm font-bold text-gray-900 bg-white px-2.5 py-0.5 rounded-lg shadow-sm">{count}</span>
                    </div>
                  ));
                })()}
              </div>
            </div>
          </div>

          {/* Fluffy Stats - Full gradient card */}
          <div className="group relative rounded-2xl overflow-hidden flex flex-col hover:shadow-xl hover:shadow-purple-200/50 transition-all duration-300 hover:scale-[1.02]">
            {/* Animated gradient background */}
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500" />
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-white/20" />

            {/* Decorative circles */}
            <div className="absolute -top-6 -right-6 w-24 h-24 bg-white/10 rounded-full blur-xl" />
            <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-white/10 rounded-full blur-xl" />

            <div className="relative z-10 px-5 py-4 border-b border-white/20">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-white/20 backdrop-blur-sm">
                  <MessageCircle className="w-4 h-4 text-white" />
                </div>
                <h3 className="font-semibold text-sm text-white">Fluffy Stats</h3>
              </div>
            </div>
            <div className="relative z-10 p-5 flex-1">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-xl bg-white/15 backdrop-blur-sm hover:bg-white/25 transition-colors">
                  <span className="text-sm text-white/80">Total Leads</span>
                  <span className="text-lg font-bold text-white">{stats.total}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-white/15 backdrop-blur-sm hover:bg-white/25 transition-colors">
                  <span className="text-sm text-white/80">Avg Time</span>
                  <span className="text-lg font-bold text-white">{avgDuration}m</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-white/15 backdrop-blur-sm hover:bg-white/25 transition-colors">
                  <span className="text-sm text-white/80">Msgs / Lead</span>
                  <span className="text-lg font-bold text-white">{Math.round(totalMessages / (leads.length || 1))}</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
