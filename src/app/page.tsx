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
  Flame,
  Globe,
  Zap,
  Thermometer,
  Snowflake,
  Sun
} from 'lucide-react';
import { useLeads } from '@/context/LeadContext';
import { useAuth } from '@/context/AuthContext';

// Mini Sparkline Component - Uses semantic colors only
function MiniSparkline({ data, trend }: { data: number[]; trend: 'up' | 'down' | 'warning' | 'neutral' }) {
  if (data.length < 2) return null;

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const points = data.map((v, i) =>
    `${(i / (data.length - 1)) * 56},${24 - ((v - min) / range) * 20}`
  ).join(' ');

  // Semantic colors only - part of 10%
  const strokeColor = trend === 'up' ? 'var(--success)' : trend === 'down' ? 'var(--danger)' : trend === 'warning' ? 'var(--warning)' : 'var(--muted)';

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

  const qualifiedLeads = useMemo(() => {
    return leads.filter(l => (l.lead_score || 0) >= 70).length;
  }, [leads]);

  const hotLeadsCount = useMemo(() => {
    return leads.filter(l => l.is_hot_lead).length;
  }, [leads]);

  const leadTemperature = useMemo(() => {
    const hot = leads.filter(l => l.is_hot_lead || (l.lead_score || 0) >= 80).length;
    const warm = leads.filter(l => !l.is_hot_lead && (l.lead_score || 0) >= 50 && (l.lead_score || 0) < 80).length;
    const cold = leads.filter(l => !l.is_hot_lead && (l.lead_score || 0) < 50).length;
    return { hot, warm, cold, total: leads.length };
  }, [leads]);

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

  const sparklineData = useMemo(() => ({
    conversations: [4, 6, 5, 8, 7, 9, leads.length],
    qualified: [2, 3, 2, 4, 5, 4, qualifiedLeads],
    avgTime: [15, 12, 14, 11, 13, 12, avgDuration],
    followups: [3, 4, 2, 5, 3, 4, stats.needsFollowup],
  }), [leads.length, qualifiedLeads, avgDuration, stats.needsFollowup]);

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
    // 60% - Neutral background
    <div className="p-6 lg:p-8 space-y-6 min-h-screen bg-[var(--bg)]">

      {/* Hero Section - 60% white, minimal accent */}
      <div className="relative w-full overflow-hidden rounded-xl bg-[var(--surface)] border border-[var(--border)] shadow-[var(--shadow-card)]">
        <div className="flex flex-col md:flex-row items-center justify-between px-6 py-5 lg:px-8 lg:py-6">
          {/* Left Content - 30% text colors */}
          <div className="flex-1 space-y-4 max-w-xl">
            <div>
              <h1 className="text-xl lg:text-2xl font-semibold text-[var(--text)]">
                {greeting}, {displayName || 'there'}
              </h1>
              {/* Semantic colors for key numbers (part of 10%) */}
              <p className="mt-2 text-sm text-[var(--muted)] leading-relaxed">
                You have <span className="font-medium text-[var(--warning)]">{actionableLeads.length} pending follow-ups</span> and{' '}
                <span className="font-medium text-[var(--success)]">{hotLeadsCount} hot leads</span> waiting for action.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              {/* 10% - Primary CTA uses accent */}
              <Link
                href="/leads"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[var(--accent-1)] to-[var(--accent-2)] text-white rounded-lg font-medium text-sm shadow-sm hover:shadow-md transition-all"
              >
                View Leads
              </Link>
              {/* Secondary button - 30% neutral */}
              <Link
                href="/analytics"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-lg font-medium text-sm text-[var(--text-2)] hover:bg-[var(--surface-2)] transition-all"
              >
                View Reports
              </Link>
            </div>
          </div>

          {/* Right: Mascot */}
          <div className="hidden md:block relative w-[180px] h-[140px]">
            <div className="relative z-10 w-full h-full flex items-center justify-center">
              <Image
                src="/images/mascot.png"
                alt="Fluffy - Your AI Assistant"
                width={140}
                height={140}
                className="object-contain drop-shadow-lg"
                priority
              />
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards - 60% white cards, 30% text, semantic 10% for icons */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Leads */}
        <div className="bg-[var(--surface)] rounded-xl p-5 border border-[var(--border)] shadow-[var(--shadow-card)]">
          <div className="flex items-start justify-between mb-3">
            {/* Icon uses muted gray, not accent */}
            <div className="p-2.5 rounded-lg bg-[var(--surface-2)]">
              <Users className="w-5 h-5 text-[var(--muted)]" />
            </div>
            {/* Semantic success color for positive trend */}
            <span className="flex items-center gap-1 text-xs font-medium text-[var(--success)]">
              +{leadStats.growthPercent}% <TrendingUp className="w-3 h-3" />
            </span>
          </div>
          <h3 className="text-2xl lg:text-3xl font-bold text-[var(--text)]">{stats.total}</h3>
          <p className="text-xs text-[var(--muted)] mt-1 uppercase tracking-wide">Total Leads</p>
        </div>

        {/* Contacted */}
        <div className="bg-[var(--surface)] rounded-xl p-5 border border-[var(--border)] shadow-[var(--shadow-card)]">
          <div className="flex items-start justify-between mb-3">
            <div className="p-2.5 rounded-lg bg-[var(--success-soft)]">
              <CheckCircle2 className="w-5 h-5 text-[var(--success)]" />
            </div>
          </div>
          <h3 className="text-2xl lg:text-3xl font-bold text-[var(--text)]">{stats.contacted}</h3>
          <p className="text-xs text-[var(--muted)] mt-1 uppercase tracking-wide">Contacted</p>
        </div>

        {/* Pending */}
        <div className="bg-[var(--surface)] rounded-xl p-5 border border-[var(--border)] shadow-[var(--shadow-card)]">
          <div className="flex items-start justify-between mb-3">
            <div className="p-2.5 rounded-lg bg-[var(--warning-soft)]">
              <Phone className="w-5 h-5 text-[var(--warning)]" />
            </div>
            {stats.needsFollowup > 0 && (
              <span className="text-xs font-medium text-[var(--warning)]">
                Action needed
              </span>
            )}
          </div>
          <h3 className="text-2xl lg:text-3xl font-bold text-[var(--text)]">{stats.needsFollowup}</h3>
          <p className="text-xs text-[var(--muted)] mt-1 uppercase tracking-wide">Pending</p>
        </div>

        {/* Avg Response */}
        <div className="bg-[var(--surface)] rounded-xl p-5 border border-[var(--border)] shadow-[var(--shadow-card)]">
          <div className="flex items-start justify-between mb-3">
            <div className="p-2.5 rounded-lg bg-[var(--info-soft)]">
              <Clock className="w-5 h-5 text-[var(--info)]" />
            </div>
          </div>
          <h3 className="text-2xl lg:text-3xl font-bold text-[var(--text)]">{avgDuration}m</h3>
          <p className="text-xs text-[var(--muted)] mt-1 uppercase tracking-wide">Avg Response</p>
        </div>
      </div>

      {/* Main Content Row */}
      <div className="grid lg:grid-cols-5 gap-5 items-start">

        {/* Recent Leads - 60% white surface */}
        <div className="lg:col-span-3 bg-[var(--surface)] rounded-xl border border-[var(--border)] shadow-[var(--shadow-card)] flex flex-col">
          <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-[var(--text)]">Recent Leads</h2>
              <span className="text-xs text-[var(--muted)] bg-[var(--surface-2)] px-2 py-0.5 rounded">{recentLeads.length}</span>
            </div>
            {/* 10% - Links use accent */}
            <Link
              href="/leads"
              className="text-xs font-medium text-[var(--accent-solid)] hover:underline flex items-center gap-1"
            >
              View all <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="relative">
            <div className="overflow-y-auto max-h-[280px]">
              <div className="divide-y divide-[var(--border)]">
                {recentLeads.map((lead) => (
                  <Link
                    key={lead.id}
                    href={`/leads?id=${lead.id}`}
                    className="px-5 py-3.5 flex items-center justify-between hover:bg-[var(--hover-row)] transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        {/* Avatar uses neutral gray, not accent */}
                        <div className="w-10 h-10 rounded-full flex items-center justify-center bg-[var(--surface-2)] text-[var(--text-2)] font-medium text-sm">
                          {lead.prospect_name.charAt(0).toUpperCase()}
                        </div>
                        {/* Hot indicator uses semantic warning color */}
                        {lead.is_hot_lead && (
                          <div className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-[var(--warning)] ring-2 ring-[var(--surface)] flex items-center justify-center">
                            <Flame className="w-2.5 h-2.5 text-white" />
                          </div>
                        )}
                      </div>
                      <div>
                        <h4 className="font-medium text-[var(--text)] text-sm">{lead.prospect_name}</h4>
                        <p className="text-xs text-[var(--muted)] truncate max-w-[200px]">
                          {lead.company_name || lead.primary_topic}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Score uses muted text, not bright color */}
                      <span className="text-xs font-medium text-[var(--muted)] hidden sm:block">
                        {lead.lead_score || 0}
                      </span>
                      <ChevronRight className="w-4 h-4 text-[var(--placeholder)] group-hover:text-[var(--text-2)] transition-colors" />
                    </div>
                  </Link>
                ))}

                {recentLeads.length === 0 && (
                  <div className="p-8 text-center">
                    <Users className="w-10 h-10 mx-auto mb-3 text-[var(--placeholder)]" />
                    <p className="text-sm text-[var(--muted)]">No leads yet</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Follow-ups */}
        <div className="lg:col-span-2 bg-[var(--surface)] rounded-xl border border-[var(--border)] shadow-[var(--shadow-card)] flex flex-col">
          <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-[var(--text)]">Follow-ups</h2>
              {actionableLeads.length > 0 && (
                <span className="text-xs font-medium text-[var(--warning)] bg-[var(--warning-soft)] px-2 py-0.5 rounded">
                  {actionableLeads.length}
                </span>
              )}
            </div>
            <Link
              href="/leads"
              className="text-xs font-medium text-[var(--accent-solid)] hover:underline"
            >
              View all
            </Link>
          </div>

          <div className="relative">
            <div className="overflow-y-auto max-h-[280px] p-4">
              <div className="space-y-3">
                {actionableLeads.map((lead) => (
                  <Link
                    key={lead.id}
                    href={`/leads?id=${lead.id}`}
                    className="block p-4 bg-[var(--surface-2)] rounded-lg border-l-3 border-l-[var(--warning)] hover:bg-[var(--surface-3)] transition-colors"
                    style={{ borderLeftWidth: '3px', borderLeftColor: 'var(--warning)' }}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium text-[var(--text)] text-sm">{lead.prospect_name}</h4>
                      <span className="text-xs text-[var(--placeholder)]">{lead.conversation_date}</span>
                    </div>
                    <p className="text-xs text-[var(--muted)] line-clamp-1 mb-2">
                      {lead.next_action || 'Follow up regarding inquiry...'}
                    </p>
                    <span className="text-xs font-medium text-[var(--accent-solid)]">
                      Take action →
                    </span>
                  </Link>
                ))}

                {actionableLeads.length === 0 && (
                  <div className="py-10 text-center">
                    <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-[var(--success-soft)] flex items-center justify-center">
                      <CheckCircle2 className="w-6 h-6 text-[var(--success)]" />
                    </div>
                    <p className="text-sm font-medium text-[var(--text)]">All caught up!</p>
                    <p className="text-xs text-[var(--muted)] mt-1">No pending follow-ups</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Overview - 60% white base */}
      <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] shadow-[var(--shadow-card)] overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--border)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-base font-semibold text-[var(--text)]">Overview</h2>

          {/* Time Range Tabs - 30% neutral colors */}
          <div className="flex items-center gap-1 p-1 bg-[var(--surface-2)] rounded-lg w-fit">
            {(['today', '7d', '30d'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  timeRange === range
                    ? 'bg-[var(--surface)] text-[var(--text)] shadow-sm'
                    : 'text-[var(--muted)] hover:text-[var(--text)]'
                }`}
              >
                {range === 'today' ? 'Today' : range === '7d' ? '7 days' : '30 days'}
              </button>
            ))}
          </div>
        </div>

        {/* Insight Banner - Subtle, not accent colored */}
        <div className="px-6 py-3 bg-[var(--surface-2)] border-b border-[var(--border)]">
          <p className="text-sm text-[var(--text-2)]">
            <span className="font-medium">Insight:</span> {keyInsight}
          </p>
        </div>

        {/* KPI Tiles - 60% neutral backgrounds */}
        <div className="p-6 grid grid-cols-2 lg:grid-cols-4 gap-4 border-b border-[var(--border)]">
          <div className="p-4 bg-[var(--surface-2)] rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-[var(--muted)] uppercase tracking-wide">Conversations</span>
              <span className="flex items-center gap-0.5 text-xs font-medium text-[var(--success)]">
                +12% <TrendingUp className="w-3 h-3" />
              </span>
            </div>
            <div className="flex items-end justify-between">
              <span className="text-2xl font-bold text-[var(--text)]">{stats.total}</span>
              <MiniSparkline data={sparklineData.conversations} trend="up" />
            </div>
          </div>

          <div className="p-4 bg-[var(--surface-2)] rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-[var(--muted)] uppercase tracking-wide">Qualified</span>
              <span className="flex items-center gap-0.5 text-xs font-medium text-[var(--success)]">
                +8% <TrendingUp className="w-3 h-3" />
              </span>
            </div>
            <div className="flex items-end justify-between">
              <span className="text-2xl font-bold text-[var(--text)]">{qualifiedLeads}</span>
              <MiniSparkline data={sparklineData.qualified} trend="up" />
            </div>
          </div>

          <div className="p-4 bg-[var(--surface-2)] rounded-lg">
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

          <div className="p-4 bg-[var(--surface-2)] rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-[var(--muted)] uppercase tracking-wide">Follow-ups</span>
              {stats.needsFollowup > 0 && (
                <span className="text-xs font-medium text-[var(--warning)]">Action needed</span>
              )}
            </div>
            <div className="flex items-end justify-between">
              <span className="text-2xl font-bold text-[var(--text)]">{stats.needsFollowup}</span>
              <MiniSparkline data={sparklineData.followups} trend="warning" />
            </div>
          </div>
        </div>

        {/* Breakdown Cards - 60% white, 30% grays */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Lead Temperature */}
          <div className="p-5 bg-[var(--surface)] rounded-lg border border-[var(--border)]">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 rounded-lg bg-[var(--surface-2)]">
                <Thermometer className="w-4 h-4 text-[var(--muted)]" />
              </div>
              <h3 className="font-semibold text-sm text-[var(--text)]">Lead Temperature</h3>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sun className="w-4 h-4 text-[var(--warning)]" />
                    <span className="text-sm text-[var(--text-2)]">Hot</span>
                  </div>
                  <span className="text-sm font-medium text-[var(--text)]">{leadTemperature.hot}</span>
                </div>
                {/* Progress bar uses muted colors, not accent */}
                <div className="h-1.5 bg-[var(--surface-3)] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[var(--warning)] rounded-full transition-all duration-500"
                    style={{ width: `${leadTemperature.total ? (leadTemperature.hot / leadTemperature.total) * 100 : 0}%` }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sun className="w-4 h-4 text-[var(--placeholder)]" />
                    <span className="text-sm text-[var(--text-2)]">Warm</span>
                  </div>
                  <span className="text-sm font-medium text-[var(--text)]">{leadTemperature.warm}</span>
                </div>
                <div className="h-1.5 bg-[var(--surface-3)] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[var(--placeholder)] rounded-full transition-all duration-500"
                    style={{ width: `${leadTemperature.total ? (leadTemperature.warm / leadTemperature.total) * 100 : 0}%` }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Snowflake className="w-4 h-4 text-[var(--border-strong)]" />
                    <span className="text-sm text-[var(--text-2)]">Cold</span>
                  </div>
                  <span className="text-sm font-medium text-[var(--text)]">{leadTemperature.cold}</span>
                </div>
                <div className="h-1.5 bg-[var(--surface-3)] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[var(--border-strong)] rounded-full transition-all duration-500"
                    style={{ width: `${leadTemperature.total ? (leadTemperature.cold / leadTemperature.total) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Product Interest */}
          <div className="p-5 bg-[var(--surface)] rounded-lg border border-[var(--border)]">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 rounded-lg bg-[var(--surface-2)]">
                <Zap className="w-4 h-4 text-[var(--muted)]" />
              </div>
              <h3 className="font-semibold text-sm text-[var(--text)]">Product Interest</h3>
            </div>
            <div className="space-y-4">
              {analyticsData.products.length > 0 ? (
                (() => {
                  const maxCount = analyticsData.products[0]?.[1] || 1;
                  return analyticsData.products.map(([topic, count]) => (
                    <div key={topic} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-[var(--text-2)] truncate max-w-[60%]">{topic}</span>
                        <span className="text-sm font-medium text-[var(--text)]">{count}</span>
                      </div>
                      {/* Progress bar uses accent ONLY here as visual emphasis */}
                      <div className="h-1.5 bg-[var(--surface-3)] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[var(--accent-solid)] rounded-full transition-all duration-500"
                          style={{ width: `${(count / maxCount) * 100}%` }}
                        />
                      </div>
                    </div>
                  ));
                })()
              ) : (
                <p className="text-sm text-[var(--muted)]">No data yet</p>
              )}
            </div>
          </div>

          {/* Regions */}
          <div className="p-5 bg-[var(--surface)] rounded-lg border border-[var(--border)]">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 rounded-lg bg-[var(--surface-2)]">
                <Globe className="w-4 h-4 text-[var(--muted)]" />
              </div>
              <h3 className="font-semibold text-sm text-[var(--text)]">Regions</h3>
            </div>
            <div className="space-y-2">
              {analyticsData.regions.length > 0 ? (
                analyticsData.regions.map(([region, count]) => (
                  <div
                    key={region}
                    className="flex items-center justify-between p-3 rounded-lg bg-[var(--surface-2)] hover:bg-[var(--surface-3)] transition-colors"
                  >
                    <span className="text-sm text-[var(--text-2)]">{region}</span>
                    <span className="text-sm font-medium text-[var(--text)]">{count}</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-[var(--muted)]">No data yet</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
