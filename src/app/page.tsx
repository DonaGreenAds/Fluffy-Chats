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
function MiniSparkline({ data, trend }: { data: number[]; trend: 'up' | 'down' | 'warning' | 'neutral' }) {
  if (data.length < 2) return null;

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const points = data.map((v, i) =>
    `${(i / (data.length - 1)) * 56},${24 - ((v - min) / range) * 20}`
  ).join(' ');

  // Colors: green for up, red for down, amber for warning (action needed), violet for neutral
  const strokeColor = trend === 'up' ? 'var(--success)' : trend === 'down' ? 'var(--danger)' : trend === 'warning' ? '#FBBF24' : 'var(--accent-1)';

  return (
    <svg className="w-14 h-6" viewBox="0 0 56 24">
      <polyline
        points={points}
        fill="none"
        stroke={strokeColor}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
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

  return (
    <div className="p-6 lg:p-8 space-y-6 min-h-screen bg-[var(--bg)]">

      {/* Hero Section - Clean with Purple Accent */}
      <div className="relative w-full overflow-hidden rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-[var(--shadow-card)]">
        {/* Subtle purple gradient accent on right */}
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-[var(--accent-soft)] via-[var(--accent-soft-2)] to-transparent pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between px-6 py-4 lg:px-8 lg:py-5">
          {/* Left Content */}
          <div className="flex-1 space-y-3 max-w-xl">
            <div>
              <h1 className="text-xl lg:text-2xl font-semibold text-[var(--text)] tracking-tight">
                {greeting}, <span className="text-[var(--text)]">{displayName || 'there'}</span>
              </h1>
              <p className="mt-1 text-sm text-[var(--text-2)] leading-relaxed">
                You have <span className="font-medium text-[var(--text)]">{actionableLeads.length} pending follow-ups</span> and{' '}
                <span className="font-medium text-[var(--text)]">{hotLeadsCount} hot leads</span> waiting for action.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/leads"
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[var(--accent-1)] to-[var(--accent-2)] text-white rounded-lg font-medium text-sm hover:opacity-90 hover:shadow-lg hover:shadow-[var(--accent-1)]/20 transition-all duration-200 focus:ring-2 focus:ring-[var(--focus)]"
              >
                View Leads <ArrowUpRight className="w-4 h-4" />
              </Link>
              <Link
                href="/analytics"
                className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--surface)] rounded-lg font-medium text-sm transition-all duration-200 relative overflow-hidden group"
                style={{
                  background: 'linear-gradient(var(--surface), var(--surface)) padding-box, linear-gradient(to right, var(--accent-1), var(--accent-2)) border-box',
                  border: '2px solid transparent'
                }}
              >
                <span className="bg-gradient-to-r from-[var(--accent-1)] to-[var(--accent-2)] bg-clip-text text-transparent font-medium">
                  View Reports
                </span>
              </Link>
            </div>
          </div>

          {/* Right: Mascot Stage with Purple Halo */}
          <div className="hidden md:block relative w-[200px] h-[160px]">
            {/* Purple gradient halo */}
            <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent-soft)] via-[var(--accent-soft-2)] to-transparent rounded-full blur-3xl scale-110" />
            {/* Secondary subtle blob */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-gradient-to-tr from-[var(--accent-soft)] to-[var(--accent-soft-2)] rounded-full blur-2xl" />
            {/* Mascot */}
            <div className="relative z-10 w-full h-full flex items-center justify-center transition-transform duration-500 hover:scale-105 hover:rotate-1">
              <Image
                src="/images/mascot.png"
                alt="Fluffy - Your AI Assistant"
                width={150}
                height={150}
                className="object-contain drop-shadow-xl"
                priority
              />
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards Row - Clean Minimal Design */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Leads - Purple accent */}
        <div className="bg-[var(--surface)] rounded-2xl p-5 border border-[var(--border)] shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-subtle)] transition-shadow">
          <div className="flex items-start justify-between mb-3">
            <div className="p-2.5 rounded-lg bg-[var(--accent-soft)]">
              <Users className="w-5 h-5 text-[var(--accent-solid)]" />
            </div>
            <span className="flex items-center gap-1 text-xs font-medium text-[#15803D] bg-[var(--success-soft)] px-2 py-1 rounded-full">
              +{leadStats.growthPercent}% <TrendingUp className="w-3 h-3" />
            </span>
          </div>
          <h3 className="text-2xl lg:text-3xl font-bold text-[var(--text)]">{stats.total}</h3>
          <p className="text-sm text-[var(--muted)] mt-1">Total Leads</p>
        </div>

        {/* Contacted */}
        <div className="bg-[var(--surface)] rounded-2xl p-5 border border-[var(--border)] shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-subtle)] transition-shadow">
          <div className="flex items-start justify-between mb-3">
            <div className="p-2.5 rounded-lg bg-[var(--success-soft)]">
              <CheckCircle2 className="w-5 h-5 text-[var(--success)]" />
            </div>
          </div>
          <h3 className="text-2xl lg:text-3xl font-bold text-[var(--text)]">{stats.contacted}</h3>
          <p className="text-sm text-[var(--muted)] mt-1">Contacted</p>
        </div>

        {/* Pending */}
        <div className="bg-[var(--surface)] rounded-2xl p-5 border border-[var(--border)] shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-subtle)] transition-shadow">
          <div className="flex items-start justify-between mb-3">
            <div className="p-2.5 rounded-lg bg-[var(--warning-soft)]">
              <Phone className="w-5 h-5 text-[var(--warning)]" />
            </div>
            {stats.needsFollowup > 0 && (
              <span className="text-xs font-medium text-[#B45309] bg-[var(--warning-soft)] px-2 py-1 rounded-full">
                Action needed
              </span>
            )}
          </div>
          <h3 className="text-2xl lg:text-3xl font-bold text-[var(--text)]">{stats.needsFollowup}</h3>
          <p className="text-sm text-[var(--muted)] mt-1">Pending</p>
        </div>

        {/* Avg Response */}
        <div className="bg-[var(--surface)] rounded-2xl p-5 border border-[var(--border)] shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-subtle)] transition-shadow">
          <div className="flex items-start justify-between mb-3">
            <div className="p-2.5 rounded-lg bg-[var(--info-soft)]">
              <Clock className="w-5 h-5 text-[var(--info)]" />
            </div>
          </div>
          <h3 className="text-2xl lg:text-3xl font-bold text-[var(--text)]">{avgDuration}m</h3>
          <p className="text-sm text-[var(--muted)] mt-1">Avg Response</p>
        </div>
      </div>

      {/* Main Content Row - Compact Cards */}
      <div className="grid lg:grid-cols-5 gap-5 items-start">

        {/* Recent Leads - 3 columns */}
        <div className="lg:col-span-3 bg-[var(--surface)] rounded-2xl border border-[var(--border)] shadow-[var(--shadow-card)] flex flex-col">
          {/* Header */}
          <div className="px-5 py-3.5 border-b border-[var(--border)] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-[var(--text)]">Recent Leads</h2>
              <span className="text-xs text-[var(--muted)] bg-[var(--surface-2)] px-1.5 py-0.5 rounded-md">{recentLeads.length}</span>
            </div>
            <Link
              href="/leads"
              className="text-xs font-medium text-[var(--accent-1)] hover:bg-[var(--accent-soft)] px-2 py-1 rounded-md transition-colors"
            >
              View all →
            </Link>
          </div>

          {/* Scrollable Body */}
          <div className="relative">
            <div className="overflow-y-auto max-h-[240px] scrollbar-thin">
              <div className="divide-y divide-[var(--border)]">
                {recentLeads.map((lead) => (
                  <Link
                    key={lead.id}
                    href={`/leads?id=${lead.id}`}
                    className="px-5 py-3 flex items-center justify-between hover:bg-[var(--hover-row)] transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-medium text-xs bg-[var(--accent-1)]">
                          {lead.prospect_name.charAt(0).toUpperCase()}
                        </div>
                        {lead.is_hot_lead && (
                          <div className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-[var(--warning)] ring-2 ring-[var(--surface)] flex items-center justify-center">
                            <Flame className="w-2 h-2 text-white" />
                          </div>
                        )}
                      </div>
                      <div>
                        <h4 className="font-medium text-[var(--text)] text-sm">{lead.prospect_name}</h4>
                        <p className="text-xs text-[var(--muted)] truncate max-w-[180px]">
                          {lead.company_name || lead.primary_topic}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-[var(--surface-2)] text-[var(--text-2)] hidden sm:block">
                        {lead.lead_score || 0}
                      </span>
                      <ChevronRight className="w-4 h-4 text-[var(--placeholder)] group-hover:text-[var(--accent-solid)] transition-colors" />
                    </div>
                  </Link>
                ))}

                {recentLeads.length === 0 && (
                  <div className="p-6 text-center">
                    <Users className="w-8 h-8 mx-auto mb-2 text-[var(--placeholder)]" />
                    <p className="text-sm text-[var(--muted)]">No leads yet</p>
                  </div>
                )}
              </div>
            </div>
            {/* Bottom fade */}
            {recentLeads.length > 4 && (
              <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-[var(--surface)] to-transparent pointer-events-none" />
            )}
          </div>
        </div>

        {/* Follow-ups - 2 columns */}
        <div className="lg:col-span-2 bg-[var(--surface)] rounded-2xl border border-[var(--border)] shadow-[var(--shadow-card)] flex flex-col">
          {/* Header */}
          <div className="px-5 py-3.5 border-b border-[var(--border)] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-[var(--text)]">Follow-ups</h2>
              {actionableLeads.length > 0 && (
                <span className="text-xs font-medium text-[#B45309] bg-[var(--warning-soft)] px-1.5 py-0.5 rounded-md">
                  {actionableLeads.length}
                </span>
              )}
            </div>
            <Link
              href="/leads"
              className="text-xs font-medium text-[var(--accent-1)] hover:bg-[var(--accent-soft)] px-2 py-1 rounded-md transition-colors"
            >
              View all →
            </Link>
          </div>

          {/* Scrollable Body */}
          <div className="relative">
            <div className="overflow-y-auto max-h-[240px] p-3 scrollbar-thin">
              <div className="space-y-2">
                {actionableLeads.map((lead) => (
                  <Link
                    key={lead.id}
                    href={`/leads?id=${lead.id}`}
                    className="block p-3 bg-[var(--surface-2)] rounded-xl border-l-[3px] border-l-[#FBBF24] hover:bg-[var(--hover-row)] transition-colors"
                  >
                    <div className="flex justify-between items-start mb-1.5">
                      <h4 className="font-medium text-[var(--text)] text-sm">{lead.prospect_name}</h4>
                      <span className="text-xs text-[var(--placeholder)]">{lead.conversation_date}</span>
                    </div>
                    <p className="text-xs text-[var(--muted)] line-clamp-1 mb-2">
                      {lead.next_action || 'Follow up regarding inquiry...'}
                    </p>
                    <span className="text-xs font-medium text-[var(--accent-1)]">
                      Take action →
                    </span>
                  </Link>
                ))}

                {actionableLeads.length === 0 && (
                  <div className="py-8 text-center">
                    <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-[var(--success-soft)] flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5 text-[var(--success)]" />
                    </div>
                    <p className="text-sm font-medium text-[var(--text)]">All caught up!</p>
                    <p className="text-xs text-[var(--placeholder)] mt-0.5">No pending follow-ups</p>
                  </div>
                )}
              </div>
            </div>
            {/* Bottom fade */}
            {actionableLeads.length > 3 && (
              <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-[var(--surface)] to-transparent pointer-events-none" />
            )}
          </div>
        </div>
      </div>

      {/* Analytics Overview */}
      <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] shadow-[var(--shadow-card)] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[var(--border)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-base font-semibold text-[var(--text)]">Analytics Overview</h2>

          {/* Time Range Tabs */}
          <div className="flex items-center gap-1 p-1 bg-[var(--accent-soft)] rounded-lg w-fit">
            {(['today', '7d', '30d'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  timeRange === range
                    ? 'bg-[var(--surface)] text-[var(--accent-solid)] shadow-sm'
                    : 'text-[var(--accent-solid)] hover:text-[var(--accent-1)]'
                }`}
              >
                {range === 'today' ? 'Today' : range === '7d' ? '7 days' : '30 days'}
              </button>
            ))}
          </div>
        </div>

        {/* Key Insight Banner - Purple accent */}
        <div className="px-6 py-3 bg-[var(--accent-soft)] border-b border-[var(--border)]">
          <p className="text-sm text-[var(--text-2)]">
            <span className="font-medium text-[var(--accent-solid)]">Insight:</span>{' '}
            {keyInsight}
          </p>
        </div>

        {/* KPI Tiles */}
        <div className="p-6 grid grid-cols-2 lg:grid-cols-4 gap-4 border-b border-[var(--border)]">
          {/* Conversations */}
          <div className="p-4 bg-[var(--accent-soft)] rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-[var(--muted)] uppercase tracking-wide">Conversations</span>
              <span className="flex items-center gap-0.5 text-xs font-medium text-[#15803D]">
                +12% <TrendingUp className="w-3 h-3" />
              </span>
            </div>
            <div className="flex items-end justify-between">
              <span className="text-2xl font-bold text-[var(--text)]">{stats.total}</span>
              <MiniSparkline data={sparklineData.conversations} trend="up" />
            </div>
          </div>

          {/* Qualified */}
          <div className="p-4 bg-[var(--success-soft)] rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-[var(--muted)] uppercase tracking-wide">Qualified</span>
              <span className="flex items-center gap-0.5 text-xs font-medium text-[#15803D]">
                +8% <TrendingUp className="w-3 h-3" />
              </span>
            </div>
            <div className="flex items-end justify-between">
              <span className="text-2xl font-bold text-[var(--text)]">{qualifiedLeads}</span>
              <MiniSparkline data={sparklineData.qualified} trend="up" />
            </div>
          </div>

          {/* Avg Time */}
          <div className="p-4 bg-[var(--info-soft)] rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-[var(--muted)] uppercase tracking-wide">Avg Time</span>
              <span className="flex items-center gap-0.5 text-xs font-medium text-[var(--danger)]">
                -5% <TrendingDown className="w-3 h-3" />
              </span>
            </div>
            <div className="flex items-end justify-between">
              <span className="text-2xl font-bold text-[var(--text)]">{avgDuration}m</span>
              <MiniSparkline data={sparklineData.avgTime} trend="down" />
            </div>
          </div>

          {/* Follow-ups */}
          <div className="p-4 bg-[var(--warning-soft)] rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-[var(--muted)] uppercase tracking-wide">Follow-ups</span>
              {stats.needsFollowup > 0 && (
                <span className="text-xs font-medium text-[#B45309]">Action needed</span>
              )}
            </div>
            <div className="flex items-end justify-between">
              <span className="text-2xl font-bold text-[var(--text)]">{stats.needsFollowup}</span>
              <MiniSparkline data={sparklineData.followups} trend="warning" />
            </div>
          </div>
        </div>

        {/* Breakdown Cards */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Lead Temperature */}
          <div className="p-5 bg-[var(--surface)] rounded-xl border border-[var(--border)] shadow-[var(--shadow-card)]">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 rounded-lg bg-[var(--accent-soft)]">
                <Thermometer className="w-4 h-4 text-[var(--accent-solid)]" />
              </div>
              <h3 className="font-semibold text-sm text-[var(--text)]">Lead Temperature</h3>
            </div>
            <div className="space-y-2.5">
              {/* Hot */}
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-[var(--danger-soft)] transition-all hover:scale-[1.01]">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-[var(--danger)] flex items-center justify-center">
                    <Flame className="w-3.5 h-3.5 text-white" />
                  </div>
                  <span className="text-sm font-medium text-[var(--text-2)]">Hot</span>
                </div>
                <span className="text-sm font-bold text-[var(--text)] bg-[var(--surface)] px-2.5 py-0.5 rounded-md shadow-[var(--shadow-subtle)]">
                  {leadTemperature.hot}
                </span>
              </div>

              {/* Warm */}
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-[var(--warning-soft)] transition-all hover:scale-[1.01]">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-[var(--warning)] flex items-center justify-center">
                    <Sun className="w-3.5 h-3.5 text-white" />
                  </div>
                  <span className="text-sm font-medium text-[var(--text-2)]">Warm</span>
                </div>
                <span className="text-sm font-bold text-[var(--text)] bg-[var(--surface)] px-2.5 py-0.5 rounded-md shadow-[var(--shadow-subtle)]">
                  {leadTemperature.warm}
                </span>
              </div>

              {/* Cold */}
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-[var(--info-soft)] transition-all hover:scale-[1.01]">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-[var(--info)] flex items-center justify-center">
                    <Snowflake className="w-3.5 h-3.5 text-white" />
                  </div>
                  <span className="text-sm font-medium text-[var(--text-2)]">Cold</span>
                </div>
                <span className="text-sm font-bold text-[var(--text)] bg-[var(--surface)] px-2.5 py-0.5 rounded-md shadow-[var(--shadow-subtle)]">
                  {leadTemperature.cold}
                </span>
              </div>
            </div>
          </div>

          {/* Product Interest */}
          <div className="p-5 bg-[var(--surface)] rounded-xl border border-[var(--border)] shadow-[var(--shadow-card)]">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 rounded-lg bg-[var(--success-soft)]">
                <Zap className="w-4 h-4 text-[var(--success)]" />
              </div>
              <h3 className="font-semibold text-sm text-[var(--text)]">Product Interest</h3>
            </div>
            <div className="space-y-3">
              {analyticsData.products.length > 0 ? (
                (() => {
                  const maxCount = analyticsData.products[0]?.[1] || 1;
                  return analyticsData.products.map(([topic, count]) => (
                    <div key={topic} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-[var(--text-2)] truncate max-w-[65%]">{topic}</span>
                        <span className="text-sm font-semibold text-[var(--text)]">{count}</span>
                      </div>
                      <div className="h-1.5 bg-[var(--border)] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[var(--accent-solid)] rounded-full transition-all duration-500"
                          style={{ width: `${(count / maxCount) * 100}%` }}
                        />
                      </div>
                    </div>
                  ));
                })()
              ) : (
                <p className="text-sm text-[var(--placeholder)]">No data yet</p>
              )}
            </div>
          </div>

          {/* Regions */}
          <div className="p-5 bg-[var(--surface)] rounded-xl border border-[var(--border)] shadow-[var(--shadow-card)]">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 rounded-lg bg-[var(--info-soft)]">
                <Globe className="w-4 h-4 text-[var(--info)]" />
              </div>
              <h3 className="font-semibold text-sm text-[var(--text)]">Regions</h3>
            </div>
            <div className="space-y-2">
              {analyticsData.regions.length > 0 ? (
                (() => {
                  const colors = [
                    { dot: 'bg-[var(--accent-solid)]', bg: 'bg-[var(--accent-soft)]' },
                    { dot: 'bg-[var(--accent-1)]', bg: 'bg-[var(--accent-soft)]' },
                    { dot: 'bg-[var(--accent-2)]', bg: 'bg-[var(--accent-soft-2)]' },
                  ];
                  return analyticsData.regions.map(([region, count], index) => (
                    <div
                      key={region}
                      className={`flex items-center justify-between p-2.5 rounded-lg ${colors[index]?.bg || 'bg-[var(--surface)]'} transition-all hover:scale-[1.01]`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-2 h-2 rounded-full ${colors[index]?.dot || 'bg-[var(--muted)]'}`} />
                        <span className="text-sm font-medium text-[var(--text-2)]">{region}</span>
                      </div>
                      <span className="text-sm font-bold text-[var(--text)] bg-[var(--surface)] px-2 py-0.5 rounded-md shadow-[var(--shadow-subtle)]">
                        {count}
                      </span>
                    </div>
                  ));
                })()
              ) : (
                <p className="text-sm text-[var(--placeholder)]">No data yet</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
