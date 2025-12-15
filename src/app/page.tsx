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

  // Get first name from full name
  useMemo(() => { // Using useMemo for initial user context, but effect for localStorage
    if (user?.name) {
      setDisplayName(user.name.split(' ')[0]);
    }
  }, [user?.name]);

  // Check valid settings on mount
  useState(() => { // actually useEffect
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

  // Lead stats for the card
  const leadStats = useMemo(() => {
    const total = leads.length;
    const previousTotal = Math.floor(total * 0.9); // Mock previous data
    const growth = total - previousTotal;
    const growthPercent = Math.round((growth / previousTotal) * 100);
    return { total, growth, growthPercent };
  }, [leads]);

  // ALL uncontacted leads for pending follow-ups
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
    <div className="p-6 space-y-6 min-h-screen bg-[var(--color-neutral-bg)]">

      {/* Hero Section */}
      <div className="relative w-full overflow-hidden rounded-3xl glass-card animate-fade-in group">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-purple-100/50 to-transparent pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between p-6 md:p-8">
          <div className="flex-1 space-y-3 max-w-xl">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight">
              Hello, <span className="bg-gradient-to-r from-[var(--color-brand-start)] to-[var(--color-brand-end)] bg-clip-text text-transparent">{displayName || 'Owner'}</span>!
            </h1>
            <p className="text-base text-gray-600 leading-relaxed">
              Here's what's happening today. You have <span className="font-semibold text-gray-900">{actionableLeads.length} pending follow-ups</span>.
            </p>
            <div className="pt-2 flex flex-wrap gap-3">
              <button className="px-5 py-2.5 bg-gray-900 text-white rounded-xl font-medium shadow-lg shadow-gray-900/20 hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center gap-2 text-sm">
                View Reports <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
              <button className="px-5 py-2.5 bg-white text-gray-700 border border-gray-200 rounded-xl font-medium hover:bg-gray-50 transition-colors text-sm">
                Manage Leads
              </button>
            </div>
          </div>
          <div className="hidden md:block relative w-[280px] h-[280px] -my-10 -mr-6 animate-float">
            <Image
              src="/images/mascot.png"
              alt="Dashboard Mascot"
              fill
              className="object-contain drop-shadow-2xl"
              priority
            />
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Leads */}
        <div className="glass-card rounded-xl p-5 hover:-translate-y-1 transition-transform duration-300">
          <div className="flex items-start justify-between mb-3">
            <div className="p-2.5 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 shadow-lg shadow-purple-500/20">
              <Users className="w-5 h-5 text-white" />
            </div>
            <span className="flex items-center gap-1 text-[10px] font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full border border-green-100">
              +{leadStats.growthPercent}% <TrendingUp className="w-3 h-3" />
            </span>
          </div>
          <div>
            <h3 className="text-2xl font-bold text-gray-900 mb-0.5">{stats.total}</h3>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Total Leads</p>
          </div>
        </div>

        {/* Contacted */}
        <div className="glass-card rounded-xl p-5 hover:-translate-y-1 transition-transform duration-300">
          <div className="flex items-start justify-between mb-3">
            <div className="p-2.5 rounded-lg bg-gradient-to-br from-[var(--color-accent-green)] to-emerald-500 shadow-lg shadow-green-500/20">
              <CheckCircle2 className="w-5 h-5 text-white" />
            </div>
            <span className="text-[10px] font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded-full border border-gray-100">
              Today
            </span>
          </div>
          <div>
            <h3 className="text-2xl font-bold text-gray-900 mb-0.5">{stats.contacted}</h3>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Contacted</p>
          </div>
        </div>

        {/* Needs Follow-up */}
        <div className="glass-card rounded-xl p-5 hover:-translate-y-1 transition-transform duration-300 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-orange-400/10 to-red-400/10 rounded-bl-full -mr-4 -mt-4" />
          <div className="flex items-start justify-between mb-3">
            <div className="p-2.5 rounded-lg bg-gradient-to-br from-[var(--color-accent-orange)] to-red-500 shadow-lg shadow-orange-500/20">
              <Phone className="w-5 h-5 text-white" />
            </div>
            {stats.needsFollowup > 0 && (
              <span className="flex items-center gap-1 text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded-full border border-orange-100 animate-pulse">
                Action
              </span>
            )}
          </div>
          <div>
            <h3 className="text-2xl font-bold text-gray-900 mb-0.5">{stats.needsFollowup}</h3>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Pending</p>
          </div>
        </div>

        {/* Avg Duration */}
        <div className="glass-card rounded-xl p-5 hover:-translate-y-1 transition-transform duration-300">
          <div className="flex items-start justify-between mb-3">
            <div className="p-2.5 rounded-lg bg-gradient-to-br from-[var(--color-accent-blue)] to-blue-600 shadow-lg shadow-blue-500/20">
              <Clock className="w-5 h-5 text-white" />
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-bold text-gray-900 mb-0.5">{avgDuration}m</h3>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Avg Time</p>
          </div>
        </div>
      </div>

      {/* Main Content Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Recent Leads Column */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">Recent Leads</h2>
            <div className="flex items-center gap-2">
              <button className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                <Filter className="w-4 h-4" />
              </button>
              <Link href="/leads" className="text-xs font-bold text-[var(--color-brand-start)] hover:text-purple-700 transition-colors bg-purple-50 px-3 py-1.5 rounded-lg">
                View All
              </Link>
            </div>
          </div>

          <div className="glass-panel rounded-xl overflow-hidden shadow-sm border border-gray-100/50">
            <div className="divide-y divide-gray-50">
              {recentLeads.map((lead, idx) => (
                <div key={lead.id} className="p-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors group">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm bg-gradient-to-br from-indigo-500 to-purple-600 shadow-sm ring-2 ring-white">
                        {lead.prospect_name.charAt(0)}
                      </div>
                      <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-white flex items-center justify-center">
                        <div className={clsx("w-2.5 h-2.5 rounded-full", lead.is_hot_lead ? "bg-[var(--color-accent-orange)]" : "bg-green-400")} />
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm text-gray-900 group-hover:text-[var(--color-brand-start)] transition-colors">{lead.prospect_name}</h4>
                      <div className="flex items-center gap-2 text-[10px] text-gray-500 mt-0.5">
                        <span className="flex items-center gap-1 max-w-[100px] truncate"><Building2 className="w-3 h-3" /> {lead.company_name || 'N/A'}</span>
                        <span className="w-0.5 h-0.5 rounded-full bg-gray-300" />
                        <span>{lead.primary_topic}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right hidden sm:block">
                      <p className="text-[10px] font-bold text-gray-700 bg-gray-100 px-2 py-0.5 rounded-full inline-block">{lead.lead_score || 0} Score</p>
                    </div>
                    <button className="p-1.5 text-gray-300 hover:text-[var(--color-brand-start)] hover:bg-purple-50 rounded-lg transition-all">
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
            <h2 className="text-lg font-bold text-gray-900">Follow-ups</h2>
            <span className="text-[10px] font-bold bg-blue-50 text-blue-600 px-2 py-1 rounded-full border border-blue-100">{actionableLeads.length} pending</span>
          </div>

          <div className="space-y-3">
            {actionableLeads.map((lead, idx) => (
              <div key={lead.id} className="glass-card rounded-xl p-3.5 hover:shadow-md transition-all group border-l-[3px] border-l-[var(--color-accent-blue)] flex flex-col gap-2">
                <div className="flex justify-between items-start">
                  <h4 className="font-semibold text-sm text-gray-900 line-clamp-1">{lead.prospect_name}</h4>
                  <span className="text-[10px] text-gray-400 font-medium bg-gray-50 px-1.5 py-0.5 rounded">{lead.conversation_date}</span>
                </div>
                <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                  {lead.next_action || 'Follow up regarding recent inquiry...'}
                </p>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[10px] font-semibold text-gray-400 flex items-center gap-1">
                    <Phone className="w-3 h-3" /> Call
                  </span>
                  <Link href={`/leads?id=${lead.id}`} className="text-[10px] font-bold text-[var(--color-brand-start)] bg-purple-50 px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                    Action
                  </Link>
                </div>
              </div>
            ))}

            {actionableLeads.length === 0 && (
              <div className="p-8 text-center glass-panel rounded-xl text-gray-500">
                <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-green-400 opacity-50" />
                <p className="text-sm">All caught up!</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bento Grid Summary - Improved Spacing */}
      <div className="pt-2">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Analytics Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

          {/* Top Use Cases */}
          <div className="glass-card rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-1.5 bg-pink-50 rounded-lg text-pink-600 border border-pink-100">
                <Users className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-sm text-gray-900">Top Use Cases</h3>
            </div>
            <div className="space-y-3">
              {Object.entries(
                leads.reduce((acc, l) => {
                  acc[l.use_case_category] = (acc[l.use_case_category] || 0) + 1;
                  return acc;
                }, {} as Record<string, number>)
              )
                .sort((a, b) => b[1] - a[1])
                .slice(0, 3)
                .map(([category, count]) => (
                  <div key={category} className="flex items-center justify-between group">
                    <span className="text-xs font-medium text-gray-600 group-hover:text-gray-900 transition-colors">{category}</span>
                    <span className="text-xs font-bold text-gray-900 bg-gray-50 px-2 py-0.5 rounded-full border border-gray-100">{count}</span>
                  </div>
                ))}
            </div>
          </div>

          {/* Product Interest (Numbers) */}
          <div className="glass-card rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-1.5 bg-purple-50 rounded-lg text-purple-600 border border-purple-100">
                <TrendingUp className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-sm text-gray-900">Product Interest</h3>
            </div>
            <div className="space-y-3">
              {Object.entries(
                leads.reduce((acc, l) => {
                  acc[l.primary_topic] = (acc[l.primary_topic] || 0) + 1;
                  return acc;
                }, {} as Record<string, number>)
              )
                .sort((a, b) => b[1] - a[1])
                .slice(0, 3)
                .map(([topic, count], i) => (
                  <div key={topic} className="flex items-center justify-between border-b border-gray-50 pb-2 last:border-0 last:pb-0">
                    <span className="text-xs font-medium text-gray-700 truncate max-w-[70%]">{topic}</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-[var(--color-brand-start)]">{count}</span>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Top Regions */}
          <div className="glass-card rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-1.5 bg-blue-50 rounded-lg text-blue-600 border border-blue-100">
                <Globe className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-sm text-gray-900">Regions</h3>
            </div>
            <div className="space-y-3">
              {Object.entries(
                leads.reduce((acc, l) => {
                  const region = l.region || 'Unknown';
                  acc[region] = (acc[region] || 0) + 1;
                  return acc;
                }, {} as Record<string, number>)
              )
                .sort((a, b) => b[1] - a[1])
                .slice(0, 3)
                .map(([region, count]) => (
                  <div key={region} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
                      <span className="text-xs font-medium text-gray-700">{region}</span>
                    </div>
                    <span className="text-xs font-bold text-gray-900">{count}</span>
                  </div>
                ))}
            </div>
          </div>

          {/* Fluffy Stats */}
          <div className="rounded-xl p-5 bg-gradient-to-br from-[var(--color-brand-start)] to-[var(--color-brand-end)] text-white shadow-md">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-1.5 bg-white/20 rounded-lg">
                <MessageCircle className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-sm">Fluffy Stats</h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-white/80">Total Leads</span>
                <span className="text-xs font-bold">{stats.total}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-white/80">Avg Time</span>
                <span className="text-xs font-bold">{avgDuration}m</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-white/80">Msgs / Lead</span>
                <span className="text-xs font-bold">{Math.round(totalMessages / (leads.length || 1))}</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
