'use client';

import { useMemo, useState, useRef, useEffect } from 'react';
import {
  Users,
  TrendingUp,
  Clock,
  MessageCircle,
  Zap,
  Target,
  Activity,
  Calendar,
  ChevronDown,
  X,
  AlertTriangle,
  Globe,
  DollarSign,
  Briefcase,
  BarChart3,
  CheckCircle2,
  Download,
  Flame,
  Sun,
  Snowflake,
  ThermometerSun,
  ArrowUpRight
} from 'lucide-react';
import { useLeads } from '@/context/LeadContext';
import clsx from 'clsx';

// Helper to format date as YYYY-MM-DD
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

// Helper to get display date
function formatDisplayDate(dateStr: string): string {
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const [, year, month, day] = match;
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${day} ${monthNames[parseInt(month, 10) - 1]} ${year}`;
  }
  return dateStr;
}

// Date range presets
const DATE_PRESETS = [
  { label: 'Today', days: 0 },
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
  { label: 'All time', days: -1 },
];

// Horizontal Progress Bar Component
function ProgressBar({ value, max, color, showLabel = true }: { value: number; max: number; color: string; showLabel?: boolean }) {
  const percentage = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="space-y-1">
      <div className="h-2 bg-[var(--surface-3)] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: `${percentage}%`, background: color }}
        />
      </div>
      {showLabel && <p className="text-[10px] text-[var(--muted)] text-right">{Math.round(percentage)}%</p>}
    </div>
  );
}

// Mini Stat Box
function MiniStat({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: number | string; color: string }) {
  return (
    <div className="flex items-center gap-3 p-3 bg-[var(--surface-2)] rounded-xl">
      <div className="p-2 rounded-lg" style={{ backgroundColor: `${color}15` }}>
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
      <div>
        <p className="text-lg font-bold text-[var(--text)]">{value}</p>
        <p className="text-xs text-[var(--muted)]">{label}</p>
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const { leads } = useLeads();
  const [showDatePicker, setShowDatePicker] = useState(false);
  const datePickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
        setShowDatePicker(false);
      }
    }
    if (showDatePicker) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showDatePicker]);

  const [dateRange, setDateRange] = useState<{ start: string; end: string }>(() => {
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    return { start: formatDate(thirtyDaysAgo), end: formatDate(today) };
  });
  const [selectedPreset, setSelectedPreset] = useState('Last 30 days');

  const filteredLeads = useMemo(() => {
    if (selectedPreset === 'All time') return leads;
    return leads.filter((lead) => {
      if (!lead.conversation_date) return false;
      return lead.conversation_date >= dateRange.start && lead.conversation_date <= dateRange.end;
    });
  }, [leads, dateRange, selectedPreset]);

  const applyPreset = (preset: { label: string; days: number }) => {
    setSelectedPreset(preset.label);
    if (preset.days === -1) {
      setDateRange({ start: '2000-01-01', end: formatDate(new Date()) });
    } else if (preset.days === 0) {
      const today = formatDate(new Date());
      setDateRange({ start: today, end: today });
    } else {
      const today = new Date();
      const pastDate = new Date(today.getTime() - preset.days * 24 * 60 * 60 * 1000);
      setDateRange({ start: formatDate(pastDate), end: formatDate(today) });
    }
    setShowDatePicker(false);
  };

  const applyCustomRange = (start: string, end: string) => {
    setDateRange({ start, end });
    setSelectedPreset('Custom');
    setShowDatePicker(false);
  };

  const exportToSpreadsheet = () => {
    if (filteredLeads.length === 0) {
      alert('No leads to export for the selected date range');
      return;
    }
    const headers = ['Date', 'Name', 'Phone', 'Email', 'Company', 'Region', 'Lead Score', 'Intent Level', 'Buyer Stage', 'Urgency', 'Hot Lead', 'Primary Topic', 'Use Case', 'Status', 'Needs Followup', 'Budget', 'Enterprise', 'Conversation Summary', 'Next Action', 'Duration (min)', 'Messages', 'Sentiment', 'Source', 'Created At'];
    const csvRows = filteredLeads.map(lead => [
      lead.conversation_date || '', lead.prospect_name || '', lead.phone || '', lead.email || '',
      lead.company_name || '', lead.region || '', lead.lead_score?.toString() || '0',
      lead.intent_level || '', lead.buyer_stage || '', lead.urgency || '',
      lead.is_hot_lead ? 'Yes' : 'No', lead.primary_topic || '', lead.use_case_category || '',
      lead.status || 'new', lead.needs_immediate_followup ? 'Yes' : 'No', lead.budget_bucket_inr || '',
      lead.is_enterprise ? 'Yes' : 'No', (lead.conversation_summary || '').replace(/"/g, '""').replace(/\n/g, ' '),
      lead.next_action || '', lead.duration_minutes?.toString() || '0', lead.total_messages?.toString() || '0',
      lead.sentiment_overall || '', lead.source || 'WhatsApp', lead.created_at || ''
    ]);
    const csvContent = [headers.join(','), ...csvRows.map(row => row.map(cell => `"${cell}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `FluffyChats_Leads_${dateRange.start}_to_${dateRange.end}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Calculate stats
  const stats = useMemo(() => {
    const total = filteredLeads.length;
    if (total === 0) {
      return {
        total: 0, highIntent: 0, mediumIntent: 0, lowIntent: 0, hotLeads: 0,
        needsFollowup: 0, avgScore: 0, contacted: 0, newLeads: 0,
        byIntent: { high: 0, medium: 0, low: 0 },
        byStage: { awareness: 0, consideration: 0, decision: 0 },
        byUrgency: { critical: 0, high: 0, medium: 0, low: 0 },
        byStatus: { new: 0, contacted: 0, qualified: 0, converted: 0, lost: 0 },
      };
    }

    const statusCounts = { new: 0, contacted: 0, qualified: 0, converted: 0, lost: 0 };
    const intentCounts = { high: 0, medium: 0, low: 0 };
    const stageCounts = { awareness: 0, consideration: 0, decision: 0 };
    const urgencyCounts = { critical: 0, high: 0, medium: 0, low: 0 };

    filteredLeads.forEach(l => {
      const status = l.status || 'new';
      if (status in statusCounts) statusCounts[status as keyof typeof statusCounts]++;
      else statusCounts.new++;

      const intent = l.intent_level || 'medium';
      if (intent in intentCounts) intentCounts[intent as keyof typeof intentCounts]++;

      const stage = l.buyer_stage || 'awareness';
      if (stage in stageCounts) stageCounts[stage as keyof typeof stageCounts]++;

      const urgency = l.urgency || 'medium';
      if (urgency in urgencyCounts) urgencyCounts[urgency as keyof typeof urgencyCounts]++;
    });

    return {
      total,
      highIntent: intentCounts.high,
      mediumIntent: intentCounts.medium,
      lowIntent: intentCounts.low,
      hotLeads: filteredLeads.filter(l => l.is_hot_lead === true).length,
      needsFollowup: filteredLeads.filter(l => l.needs_immediate_followup === true || !l.status || l.status === 'new').length,
      avgScore: Math.round(filteredLeads.reduce((acc, l) => acc + (l.lead_score || 0), 0) / total),
      contacted: statusCounts.contacted,
      newLeads: statusCounts.new,
      byIntent: intentCounts,
      byStage: stageCounts,
      byUrgency: urgencyCounts,
      byStatus: statusCounts,
    };
  }, [filteredLeads]);

  // Lead Temperature
  const leadTemperature = useMemo(() => {
    const hot = filteredLeads.filter(l => l.is_hot_lead || (l.lead_score || 0) >= 80).length;
    const warm = filteredLeads.filter(l => !l.is_hot_lead && (l.lead_score || 0) >= 50 && (l.lead_score || 0) < 80).length;
    const cold = filteredLeads.filter(l => !l.is_hot_lead && (l.lead_score || 0) < 50).length;
    return { hot, warm, cold, total: filteredLeads.length };
  }, [filteredLeads]);

  // Top topics
  const topicData = useMemo(() => {
    const topics: Record<string, number> = {};
    filteredLeads.forEach((lead) => {
      const topic = lead.primary_topic || 'General Inquiry';
      topics[topic] = (topics[topic] || 0) + 1;
    });
    return Object.entries(topics).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5);
  }, [filteredLeads]);

  // Channel data
  const channelData = useMemo(() => {
    const channels: Record<string, number> = {};
    filteredLeads.forEach((lead) => {
      const channel = lead.channel || 'WhatsApp';
      channels[channel] = (channels[channel] || 0) + 1;
    });
    return Object.entries(channels).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filteredLeads]);

  // Region data
  const regionData = useMemo(() => {
    const regions: Record<string, number> = {};
    filteredLeads.forEach((lead) => {
      const region = lead.region || 'Unknown';
      regions[region] = (regions[region] || 0) + 1;
    });
    return Object.entries(regions).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5);
  }, [filteredLeads]);

  // Budget data
  const budgetData = useMemo(() => {
    const budgets: Record<string, number> = {};
    filteredLeads.forEach((lead) => {
      const budget = lead.budget_bucket_inr || 'Not Specified';
      budgets[budget] = (budgets[budget] || 0) + 1;
    });
    return Object.entries(budgets).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5);
  }, [filteredLeads]);

  // Conversation metrics
  const conversationMetrics = useMemo(() => {
    const total = filteredLeads.length;
    if (total === 0) return { avgDuration: 0, avgMessages: 0, totalMessages: 0 };
    return {
      avgDuration: Math.round(filteredLeads.reduce((acc, l) => acc + (l.duration_minutes || 0), 0) / total),
      avgMessages: Math.round(filteredLeads.reduce((acc, l) => acc + (l.total_messages || 0), 0) / total),
      totalMessages: filteredLeads.reduce((acc, l) => acc + (l.total_messages || 0), 0),
    };
  }, [filteredLeads]);

  // Sentiment data
  const sentimentData = useMemo(() => {
    const sentiments: Record<string, number> = {};
    filteredLeads.forEach((lead) => {
      const sentiment = lead.sentiment_overall || 'neutral';
      sentiments[sentiment] = (sentiments[sentiment] || 0) + 1;
    });
    return {
      veryPositive: sentiments['very_positive'] || 0,
      positive: sentiments['positive'] || 0,
      neutral: sentiments['neutral'] || 0,
      negative: sentiments['negative'] || 0,
    };
  }, [filteredLeads]);

  // Data quality
  const dataQuality = useMemo(() => {
    const total = filteredLeads.length;
    if (total === 0) return { avgCompleteness: 0 };
    return { avgCompleteness: Math.round(filteredLeads.reduce((acc, l) => acc + (l.completeness || 0), 0) / total) };
  }, [filteredLeads]);

  // Use case data
  const useCaseData = useMemo(() => {
    const useCases: Record<string, number> = {};
    filteredLeads.forEach((lead) => {
      const useCase = lead.use_case_category || 'General';
      useCases[useCase] = (useCases[useCase] || 0) + 1;
    });
    return Object.entries(useCases).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5);
  }, [filteredLeads]);

  // Competitor data
  const competitorData = useMemo(() => {
    const competitors: Record<string, number> = {};
    filteredLeads.forEach((lead) => {
      if (lead.competitors_mentioned?.length) {
        lead.competitors_mentioned.forEach(comp => {
          if (comp) competitors[comp] = (competitors[comp] || 0) + 1;
        });
      }
    });
    return Object.entries(competitors).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5);
  }, [filteredLeads]);

  const highIntentPercent = stats.total > 0 ? Math.round((stats.highIntent / stats.total) * 100) : 0;
  const hotLeadPercent = stats.total > 0 ? Math.round((stats.hotLeads / stats.total) * 100) : 0;

  return (
    <div className="p-6 lg:p-8 space-y-6 min-h-screen bg-[var(--bg-secondary)]">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-[var(--accent-soft)]">
            <BarChart3 className="w-6 h-6 text-[var(--accent-solid)]" />
          </div>
          <div>
            <h1 className="text-xl lg:text-2xl font-semibold text-[var(--text)]">Lead Analytics</h1>
            <p className="text-sm text-[var(--muted)] mt-0.5">
              {filteredLeads.length === leads.length
                ? `Complete analysis of ${leads.length} leads`
                : `Analyzing ${filteredLeads.length} of ${leads.length} total leads`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={exportToSpreadsheet}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-[var(--border)] rounded-xl text-sm font-medium text-[var(--text-2)] hover:bg-[var(--surface-2)] transition-all"
            style={{ boxShadow: 'var(--shadow-sm)' }}
          >
            <Download className="w-4 h-4" />
            Export
          </button>

          <div className="relative" ref={datePickerRef}>
            <button
              onClick={() => setShowDatePicker(!showDatePicker)}
              className="flex items-center gap-3 px-4 py-2.5 bg-white rounded-xl border border-[var(--border)] hover:border-[var(--accent-1)] transition-all"
              style={{ boxShadow: 'var(--shadow-sm)' }}
            >
              <Calendar className="w-4 h-4 text-[var(--muted)]" />
              <div className="text-left">
                <p className="text-xs text-[var(--muted)]">Date Range</p>
                <p className="text-sm font-medium text-[var(--text)]">
                  {selectedPreset === 'Custom' ? `${formatDisplayDate(dateRange.start)} - ${formatDisplayDate(dateRange.end)}` : selectedPreset}
                </p>
              </div>
              <ChevronDown className={clsx("w-4 h-4 text-[var(--muted)] transition-transform", showDatePicker && "rotate-180")} />
            </button>

            {showDatePicker && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-[var(--border)] rounded-2xl shadow-lg z-50 overflow-hidden">
                <div className="p-4 border-b border-[var(--border)]">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-[var(--text)]">Select Date Range</h4>
                    <button onClick={() => setShowDatePicker(false)} className="p-1.5 hover:bg-[var(--surface-2)] rounded-lg">
                      <X className="w-4 h-4 text-[var(--muted)]" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {DATE_PRESETS.map((preset) => (
                      <button
                        key={preset.label}
                        onClick={() => applyPreset(preset)}
                        className={clsx(
                          "px-3 py-2 rounded-lg text-sm font-medium transition-all",
                          selectedPreset === preset.label
                            ? "bg-gradient-to-r from-[var(--accent-1)] to-[var(--accent-2)] text-white"
                            : "bg-[var(--surface-2)] text-[var(--text-2)] hover:bg-[var(--surface-3)]"
                        )}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="p-4 bg-[var(--surface-2)]">
                  <p className="text-xs text-[var(--muted)] mb-2 font-medium">Custom Range</p>
                  <div className="flex items-center gap-2">
                    <input type="date" value={dateRange.start} onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))} className="flex-1 px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-1)] bg-white" />
                    <span className="text-[var(--muted)]">–</span>
                    <input type="date" value={dateRange.end} onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))} className="flex-1 px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-1)] bg-white" />
                  </div>
                  <button onClick={() => applyCustomRange(dateRange.start, dateRange.end)} className="w-full mt-3 px-4 py-2 bg-gradient-to-r from-[var(--accent-1)] to-[var(--accent-2)] text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
                    Apply
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {filteredLeads.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-[var(--border)]" style={{ boxShadow: 'var(--shadow-card)' }}>
          <Activity className="w-16 h-16 text-[var(--placeholder)] mb-4" />
          <h3 className="text-lg font-semibold text-[var(--text)] mb-2">No data available</h3>
          <p className="text-[var(--muted)] text-center max-w-md">
            {leads.length === 0 ? "No leads have been processed yet." : "No leads found for the selected date range."}
          </p>
        </div>
      ) : (
        <>
          {/* Hero Stats - Compact First Row with Pastel Backgrounds */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-2.5">
            {/* Total Leads - Soft Blue/Indigo */}
            <div className="bg-gradient-to-br from-slate-50 to-blue-50 rounded-lg px-3 py-2.5 border border-slate-200/60">
              <div className="flex items-center justify-between mb-1">
                <div className="p-1.5 rounded-md bg-slate-100">
                  <Users className="w-3.5 h-3.5 text-slate-600" />
                </div>
                <TrendingUp className="w-3 h-3 text-slate-400" />
              </div>
              <h3 className="text-xl font-bold text-slate-800">{stats.total}</h3>
              <p className="text-[9px] text-slate-500 font-medium uppercase tracking-wide">Total Leads</p>
              <p className="text-[9px] text-slate-400">{stats.newLeads} new, {stats.contacted} contacted</p>
            </div>

            {/* Hot Leads - Soft Rose/Pink */}
            <div className="bg-gradient-to-br from-rose-50 to-pink-50 rounded-lg px-3 py-2.5 border border-rose-200/60">
              <div className="flex items-center justify-between mb-1">
                <div className="p-1.5 rounded-md bg-rose-100">
                  <Flame className="w-3.5 h-3.5 text-rose-500" />
                </div>
                {stats.hotLeads > 0 && <ArrowUpRight className="w-3 h-3 text-rose-400" />}
              </div>
              <h3 className="text-xl font-bold text-rose-700">{stats.hotLeads}</h3>
              <p className="text-[9px] text-rose-500 font-medium uppercase tracking-wide">Hot Leads</p>
              <p className="text-[9px] text-rose-400">{hotLeadPercent}% of total</p>
            </div>

            {/* High Intent - Soft Emerald/Green */}
            <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-lg px-3 py-2.5 border border-emerald-200/60">
              <div className="flex items-center justify-between mb-1">
                <div className="p-1.5 rounded-md bg-emerald-100">
                  <Target className="w-3.5 h-3.5 text-emerald-500" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-emerald-700">{stats.highIntent}</h3>
              <p className="text-[9px] text-emerald-500 font-medium uppercase tracking-wide">High Intent</p>
              <p className="text-[9px] text-emerald-400">{highIntentPercent}% of total</p>
            </div>

            {/* Avg Score - Soft Amber/Yellow */}
            <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-lg px-3 py-2.5 border border-amber-200/60">
              <div className="flex items-center justify-between mb-1">
                <div className="p-1.5 rounded-md bg-amber-100">
                  <Activity className="w-3.5 h-3.5 text-amber-500" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-amber-700">{stats.avgScore}</h3>
              <p className="text-[9px] text-amber-500 font-medium uppercase tracking-wide">Avg Score</p>
              <p className="text-[9px] text-amber-400">out of 100</p>
            </div>

            {/* Needs Action - Soft Red/Orange (Urgent) */}
            <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-lg px-3 py-2.5 border border-red-200/60">
              <div className="flex items-center justify-between mb-1">
                <div className="p-1.5 rounded-md bg-red-100">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                </div>
                <div className="w-1.5 h-1.5 bg-red-400 rounded-full animate-pulse" />
              </div>
              <h3 className="text-xl font-bold text-red-700">{stats.needsFollowup}</h3>
              <p className="text-[9px] text-red-500 font-medium uppercase tracking-wide">Needs Action</p>
              <p className="text-[9px] text-red-400">require follow-up</p>
            </div>
          </div>

          {/* Main Analytics Grid */}
          <div className="grid lg:grid-cols-3 gap-5">
            {/* Lead Temperature */}
            <div className="bg-white rounded-2xl border border-[var(--border)] p-5" style={{ boxShadow: 'var(--shadow-card)' }}>
              <div className="flex items-center gap-2 mb-5">
                <div className="p-2 rounded-lg bg-[var(--surface-2)]">
                  <ThermometerSun className="w-4 h-4 text-[var(--muted)]" />
                </div>
                <h3 className="font-semibold text-sm text-[var(--text)]">Lead Temperature</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Flame className="w-4 h-4 text-[var(--hot-primary)]" />
                      <span className="text-sm text-[var(--text-2)]">Hot</span>
                    </div>
                    <span className="text-sm font-semibold text-[var(--text)]">{leadTemperature.hot} leads</span>
                  </div>
                  <ProgressBar value={leadTemperature.hot} max={leadTemperature.total} color="linear-gradient(90deg, var(--hot-primary), var(--hot-light))" showLabel={false} />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Sun className="w-4 h-4 text-[var(--warm-primary)]" />
                      <span className="text-sm text-[var(--text-2)]">Warm</span>
                    </div>
                    <span className="text-sm font-semibold text-[var(--text)]">{leadTemperature.warm} leads</span>
                  </div>
                  <ProgressBar value={leadTemperature.warm} max={leadTemperature.total} color="linear-gradient(90deg, var(--warm-primary), var(--warm-light))" showLabel={false} />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Snowflake className="w-4 h-4 text-[var(--cold-primary)]" />
                      <span className="text-sm text-[var(--text-2)]">Cold</span>
                    </div>
                    <span className="text-sm font-semibold text-[var(--text)]">{leadTemperature.cold} leads</span>
                  </div>
                  <ProgressBar value={leadTemperature.cold} max={leadTemperature.total} color="var(--cold-primary)" showLabel={false} />
                </div>
              </div>
            </div>

            {/* Intent & Stage */}
            <div className="bg-white rounded-2xl border border-[var(--border)] p-5" style={{ boxShadow: 'var(--shadow-card)' }}>
              <div className="flex items-center gap-2 mb-5">
                <div className="p-2 rounded-lg bg-[var(--surface-2)]">
                  <Target className="w-4 h-4 text-[var(--muted)]" />
                </div>
                <h3 className="font-semibold text-sm text-[var(--text)]">Intent & Stage</h3>
              </div>

              <div className="mb-5">
                <p className="text-xs text-[var(--muted)] mb-3 font-medium uppercase tracking-wide">Intent Level</p>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-xs text-[var(--text-2)]">High Intent</span>
                      <span className="text-xs font-semibold text-[var(--text)]">{stats.byIntent.high}</span>
                    </div>
                    <ProgressBar value={stats.byIntent.high} max={stats.total} color="var(--success)" showLabel={false} />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-xs text-[var(--text-2)]">Medium</span>
                      <span className="text-xs font-semibold text-[var(--text)]">{stats.byIntent.medium}</span>
                    </div>
                    <ProgressBar value={stats.byIntent.medium} max={stats.total} color="var(--warning)" showLabel={false} />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-xs text-[var(--text-2)]">Low</span>
                      <span className="text-xs font-semibold text-[var(--text)]">{stats.byIntent.low}</span>
                    </div>
                    <ProgressBar value={stats.byIntent.low} max={stats.total} color="var(--cold-primary)" showLabel={false} />
                  </div>
                </div>
              </div>

              <div>
                <p className="text-xs text-[var(--muted)] mb-3 font-medium uppercase tracking-wide">Buyer Stage</p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Aware', value: stats.byStage.awareness, color: 'var(--accent-1)' },
                    { label: 'Consider', value: stats.byStage.consideration, color: 'var(--info)' },
                    { label: 'Decision', value: stats.byStage.decision, color: 'var(--success)' },
                  ].map((stage) => (
                    <div key={stage.label} className="text-center p-3 bg-[var(--surface-2)] rounded-xl">
                      <p className="text-xl font-bold text-[var(--text)]">{stage.value}</p>
                      <p className="text-[10px] text-[var(--muted)]">{stage.label}</p>
                      <div className="w-full h-1 mt-2 rounded-full overflow-hidden bg-[var(--surface-3)]">
                        <div className="h-full rounded-full transition-all" style={{ width: `${stats.total ? (stage.value / stats.total) * 100 : 0}%`, background: stage.color }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Urgency & Sentiment */}
            <div className="bg-white rounded-2xl border border-[var(--border)] p-5" style={{ boxShadow: 'var(--shadow-card)' }}>
              <div className="flex items-center gap-2 mb-5">
                <div className="p-2 rounded-lg bg-[var(--surface-2)]">
                  <AlertTriangle className="w-4 h-4 text-[var(--muted)]" />
                </div>
                <h3 className="font-semibold text-sm text-[var(--text)]">Urgency & Sentiment</h3>
              </div>

              <div className="mb-5">
                <p className="text-xs text-[var(--muted)] mb-3 font-medium uppercase tracking-wide">Urgency Level</p>
                <div className="flex gap-2">
                  {[
                    { label: 'Critical', value: stats.byUrgency.critical, color: 'var(--danger)' },
                    { label: 'High', value: stats.byUrgency.high, color: '#F97316' },
                    { label: 'Medium', value: stats.byUrgency.medium, color: 'var(--warning)' },
                    { label: 'Low', value: stats.byUrgency.low, color: 'var(--cold-primary)' },
                  ].map((u) => (
                    <div key={u.label} className="flex-1 text-center p-2 bg-[var(--surface-2)] rounded-lg">
                      <div className="w-2.5 h-2.5 rounded-full mx-auto mb-1" style={{ background: u.color }} />
                      <p className="text-lg font-bold text-[var(--text)]">{u.value}</p>
                      <p className="text-[9px] text-[var(--muted)]">{u.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs text-[var(--muted)] mb-3 font-medium uppercase tracking-wide">Sentiment</p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2 bg-[var(--success-soft)] rounded-lg">
                    <span className="text-xs font-medium text-[var(--success-text)]">Very Positive</span>
                    <span className="text-sm font-bold text-[var(--success)]">{sentimentData.veryPositive}</span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-green-50 rounded-lg">
                    <span className="text-xs font-medium text-green-700">Positive</span>
                    <span className="text-sm font-bold text-green-600">{sentimentData.positive}</span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-[var(--surface-2)] rounded-lg">
                    <span className="text-xs font-medium text-[var(--muted)]">Neutral</span>
                    <span className="text-sm font-bold text-[var(--text-2)]">{sentimentData.neutral}</span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-[var(--danger-soft)] rounded-lg">
                    <span className="text-xs font-medium text-[var(--danger-text)]">Negative</span>
                    <span className="text-sm font-bold text-[var(--danger)]">{sentimentData.negative}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Secondary Row */}
          <div className="grid lg:grid-cols-4 gap-5">
            {/* Top Topics */}
            <div className="bg-white rounded-2xl border border-[var(--border)] p-5" style={{ boxShadow: 'var(--shadow-card)' }}>
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 rounded-lg bg-[var(--surface-2)]">
                  <MessageCircle className="w-4 h-4 text-[var(--muted)]" />
                </div>
                <h3 className="font-semibold text-sm text-[var(--text)]">Top Topics</h3>
              </div>
              <div className="space-y-2">
                {topicData.length > 0 ? topicData.map((item, idx) => (
                  <div key={item.name} className="flex items-center justify-between p-2.5 bg-[var(--surface-2)] rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-gradient-to-br from-[var(--accent-1)] to-[var(--accent-2)] text-white text-[10px] flex items-center justify-center font-medium">{idx + 1}</span>
                      <span className="text-xs text-[var(--text-2)] truncate max-w-[100px]">{item.name}</span>
                    </div>
                    <span className="text-sm font-semibold text-[var(--text)]">{item.value}</span>
                  </div>
                )) : <p className="text-sm text-[var(--muted)] text-center py-4">No data</p>}
              </div>
            </div>

            {/* Regions */}
            <div className="bg-white rounded-2xl border border-[var(--border)] p-5" style={{ boxShadow: 'var(--shadow-card)' }}>
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 rounded-lg bg-[var(--surface-2)]">
                  <Globe className="w-4 h-4 text-[var(--muted)]" />
                </div>
                <h3 className="font-semibold text-sm text-[var(--text)]">Regions</h3>
              </div>
              <div className="space-y-2">
                {regionData.length > 0 ? regionData.map((item) => (
                  <div key={item.name} className="flex items-center justify-between p-2.5 bg-[var(--surface-2)] rounded-lg">
                    <span className="text-xs text-[var(--text-2)]">{item.name}</span>
                    <span className="text-sm font-semibold text-[var(--text)]">{item.value}</span>
                  </div>
                )) : <p className="text-sm text-[var(--muted)] text-center py-4">No data</p>}
              </div>
            </div>

            {/* Channels */}
            <div className="bg-white rounded-2xl border border-[var(--border)] p-5" style={{ boxShadow: 'var(--shadow-card)' }}>
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 rounded-lg bg-[var(--surface-2)]">
                  <Zap className="w-4 h-4 text-[var(--muted)]" />
                </div>
                <h3 className="font-semibold text-sm text-[var(--text)]">Channels</h3>
              </div>
              <div className="space-y-2">
                {channelData.length > 0 ? channelData.map((item) => (
                  <div key={item.name} className="flex items-center justify-between p-2.5 bg-[var(--surface-2)] rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-[var(--success)]" />
                      <span className="text-xs text-[var(--text-2)]">{item.name}</span>
                    </div>
                    <span className="text-sm font-semibold text-[var(--text)]">{item.value}</span>
                  </div>
                )) : <p className="text-sm text-[var(--muted)] text-center py-4">No data</p>}
              </div>
            </div>

            {/* Budget */}
            <div className="bg-white rounded-2xl border border-[var(--border)] p-5" style={{ boxShadow: 'var(--shadow-card)' }}>
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 rounded-lg bg-[var(--surface-2)]">
                  <DollarSign className="w-4 h-4 text-[var(--muted)]" />
                </div>
                <h3 className="font-semibold text-sm text-[var(--text)]">Budget Ranges</h3>
              </div>
              <div className="space-y-2">
                {budgetData.length > 0 ? budgetData.map((item) => (
                  <div key={item.name} className="flex items-center justify-between p-2.5 bg-[var(--surface-2)] rounded-lg">
                    <span className="text-xs text-[var(--text-2)] truncate max-w-[110px]">{item.name}</span>
                    <span className="text-sm font-semibold text-[var(--text)]">{item.value}</span>
                  </div>
                )) : <p className="text-sm text-[var(--muted)] text-center py-4">No data</p>}
              </div>
            </div>
          </div>

          {/* Bottom Row */}
          <div className="grid lg:grid-cols-3 gap-5">
            {/* Conversation Stats */}
            <div className="bg-white rounded-2xl border border-[var(--border)] p-5" style={{ boxShadow: 'var(--shadow-card)' }}>
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 rounded-lg bg-[var(--surface-2)]">
                  <Clock className="w-4 h-4 text-[var(--muted)]" />
                </div>
                <h3 className="font-semibold text-sm text-[var(--text)]">Conversation Stats</h3>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <MiniStat icon={Clock} label="Avg Minutes" value={conversationMetrics.avgDuration} color="var(--accent-1)" />
                <MiniStat icon={MessageCircle} label="Avg Messages" value={conversationMetrics.avgMessages} color="var(--success)" />
                <MiniStat icon={Activity} label="Total Msgs" value={conversationMetrics.totalMessages} color="var(--warning)" />
              </div>
            </div>

            {/* Data Completeness */}
            <div className="bg-white rounded-2xl border border-[var(--border)] p-5" style={{ boxShadow: 'var(--shadow-card)' }}>
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 rounded-lg bg-[var(--surface-2)]">
                  <CheckCircle2 className="w-4 h-4 text-[var(--muted)]" />
                </div>
                <h3 className="font-semibold text-sm text-[var(--text)]">Data Completeness</h3>
              </div>
              <div className="flex items-center justify-center">
                <div className="relative w-28 h-28">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="56" cy="56" r="48" stroke="var(--surface-3)" strokeWidth="10" fill="none" />
                    <circle cx="56" cy="56" r="48" stroke="url(#gradient)" strokeWidth="10" fill="none" strokeLinecap="round"
                      strokeDasharray={`${(dataQuality.avgCompleteness / 100) * 301.6} 301.6`}
                      className="transition-all duration-1000 ease-out" />
                    <defs>
                      <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="var(--accent-1)" />
                        <stop offset="100%" stopColor="var(--accent-2)" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold text-[var(--text)]">{dataQuality.avgCompleteness}%</span>
                    <span className="text-[10px] text-[var(--muted)]">Complete</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Use Cases & Competitors */}
            <div className="bg-white rounded-2xl border border-[var(--border)] p-5" style={{ boxShadow: 'var(--shadow-card)' }}>
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 rounded-lg bg-[var(--surface-2)]">
                  <Briefcase className="w-4 h-4 text-[var(--muted)]" />
                </div>
                <h3 className="font-semibold text-sm text-[var(--text)]">Use Cases</h3>
              </div>
              <div className="space-y-2">
                {useCaseData.length > 0 ? useCaseData.slice(0, 4).map((item) => (
                  <div key={item.name} className="flex items-center justify-between p-2 bg-[var(--surface-2)] rounded-lg">
                    <span className="text-xs text-[var(--text-2)] truncate max-w-[140px]">{item.name}</span>
                    <span className="text-xs font-bold text-[var(--text)]">{item.value}</span>
                  </div>
                )) : <p className="text-xs text-[var(--muted)] text-center py-2">No data</p>}
              </div>
              {competitorData.length > 0 && (
                <div className="mt-4 pt-3 border-t border-[var(--border)]">
                  <p className="text-xs text-[var(--muted)] mb-2 font-medium">Competitors Mentioned</p>
                  <div className="flex flex-wrap gap-1.5">
                    {competitorData.map((comp) => (
                      <span key={comp.name} className="px-2 py-1 bg-[var(--danger-soft)] text-[var(--danger-text)] text-xs rounded-lg font-medium">
                        {comp.name} ({comp.value})
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
