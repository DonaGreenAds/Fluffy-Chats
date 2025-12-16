'use client';

import { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Users,
  TrendingUp,
  TrendingDown,
  Phone,
  Clock,
  ChevronRight,
  CheckCircle2,
  ArrowUpRight,
  Flame,
  Globe,
  Zap,
  Thermometer,
  Snowflake,
  Sun
} from 'lucide-react';
import { useLeads } from '@/context/LeadContext';
import { useAuth } from '@/context/AuthContext';

// Mini Sparkline Component
function MiniSparkline({ data, trend }: { data: number[]; trend: 'up' | 'down' | 'neutral' }) {
  if (data.length < 2) return null;

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const points = data.map((v, i) =>
    `${(i / (data.length - 1)) * 56},${24 - ((v - min) / range) * 20}`
  ).join(' ');

  const colorClass = trend === 'up' ? 'text-emerald-400' : trend === 'down' ? 'text-red-400' : 'text-gray-300';

  return (
    <svg className="w-14 h-6" viewBox="0 0 56 24">
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={colorClass}
      />
    </svg>
  );
}

export default function DashboardPage() {
  const { leads, stats } = useLeads();
  const { user } = useAuth();
  const [timeRange, setTimeRange] = useState<'today' | '7d' | '30d'>('7d');
  const [displayName, setDisplayName] = useState('');
  const [greeting, setGreeting] = useState('Welcome back');

  // Time-aware greeting
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 17) setGreeting('Good afternoon');
    else setGreeting('Good evening');
  }, []);

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
      .slice(0, 6);
  }, [leads]);

  const leadStats = useMemo(() => {
    const total = leads.length;
    const previousTotal = Math.floor(total * 0.9);
    const growth = total - previousTotal;
    const growthPercent = Math.round((growth / previousTotal) * 100) || 0;
    return { total, growth, growthPercent };
  }, [leads]);

  const actionableLeads = useMemo(() => {
    return leads
      .filter((l) => l.status !== 'contacted')
      .sort((a, b) => b.conversation_date.localeCompare(a.conversation_date))
      .slice(0, 5);
  }, [leads]);

  const totalMessages = useMemo(() => leads.reduce((acc, l) => acc + l.total_messages, 0), [leads]);
  const avgDuration = useMemo(() => {
    if (leads.length === 0) return 0;
    return Math.round(leads.reduce((acc, l) => acc + l.duration_minutes, 0) / leads.length);
  }, [leads]);

  // Qualified leads (score >= 70)
  const qualifiedLeads = useMemo(() => {
    return leads.filter(l => (l.lead_score || 0) >= 70).length;
  }, [leads]);

  // Hot leads count
  const hotLeadsCount = useMemo(() => {
    return leads.filter(l => l.is_hot_lead).length;
  }, [leads]);

  // Lead temperature breakdown (Hot/Warm/Cold based on score)
  const leadTemperature = useMemo(() => {
    const hot = leads.filter(l => l.is_hot_lead || (l.lead_score || 0) >= 80).length;
    const warm = leads.filter(l => !l.is_hot_lead && (l.lead_score || 0) >= 50 && (l.lead_score || 0) < 80).length;
    const cold = leads.filter(l => !l.is_hot_lead && (l.lead_score || 0) < 50).length;
    return { hot, warm, cold, total: leads.length };
  }, [leads]);

  // Analytics data
  const analyticsData = useMemo(() => {
    const products = Object.entries(
      leads.reduce((acc, l) => {
        acc[l.primary_topic] = (acc[l.primary_topic] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    ).sort((a, b) => b[1] - a[1]).slice(0, 3);

    const regions = Object.entries(
      leads.reduce((acc, l) => {
        const region = l.region || 'Unknown';
        acc[region] = (acc[region] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    ).sort((a, b) => b[1] - a[1]).slice(0, 3);

    return { products, regions };
  }, [leads]);

  // Generate mock sparkline data
  const sparklineData = useMemo(() => ({
    conversations: [4, 6, 5, 8, 7, 9, leads.length],
    qualified: [2, 3, 2, 4, 5, 4, qualifiedLeads],
    avgTime: [15, 12, 14, 11, 13, 12, avgDuration],
    followups: [3, 4, 2, 5, 3, 4, stats.needsFollowup],
  }), [leads.length, qualifiedLeads, avgDuration, stats.needsFollowup]);

  // Key insight generator
  const keyInsight = useMemo(() => {
    if (leadTemperature.hot > 0) {
      const hotPercent = Math.round((leadTemperature.hot / leadTemperature.total) * 100);
      return `${leadTemperature.hot} hot leads (${hotPercent}%) ready for immediate action — prioritize these for quick wins.`;
    }
    if (leadTemperature.warm > 0) {
      return `${leadTemperature.warm} warm leads need nurturing — follow up within 24-48 hours.`;
    }
    return 'Start collecting leads to see insights about your pipeline temperature.';
  }, [leadTemperature]);

  // Priority indicator for follow-ups
  const getPriorityColor = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays >= 3) return 'border-l-red-400';
    if (diffDays >= 1) return 'border-l-amber-400';
    return 'border-l-blue-400';
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 min-h-screen bg-gray-50/50">

      {/* Hero Section - Premium Design */}
      <div className="relative w-full overflow-hidden rounded-2xl bg-white border border-gray-100 shadow-sm">
        {/* Subtle gradient accent */}
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-purple-50/60 via-pink-50/30 to-transparent pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between p-6 lg:p-8">
          {/* Left Content */}
          <div className="flex-1 space-y-4 max-w-xl">
            <div>
              <h1 className="text-2xl lg:text-3xl font-semibold text-gray-900 tracking-tight">
                {greeting}, <span className="text-gray-900">{displayName || 'there'}</span>
              </h1>
              <p className="mt-2 text-base text-gray-500 leading-relaxed">
                You have <span className="font-medium text-gray-800">{actionableLeads.length} pending follow-ups</span> and{' '}
                <span className="font-medium text-gray-800">{hotLeadsCount} hot leads</span> waiting for action.
              </p>
            </div>

            <div className="flex flex-wrap gap-3 pt-1">
              <Link
                href="/leads"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#7427FF] to-[#9D4EDD] text-white rounded-xl font-medium text-sm hover:shadow-lg hover:shadow-purple-200/50 transition-all duration-200"
              >
                View Leads <ArrowUpRight className="w-4 h-4" />
              </Link>
              <Link
                href="/analytics"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-gray-700 border border-gray-200 rounded-xl font-medium text-sm hover:border-gray-300 hover:bg-gray-50 transition-colors"
              >
                View Reports
              </Link>
            </div>
          </div>

          {/* Right: Mascot Stage */}
          <div className="hidden md:block relative w-[280px] h-[240px]">
            {/* Gradient halo blob */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#7427FF]/15 via-[#EE82EE]/10 to-transparent rounded-full blur-3xl scale-110" />
            {/* Secondary subtle blob */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-gradient-to-tr from-purple-200/30 to-pink-200/20 rounded-full blur-2xl" />
            {/* Mascot */}
            <div className="relative z-10 w-full h-full flex items-center justify-center transition-transform duration-500 hover:scale-105 hover:rotate-1">
              <Image
                src="/images/mascot.png"
                alt="Fluffy - Your AI Assistant"
                width={220}
                height={220}
                className="object-contain drop-shadow-xl"
                priority
              />
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards Row - Consistent Design */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Leads */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between mb-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#7427FF] to-[#9D4EDD]">
              <Users className="w-5 h-5 text-white" />
            </div>
            <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
              +{leadStats.growthPercent}% <TrendingUp className="w-3 h-3" />
            </span>
          </div>
          <h3 className="text-2xl lg:text-3xl font-bold text-gray-900">{stats.total}</h3>
          <p className="text-sm text-gray-500 mt-1">Total Leads</p>
        </div>

        {/* Contacted */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 hover:shadow-sm transition-shadow">
          <div className="flex items-start justify-between mb-3">
            <div className="p-2.5 rounded-xl bg-emerald-50">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            </div>
          </div>
          <h3 className="text-2xl lg:text-3xl font-bold text-gray-900">{stats.contacted}</h3>
          <p className="text-sm text-gray-500 mt-1">Contacted</p>
        </div>

        {/* Pending */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 hover:shadow-sm transition-shadow">
          <div className="flex items-start justify-between mb-3">
            <div className="p-2.5 rounded-xl bg-amber-50">
              <Phone className="w-5 h-5 text-amber-500" />
            </div>
            {stats.needsFollowup > 0 && (
              <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
                Action needed
              </span>
            )}
          </div>
          <h3 className="text-2xl lg:text-3xl font-bold text-gray-900">{stats.needsFollowup}</h3>
          <p className="text-sm text-gray-500 mt-1">Pending</p>
        </div>

        {/* Avg Response */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 hover:shadow-sm transition-shadow">
          <div className="flex items-start justify-between mb-3">
            <div className="p-2.5 rounded-xl bg-blue-50">
              <Clock className="w-5 h-5 text-blue-500" />
            </div>
          </div>
          <h3 className="text-2xl lg:text-3xl font-bold text-gray-900">{avgDuration}m</h3>
          <p className="text-sm text-gray-500 mt-1">Avg Response</p>
        </div>
      </div>

      {/* Main Content Row - Compact Cards with Scroll */}
      <div className="grid lg:grid-cols-5 gap-5 items-start">

        {/* Recent Leads - 3 columns - Compact */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col">
          {/* Header */}
          <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-gray-900">Recent Leads</h2>
              <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-md">{recentLeads.length}</span>
            </div>
            <Link
              href="/leads"
              className="text-xs font-medium text-[#7427FF] hover:text-[#5B1FCC] transition-colors"
            >
              View all →
            </Link>
          </div>

          {/* Scrollable Body with fade indicator */}
          <div className="relative">
            <div className="overflow-y-auto max-h-[240px] scrollbar-thin">
              <div className="divide-y divide-gray-50">
                {recentLeads.map((lead) => (
                  <Link
                    key={lead.id}
                    href={`/leads?id=${lead.id}`}
                    className="px-5 py-3 flex items-center justify-between hover:bg-gray-50/70 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-medium text-xs bg-gradient-to-br from-gray-700 to-gray-900">
                          {lead.prospect_name.charAt(0).toUpperCase()}
                        </div>
                        {lead.is_hot_lead && (
                          <div className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-orange-400 ring-2 ring-white flex items-center justify-center">
                            <Flame className="w-1.5 h-1.5 text-white" />
                          </div>
                        )}
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 text-sm">{lead.prospect_name}</h4>
                        <p className="text-xs text-gray-500 truncate max-w-[180px]">
                          {lead.company_name || lead.primary_topic}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 hidden sm:block">
                        {lead.lead_score || 0}
                      </span>
                      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
                    </div>
                  </Link>
                ))}

                {recentLeads.length === 0 && (
                  <div className="p-6 text-center">
                    <Users className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm text-gray-500">No leads yet</p>
                  </div>
                )}
              </div>
            </div>
            {/* Bottom fade indicator */}
            {recentLeads.length > 4 && (
              <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white to-transparent pointer-events-none" />
            )}
          </div>
        </div>

        {/* Follow-ups - 2 columns - Compact */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col">
          {/* Header */}
          <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-gray-900">Follow-ups</h2>
              {actionableLeads.length > 0 && (
                <span className="text-xs font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-md">
                  {actionableLeads.length}
                </span>
              )}
            </div>
            <Link
              href="/leads"
              className="text-xs font-medium text-[#7427FF] hover:text-[#5B1FCC] transition-colors"
            >
              View all →
            </Link>
          </div>

          {/* Scrollable Body with fade */}
          <div className="relative">
            <div className="overflow-y-auto max-h-[240px] p-3 scrollbar-thin">
              <div className="space-y-2">
                {actionableLeads.map((lead) => (
                  <Link
                    key={lead.id}
                    href={`/leads?id=${lead.id}`}
                    className={`block p-3 bg-gray-50 rounded-xl border-l-4 ${getPriorityColor(lead.conversation_date)} hover:bg-gray-100 transition-colors`}
                  >
                    <div className="flex justify-between items-start mb-1.5">
                      <h4 className="font-medium text-gray-900 text-sm">{lead.prospect_name}</h4>
                      <span className="text-xs text-gray-400">{lead.conversation_date}</span>
                    </div>
                    <p className="text-xs text-gray-500 line-clamp-1 mb-2">
                      {lead.next_action || 'Follow up regarding inquiry...'}
                    </p>
                    <span className="text-xs font-medium text-[#7427FF]">
                      Take action →
                    </span>
                  </Link>
                ))}

                {actionableLeads.length === 0 && (
                  <div className="py-8 text-center">
                    <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-emerald-50 flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    </div>
                    <p className="text-sm font-medium text-gray-900">All caught up!</p>
                    <p className="text-xs text-gray-400 mt-0.5">No pending follow-ups</p>
                  </div>
                )}
              </div>
            </div>
            {/* Bottom fade indicator */}
            {actionableLeads.length > 3 && (
              <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white to-transparent pointer-events-none" />
            )}
          </div>
        </div>
      </div>

      {/* Analytics Overview - Premium Module */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Header with Time Range Tabs */}
        <div className="px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-base font-semibold text-gray-900">Analytics Overview</h2>

          {/* Time Range Tabs */}
          <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg w-fit">
            {(['today', '7d', '30d'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  timeRange === range
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {range === 'today' ? 'Today' : range === '7d' ? '7 days' : '30 days'}
              </button>
            ))}
          </div>
        </div>

        {/* Key Insight Banner */}
        <div className="px-6 py-3 bg-gradient-to-r from-[#7427FF]/5 via-purple-50/50 to-[#EE82EE]/5 border-b border-gray-100">
          <p className="text-sm text-gray-700">
            <span className="font-medium text-[#7427FF]">Insight:</span>{' '}
            {keyInsight}
          </p>
        </div>

        {/* KPI Tiles Grid */}
        <div className="p-6 grid grid-cols-2 lg:grid-cols-4 gap-4 border-b border-gray-100">
          {/* Conversations */}
          <div className="p-4 bg-gray-50 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Conversations</span>
              <span className="flex items-center gap-0.5 text-xs font-medium text-emerald-600">
                +12% <TrendingUp className="w-3 h-3" />
              </span>
            </div>
            <div className="flex items-end justify-between">
              <span className="text-2xl font-bold text-gray-900">{stats.total}</span>
              <MiniSparkline data={sparklineData.conversations} trend="up" />
            </div>
          </div>

          {/* Qualified Leads */}
          <div className="p-4 bg-gray-50 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Qualified</span>
              <span className="flex items-center gap-0.5 text-xs font-medium text-emerald-600">
                +8% <TrendingUp className="w-3 h-3" />
              </span>
            </div>
            <div className="flex items-end justify-between">
              <span className="text-2xl font-bold text-gray-900">{qualifiedLeads}</span>
              <MiniSparkline data={sparklineData.qualified} trend="up" />
            </div>
          </div>

          {/* Avg Response Time */}
          <div className="p-4 bg-gray-50 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Avg Time</span>
              <span className="flex items-center gap-0.5 text-xs font-medium text-emerald-600">
                -5% <TrendingDown className="w-3 h-3" />
              </span>
            </div>
            <div className="flex items-end justify-between">
              <span className="text-2xl font-bold text-gray-900">{avgDuration}m</span>
              <MiniSparkline data={sparklineData.avgTime} trend="up" />
            </div>
          </div>

          {/* Follow-ups Due */}
          <div className="p-4 bg-gray-50 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Follow-ups</span>
              {stats.needsFollowup > 0 && (
                <span className="text-xs font-medium text-amber-600">Action needed</span>
              )}
            </div>
            <div className="flex items-end justify-between">
              <span className="text-2xl font-bold text-gray-900">{stats.needsFollowup}</span>
              <MiniSparkline data={sparklineData.followups} trend="neutral" />
            </div>
          </div>
        </div>

        {/* Breakdown Cards */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Lead Temperature */}
          <div className="p-5 bg-gray-50 rounded-xl">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 rounded-lg bg-white shadow-sm">
                <Thermometer className="w-4 h-4 text-gray-600" />
              </div>
              <h3 className="font-semibold text-sm text-gray-800">Lead Temperature</h3>
            </div>
            <div className="space-y-2.5">
              {/* Hot Leads */}
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-red-50 transition-all hover:scale-[1.01]">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
                    <Flame className="w-3.5 h-3.5 text-white" />
                  </div>
                  <span className="text-sm font-medium text-gray-700">Hot</span>
                </div>
                <span className="text-sm font-bold text-gray-900 bg-white px-2.5 py-0.5 rounded-md shadow-sm">
                  {leadTemperature.hot}
                </span>
              </div>

              {/* Warm Leads */}
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-amber-50 transition-all hover:scale-[1.01]">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center">
                    <Sun className="w-3.5 h-3.5 text-white" />
                  </div>
                  <span className="text-sm font-medium text-gray-700">Warm</span>
                </div>
                <span className="text-sm font-bold text-gray-900 bg-white px-2.5 py-0.5 rounded-md shadow-sm">
                  {leadTemperature.warm}
                </span>
              </div>

              {/* Cold Leads */}
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-blue-50 transition-all hover:scale-[1.01]">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center">
                    <Snowflake className="w-3.5 h-3.5 text-white" />
                  </div>
                  <span className="text-sm font-medium text-gray-700">Cold</span>
                </div>
                <span className="text-sm font-bold text-gray-900 bg-white px-2.5 py-0.5 rounded-md shadow-sm">
                  {leadTemperature.cold}
                </span>
              </div>
            </div>
          </div>

          {/* Product Interest */}
          <div className="p-5 bg-gray-50 rounded-xl">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 rounded-lg bg-white shadow-sm">
                <Zap className="w-4 h-4 text-gray-600" />
              </div>
              <h3 className="font-semibold text-sm text-gray-800">Product Interest</h3>
            </div>
            <div className="space-y-3">
              {analyticsData.products.length > 0 ? (
                (() => {
                  const maxCount = analyticsData.products[0]?.[1] || 1;
                  return analyticsData.products.map(([topic, count]) => (
                    <div key={topic} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-700 truncate max-w-[65%]">{topic}</span>
                        <span className="text-sm font-semibold text-gray-900">{count}</span>
                      </div>
                      <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-[#7427FF] to-[#9D4EDD] rounded-full transition-all duration-500"
                          style={{ width: `${(count / maxCount) * 100}%` }}
                        />
                      </div>
                    </div>
                  ));
                })()
              ) : (
                <p className="text-sm text-gray-400">No data yet</p>
              )}
            </div>
          </div>

          {/* Regions */}
          <div className="p-5 bg-gray-50 rounded-xl">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 rounded-lg bg-white shadow-sm">
                <Globe className="w-4 h-4 text-gray-600" />
              </div>
              <h3 className="font-semibold text-sm text-gray-800">Regions</h3>
            </div>
            <div className="space-y-2">
              {analyticsData.regions.length > 0 ? (
                (() => {
                  const colors = [
                    { dot: 'bg-[#7427FF]', bg: 'bg-purple-50' },
                    { dot: 'bg-[#9D4EDD]', bg: 'bg-violet-50' },
                    { dot: 'bg-[#EE82EE]', bg: 'bg-pink-50' },
                  ];
                  return analyticsData.regions.map(([region, count], index) => (
                    <div
                      key={region}
                      className={`flex items-center justify-between p-2.5 rounded-lg ${colors[index]?.bg || 'bg-gray-100'} transition-all hover:scale-[1.01]`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-2 h-2 rounded-full ${colors[index]?.dot || 'bg-gray-400'}`} />
                        <span className="text-sm font-medium text-gray-700">{region}</span>
                      </div>
                      <span className="text-sm font-bold text-gray-900 bg-white px-2 py-0.5 rounded-md shadow-sm">
                        {count}
                      </span>
                    </div>
                  ));
                })()
              ) : (
                <p className="text-sm text-gray-400">No data yet</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
