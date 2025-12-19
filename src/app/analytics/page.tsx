'use client';

import { useMemo, useState, useRef, useEffect } from 'react';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import {
  Users,
  TrendingUp,
  Clock,
  MessageCircle,
  Phone,
  Mail,
  Building2,
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
  PieChart as PieChartIcon,
  CheckCircle2,
  ArrowUpRight,
  Download
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

// Chart colors - aligned with 60/30/10 design system
const COLORS = {
  primary: '#8B5CF6',    // accent-1 (purple)
  secondary: '#A78BFA',  // accent-2 (light purple)
  success: '#10B981',    // green
  warning: '#FB7185',    // warm-primary (pink)
  danger: '#EF4444',     // red
  neutral: '#64748B',    // gray
  light: '#E2E8F0',      // light gray
  hot: '#8B5CF6',        // purple for hot leads
  warm: '#FB7185',       // pink for warm leads
  cold: '#94A3B8',       // gray for cold leads
  teal: '#0891B2',       // teal for links
};

const URGENCY_COLORS: Record<string, string> = {
  critical: '#EF4444',
  high: '#F59E0B',
  medium: '#64748B',
  low: '#CBD5E1',
};

export default function AnalyticsPage() {
  const { leads } = useLeads();
  const [showDatePicker, setShowDatePicker] = useState(false);
  const datePickerRef = useRef<HTMLDivElement>(null);

  // Close date picker when clicking outside
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
    return {
      start: formatDate(thirtyDaysAgo),
      end: formatDate(today),
    };
  });
  const [selectedPreset, setSelectedPreset] = useState('Last 30 days');

  // Filter leads by date range
  const filteredLeads = useMemo(() => {
    if (selectedPreset === 'All time') {
      return leads;
    }

    return leads.filter((lead) => {
      if (!lead.conversation_date) return false;
      const leadDate = lead.conversation_date;
      return leadDate >= dateRange.start && leadDate <= dateRange.end;
    });
  }, [leads, dateRange, selectedPreset]);

  // Apply date preset
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

  // Apply custom date range
  const applyCustomRange = (start: string, end: string) => {
    setDateRange({ start, end });
    setSelectedPreset('Custom');
    setShowDatePicker(false);
  };

  // Export leads to CSV spreadsheet
  const exportToSpreadsheet = () => {
    if (filteredLeads.length === 0) {
      alert('No leads to export for the selected date range');
      return;
    }

    // Define CSV headers
    const headers = [
      'Date',
      'Name',
      'Phone',
      'Email',
      'Company',
      'Region',
      'Lead Score',
      'Intent Level',
      'Buyer Stage',
      'Urgency',
      'Hot Lead',
      'Primary Topic',
      'Use Case',
      'Status',
      'Needs Followup',
      'Budget',
      'Enterprise',
      'Conversation Summary',
      'Next Action',
      'Duration (min)',
      'Messages',
      'Sentiment',
      'Source',
      'Created At'
    ];

    // Convert leads to CSV rows
    const csvRows = filteredLeads.map(lead => [
      lead.conversation_date || '',
      lead.prospect_name || '',
      lead.phone || '',
      lead.email || '',
      lead.company_name || '',
      lead.region || '',
      lead.lead_score?.toString() || '0',
      lead.intent_level || '',
      lead.buyer_stage || '',
      lead.urgency || '',
      lead.is_hot_lead ? 'Yes' : 'No',
      lead.primary_topic || '',
      lead.use_case_category || '',
      lead.status || 'new',
      lead.needs_immediate_followup ? 'Yes' : 'No',
      lead.budget_bucket_inr || '',
      lead.is_enterprise ? 'Yes' : 'No',
      (lead.conversation_summary || '').replace(/"/g, '""').replace(/\n/g, ' '),
      lead.next_action || '',
      lead.duration_minutes?.toString() || '0',
      lead.total_messages?.toString() || '0',
      lead.sentiment_overall || '',
      lead.source || 'WhatsApp',
      lead.created_at || ''
    ]);

    // Build CSV content
    const csvContent = [
      headers.join(','),
      ...csvRows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Create and download file
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

  // Calculate comprehensive stats from filtered leads
  const stats = useMemo(() => {
    const total = filteredLeads.length;
    if (total === 0) {
      return {
        total: 0,
        highIntent: 0,
        mediumIntent: 0,
        lowIntent: 0,
        hotLeads: 0,
        needsFollowup: 0,
        avgScore: 0,
        contacted: 0,
        notContacted: 0,
        qualified: 0,
        converted: 0,
        lost: 0,
        newLeads: 0,
        byIntent: { high: 0, medium: 0, low: 0 },
        byStage: { awareness: 0, consideration: 0, decision: 0 },
        byUrgency: { critical: 0, high: 0, medium: 0, low: 0 },
        byStatus: { new: 0, contacted: 0, qualified: 0, converted: 0, lost: 0 },
      };
    }

    // Count by status - handle undefined/null status as 'new'
    const statusCounts = { new: 0, contacted: 0, qualified: 0, converted: 0, lost: 0 };
    filteredLeads.forEach(l => {
      const status = l.status || 'new';
      if (status in statusCounts) {
        statusCounts[status as keyof typeof statusCounts]++;
      } else {
        statusCounts.new++;
      }
    });

    // Count by intent - handle undefined/null as 'medium'
    const intentCounts = { high: 0, medium: 0, low: 0 };
    filteredLeads.forEach(l => {
      const intent = l.intent_level || 'medium';
      if (intent in intentCounts) {
        intentCounts[intent as keyof typeof intentCounts]++;
      }
    });

    // Count by stage - handle undefined/null as 'awareness'
    const stageCounts = { awareness: 0, consideration: 0, decision: 0 };
    filteredLeads.forEach(l => {
      const stage = l.buyer_stage || 'awareness';
      if (stage in stageCounts) {
        stageCounts[stage as keyof typeof stageCounts]++;
      }
    });

    // Count by urgency - handle undefined/null as 'medium'
    const urgencyCounts = { critical: 0, high: 0, medium: 0, low: 0 };
    filteredLeads.forEach(l => {
      const urgency = l.urgency || 'medium';
      if (urgency in urgencyCounts) {
        urgencyCounts[urgency as keyof typeof urgencyCounts]++;
      }
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
      notContacted: statusCounts.new,
      qualified: statusCounts.qualified,
      converted: statusCounts.converted,
      lost: statusCounts.lost,
      newLeads: statusCounts.new,
      byIntent: intentCounts,
      byStage: stageCounts,
      byUrgency: urgencyCounts,
      byStatus: statusCounts,
    };
  }, [filteredLeads]);

  // Intent distribution chart data
  const intentData = [
    { name: 'High', value: stats.byIntent.high, color: COLORS.success },
    { name: 'Medium', value: stats.byIntent.medium, color: COLORS.warning },
    { name: 'Low', value: stats.byIntent.low, color: COLORS.light },
  ].filter(d => d.value > 0);

  // Buyer stage chart data
  const stageData = [
    { name: 'Awareness', value: stats.byStage.awareness },
    { name: 'Consideration', value: stats.byStage.consideration },
    { name: 'Decision', value: stats.byStage.decision },
  ];

  // Urgency distribution chart data
  const urgencyData = [
    { name: 'Critical', value: stats.byUrgency.critical, color: URGENCY_COLORS.critical },
    { name: 'High', value: stats.byUrgency.high, color: URGENCY_COLORS.high },
    { name: 'Medium', value: stats.byUrgency.medium, color: URGENCY_COLORS.medium },
    { name: 'Low', value: stats.byUrgency.low, color: URGENCY_COLORS.low },
  ].filter(d => d.value > 0);

  // Status distribution chart data - using design system colors
  const statusData = [
    { name: 'New', value: stats.byStatus.new, color: '#A78BFA' },      // Light purple
    { name: 'Contacted', value: stats.byStatus.contacted, color: '#8B5CF6' }, // Purple
    { name: 'Qualified', value: stats.byStatus.qualified, color: '#FB7185' }, // Pink
    { name: 'Converted', value: stats.byStatus.converted, color: '#10B981' }, // Green
    { name: 'Lost', value: stats.byStatus.lost, color: '#94A3B8' },    // Gray
  ].filter(d => d.value > 0);

  // Top topics from actual data
  const topicData = useMemo(() => {
    const topics: Record<string, number> = {};
    filteredLeads.forEach((lead) => {
      const topic = lead.primary_topic || 'General Inquiry';
      topics[topic] = (topics[topic] || 0) + 1;
    });
    return Object.entries(topics)
      .map(([name, value]) => ({ name: name.length > 20 ? name.slice(0, 20) + '...' : name, fullName: name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [filteredLeads]);

  // Source breakdown from actual data
  const sourceData = useMemo(() => {
    const sources: Record<string, number> = {};
    filteredLeads.forEach((lead) => {
      const source = lead.source || 'Direct';
      sources[source] = (sources[source] || 0) + 1;
    });
    return Object.entries(sources)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [filteredLeads]);

  // Channel breakdown from actual data
  const channelData = useMemo(() => {
    const channels: Record<string, number> = {};
    filteredLeads.forEach((lead) => {
      const channel = lead.channel || 'WhatsApp';
      channels[channel] = (channels[channel] || 0) + 1;
    });
    return Object.entries(channels)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredLeads]);

  // Region breakdown from actual data
  const regionData = useMemo(() => {
    const regions: Record<string, number> = {};
    filteredLeads.forEach((lead) => {
      const region = lead.region || 'Unknown';
      regions[region] = (regions[region] || 0) + 1;
    });
    return Object.entries(regions)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [filteredLeads]);

  // Budget distribution from actual data
  const budgetData = useMemo(() => {
    const budgets: Record<string, number> = {};
    filteredLeads.forEach((lead) => {
      const budget = lead.budget_bucket_inr || 'Not Specified';
      budgets[budget] = (budgets[budget] || 0) + 1;
    });
    return Object.entries(budgets)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredLeads]);

  // Daily leads trend from actual data
  const dailyLeads = useMemo(() => {
    const byDate: Record<string, number> = {};
    filteredLeads.forEach((lead) => {
      if (lead.conversation_date) {
        byDate[lead.conversation_date] = (byDate[lead.conversation_date] || 0) + 1;
      }
    });
    return Object.entries(byDate)
      .map(([date, count]) => ({
        date: date.slice(5),
        fullDate: date,
        count
      }))
      .sort((a, b) => a.fullDate.localeCompare(b.fullDate));
  }, [filteredLeads]);

  // Conversion metrics from actual data
  const conversionMetrics = useMemo(() => {
    const total = filteredLeads.length;
    if (total === 0) {
      return { intentRate: 0, hotRate: 0, decisionRate: 0, contactedRate: 0, conversionRate: 0 };
    }

    const highIntent = filteredLeads.filter((l) => l.intent_level === 'high').length;
    const hotLeads = filteredLeads.filter((l) => l.is_hot_lead === true).length;
    const decision = filteredLeads.filter((l) => l.buyer_stage === 'decision').length;
    const contacted = filteredLeads.filter((l) =>
      l.status === 'contacted' || l.status === 'qualified' || l.status === 'converted'
    ).length;
    const converted = filteredLeads.filter((l) => l.status === 'converted').length;

    return {
      intentRate: Math.round((highIntent / total) * 100),
      hotRate: Math.round((hotLeads / total) * 100),
      decisionRate: Math.round((decision / total) * 100),
      contactedRate: Math.round((contacted / total) * 100),
      conversionRate: Math.round((converted / total) * 100),
    };
  }, [filteredLeads]);

  // Data quality metrics from actual data
  const dataQuality = useMemo(() => {
    const total = filteredLeads.length;
    if (total === 0) {
      return { hasPhone: 0, hasEmail: 0, hasCompany: 0, avgCompleteness: 0, phoneRate: 0, emailRate: 0, companyRate: 0 };
    }
    // Check for phone - either has_phone flag or phone field has value
    const hasPhone = filteredLeads.filter((l) => l.has_phone === true || (l.phone && l.phone.trim() !== '')).length;
    // Check for email - either has_email flag or email field has value
    const hasEmail = filteredLeads.filter((l) => l.has_email === true || (l.email && l.email.trim() !== '')).length;
    // Check for company - either has_company flag or company_name field has value
    const hasCompany = filteredLeads.filter((l) => l.has_company === true || (l.company_name && l.company_name.trim() !== '')).length;
    return {
      hasPhone,
      hasEmail,
      hasCompany,
      avgCompleteness: Math.round(filteredLeads.reduce((acc, l) => acc + (l.completeness || 0), 0) / total),
      phoneRate: Math.round((hasPhone / total) * 100),
      emailRate: Math.round((hasEmail / total) * 100),
      companyRate: Math.round((hasCompany / total) * 100),
    };
  }, [filteredLeads]);

  // Conversation metrics from actual data
  const conversationMetrics = useMemo(() => {
    const total = filteredLeads.length;
    if (total === 0) {
      return { avgDuration: 0, avgMessages: 0, totalMessages: 0, avgUserMessages: 0, avgAssistantMessages: 0 };
    }
    const avgDuration = Math.round(filteredLeads.reduce((acc, l) => acc + (l.duration_minutes || 0), 0) / total);
    const avgMessages = Math.round(filteredLeads.reduce((acc, l) => acc + (l.total_messages || 0), 0) / total);
    const totalMessages = filteredLeads.reduce((acc, l) => acc + (l.total_messages || 0), 0);
    const avgUserMessages = Math.round(filteredLeads.reduce((acc, l) => acc + (l.user_messages || 0), 0) / total);
    const avgAssistantMessages = Math.round(filteredLeads.reduce((acc, l) => acc + (l.assistant_messages || 0), 0) / total);
    return { avgDuration, avgMessages, totalMessages, avgUserMessages, avgAssistantMessages };
  }, [filteredLeads]);

  // Sentiment distribution from actual data
  const sentimentData = useMemo(() => {
    const sentiments: Record<string, number> = {};
    filteredLeads.forEach((lead) => {
      const sentiment = lead.sentiment_overall || 'neutral';
      sentiments[sentiment] = (sentiments[sentiment] || 0) + 1;
    });
    return [
      { name: 'Very Positive', value: sentiments['very_positive'] || 0, color: '#10B981' },
      { name: 'Positive', value: sentiments['positive'] || 0, color: '#34D399' },
      { name: 'Neutral', value: sentiments['neutral'] || 0, color: '#94A3B8' },
      { name: 'Negative', value: sentiments['negative'] || 0, color: '#EF4444' },
    ].filter(d => d.value > 0);
  }, [filteredLeads]);

  // Enterprise vs SMB breakdown from actual data
  const businessTypeData = useMemo(() => {
    const enterprise = filteredLeads.filter(l => l.is_enterprise === true).length;
    const partner = filteredLeads.filter(l => l.is_partner === true).length;
    const smb = filteredLeads.filter(l => l.is_enterprise !== true && l.is_partner !== true).length;
    const result = [
      { name: 'Enterprise', value: enterprise, color: '#8B5CF6' },
      { name: 'Partner', value: partner, color: '#A78BFA' },
      { name: 'SMB', value: smb, color: '#94A3B8' },
    ];
    // If all values are 0, show SMB with total count
    if (enterprise === 0 && partner === 0 && smb === 0 && filteredLeads.length > 0) {
      return [{ name: 'SMB', value: filteredLeads.length, color: '#a3a3a3' }];
    }
    return result.filter(d => d.value > 0);
  }, [filteredLeads]);

  // Trust level distribution from actual data
  const trustData = useMemo(() => {
    const trusts: Record<string, number> = { high: 0, medium: 0, low: 0 };
    filteredLeads.forEach((lead) => {
      const trust = lead.trust_level || 'medium';
      if (trust in trusts) {
        trusts[trust]++;
      } else {
        trusts['medium']++;
      }
    });
    const result = [
      { name: 'High', value: trusts['high'], color: '#10B981' },
      { name: 'Medium', value: trusts['medium'], color: '#F59E0B' },
      { name: 'Low', value: trusts['low'], color: '#EF4444' },
    ];
    // If all are 0 but we have leads, default to medium
    if (trusts['high'] === 0 && trusts['medium'] === 0 && trusts['low'] === 0 && filteredLeads.length > 0) {
      return [{ name: 'Medium', value: filteredLeads.length, color: '#f59e0b' }];
    }
    return result.filter(d => d.value > 0);
  }, [filteredLeads]);

  // Use case categories from actual data
  const useCaseData = useMemo(() => {
    const useCases: Record<string, number> = {};
    filteredLeads.forEach((lead) => {
      const useCase = lead.use_case_category || 'General';
      useCases[useCase] = (useCases[useCase] || 0) + 1;
    });
    return Object.entries(useCases)
      .map(([name, value]) => ({ name: name.length > 18 ? name.slice(0, 18) + '...' : name, fullName: name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [filteredLeads]);

  // Top competitors mentioned from actual data
  const competitorData = useMemo(() => {
    const competitors: Record<string, number> = {};
    filteredLeads.forEach((lead) => {
      if (lead.competitors_mentioned && lead.competitors_mentioned.length > 0) {
        lead.competitors_mentioned.forEach(comp => {
          if (comp) {
            competitors[comp] = (competitors[comp] || 0) + 1;
          }
        });
      }
    });
    return Object.entries(competitors)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [filteredLeads]);

  return (
    <div className="p-6 lg:p-8 space-y-6 bg-[var(--bg-secondary)] min-h-screen">
      {/* Page Header */}
      <div className="relative animate-fade-in z-[100]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[var(--accent-soft)] flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-[var(--accent-solid)]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[var(--text)] tracking-tight">
                Lead Analytics
              </h1>
              <p className="text-[var(--muted)] text-sm mt-0.5">
                {filteredLeads.length === leads.length
                  ? `Complete analysis of ${leads.length} leads`
                  : `Analyzing ${filteredLeads.length} of ${leads.length} total leads`
                }
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Export Button */}
            <button
              onClick={exportToSpreadsheet}
              className="flex items-center gap-2 px-5 py-3 bg-[var(--surface-2)] text-[var(--text-2)] rounded-xl shadow-sm hover:bg-gradient-to-br hover:from-[var(--accent-1)] hover:to-[var(--accent-2)] hover:text-white hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
              title="Export to CSV"
            >
              <Download className="w-5 h-5" />
              <span className="font-medium">Export</span>
            </button>

            {/* Date Range Selector Button */}
            <div className="relative z-[100]" ref={datePickerRef}>
              <button
                onClick={() => setShowDatePicker(!showDatePicker)}
                className="flex items-center gap-3 px-6 py-3 bg-white rounded-xl border border-[var(--border)] shadow-sm hover:shadow-lg hover:border-[var(--accent-1)] transition-all duration-300 group"
              >
                <div className="w-10 h-10 rounded-lg bg-[var(--accent-soft)] flex items-center justify-center group-hover:bg-[var(--accent-1)]/20 transition-colors">
                  <Calendar className="w-5 h-5 text-[var(--accent-solid)]" />
                </div>
                <div className="text-left">
                  <p className="text-xs text-[var(--muted)] font-medium">Date Range</p>
                  <p className="text-sm font-semibold text-[var(--text)]">
                    {selectedPreset === 'Custom'
                      ? `${formatDisplayDate(dateRange.start)} - ${formatDisplayDate(dateRange.end)}`
                      : selectedPreset
                    }
                  </p>
                </div>
                <ChevronDown className={clsx(
                  "w-5 h-5 text-[var(--muted)] transition-transform duration-300",
                  showDatePicker && "rotate-180"
                )} />
              </button>

            {/* Date Picker Dropdown */}
            {showDatePicker && (
              <div className="absolute right-0 top-full mt-2 w-96 bg-white border border-neutral-200 rounded-2xl shadow-2xl z-[999] overflow-hidden animate-slide-down">
                <div className="p-5 border-b border-neutral-100">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold text-neutral-900 text-lg">Select Date Range</h4>
                    <button
                      onClick={() => setShowDatePicker(false)}
                      className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5 text-neutral-500" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {DATE_PRESETS.map((preset) => (
                      <button
                        key={preset.label}
                        onClick={() => applyPreset(preset)}
                        className={clsx(
                          "px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200",
                          selectedPreset === preset.label
                            ? "bg-[var(--accent-1)] text-white shadow-lg shadow-[var(--accent-1)]/30"
                            : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200 hover:scale-[1.02]"
                        )}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="p-5 bg-neutral-50">
                  <p className="text-xs text-neutral-500 mb-3 font-medium">Custom Range</p>
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <label className="text-xs text-neutral-500 mb-1 block">From</label>
                      <input
                        type="date"
                        value={dateRange.start}
                        onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                        className="w-full px-4 py-2.5 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-1)] focus:border-transparent bg-white"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs text-neutral-500 mb-1 block">To</label>
                      <input
                        type="date"
                        value={dateRange.end}
                        onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                        className="w-full px-4 py-2.5 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-1)] focus:border-transparent bg-white"
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => applyCustomRange(dateRange.start, dateRange.end)}
                    className="w-full mt-4 px-4 py-3 bg-[var(--accent-1)] text-white rounded-xl text-sm font-semibold hover:bg-[var(--accent-2)] transition-colors shadow-lg shadow-[var(--accent-1)]/30"
                  >
                    Apply Custom Range
                  </button>
                </div>
              </div>
            )}
            </div>
          </div>
        </div>
      </div>

      {/* No Data State */}
      {filteredLeads.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-neutral-200">
          <Activity className="w-16 h-16 text-neutral-300 mb-4" />
          <h3 className="text-xl font-semibold text-neutral-900 mb-2">No data available</h3>
          <p className="text-neutral-500 text-center max-w-md">
            {leads.length === 0
              ? "No leads have been processed yet. Process some chats to see analytics."
              : `No leads found for the selected date range. Try adjusting the date filter.`
            }
          </p>
        </div>
      ) : (
        <>
          {/* Hero Stats - Key Metrics */}
          <div className="grid grid-cols-5 gap-5 relative">
            {/* Total Leads */}
            <div className="group relative bg-white rounded-3xl p-5 border border-neutral-200/80 shadow-sm hover:shadow-xl hover:shadow-neutral-200/50 transition-all duration-500 hover:-translate-y-1 animate-slide-up">
              <div className="absolute inset-0 bg-gradient-to-br from-neutral-50 to-white rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-[var(--accent-soft)] flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <Users className="w-5 h-5 text-[var(--accent-solid)]" />
                  </div>
                  {stats.total > 0 && <TrendingUp className="w-4 h-4 text-[var(--success)]" />}
                </div>
                <p className="text-xs text-[var(--muted)] mb-1 font-medium">Total Leads</p>
                <p className="text-3xl font-bold text-[var(--text)] tracking-tight">{stats.total}</p>
                <p className="text-xs text-[var(--muted)] mt-1">
                  {stats.newLeads} new, {stats.contacted} contacted
                </p>
              </div>
            </div>

            {/* Hot Leads */}
            <div className="group relative bg-white rounded-3xl p-5 border border-neutral-200/80 shadow-sm hover:shadow-xl hover:shadow-neutral-200/50 transition-all duration-500 hover:-translate-y-1 animate-slide-up animation-delay-100">
              <div className="absolute inset-0 bg-gradient-to-br from-neutral-50 to-white rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-[var(--hot-soft)] flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <Zap className="w-5 h-5 text-[var(--hot-primary)]" />
                  </div>
                  {stats.hotLeads > 0 && <ArrowUpRight className="w-4 h-4 text-[var(--hot-primary)]" />}
                </div>
                <p className="text-xs text-[var(--muted)] mb-1 font-medium">Hot Leads</p>
                <p className="text-3xl font-bold text-[var(--text)] tracking-tight">{stats.hotLeads}</p>
                <p className="text-xs text-[var(--hot-primary)] mt-1 font-medium">
                  {conversionMetrics.hotRate}% of total
                </p>
              </div>
            </div>

            {/* High Intent */}
            <div className="group relative bg-white rounded-3xl p-5 border border-neutral-200/80 shadow-sm hover:shadow-xl hover:shadow-neutral-200/50 transition-all duration-500 hover:-translate-y-1 animate-slide-up animation-delay-200">
              <div className="absolute inset-0 bg-gradient-to-br from-neutral-50 to-white rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-[var(--success-soft)] flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <Target className="w-5 h-5 text-[var(--success)]" />
                  </div>
                </div>
                <p className="text-xs text-[var(--muted)] mb-1 font-medium">High Intent</p>
                <p className="text-3xl font-bold text-[var(--text)] tracking-tight">{stats.highIntent}</p>
                <p className="text-xs text-[var(--success)] mt-1 font-medium">
                  {conversionMetrics.intentRate}% of total
                </p>
              </div>
            </div>

            {/* Avg Score */}
            <div className="group relative bg-white rounded-3xl p-5 border border-neutral-200/80 shadow-sm hover:shadow-xl hover:shadow-neutral-200/50 transition-all duration-500 hover:-translate-y-1 animate-slide-up animation-delay-300">
              <div className="absolute inset-0 bg-gradient-to-br from-neutral-50 to-white rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-[var(--warm-soft)] flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <Activity className="w-5 h-5 text-[var(--warm-primary)]" />
                  </div>
                </div>
                <p className="text-xs text-[var(--muted)] mb-1 font-medium">Avg Lead Score</p>
                <p className="text-3xl font-bold text-[var(--text)] tracking-tight">{stats.avgScore}</p>
                <p className="text-xs text-[var(--muted)] mt-1">out of 100</p>
              </div>
            </div>

            {/* Needs Action */}
            <div className="group relative bg-gradient-to-br from-[var(--accent-1)] to-[var(--accent-2)] rounded-3xl p-5 shadow-xl shadow-[var(--accent-1)]/30 hover:shadow-2xl hover:shadow-[var(--accent-1)]/40 transition-all duration-500 hover:-translate-y-1 animate-slide-up animation-delay-400 overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl transform translate-x-8 -translate-y-8 group-hover:scale-150 transition-transform duration-700" />
              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-white" />
                  </div>
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                </div>
                <p className="text-xs text-white/80 mb-1 font-medium">Needs Action</p>
                <p className="text-3xl font-bold text-white tracking-tight">{stats.needsFollowup}</p>
                <p className="text-xs text-white/80 mt-1">require follow-up</p>
              </div>
            </div>
          </div>

          {/* Charts Row 1 - Distribution Charts */}
          <div className="grid grid-cols-4 gap-5">
            {/* Intent Distribution */}
            <div className="group bg-white rounded-3xl p-5 border border-neutral-200/80 shadow-sm hover:shadow-xl hover:shadow-neutral-200/50 transition-all duration-500 animate-slide-up animation-delay-500">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-neutral-100 flex items-center justify-center group-hover:bg-[var(--accent-1)] transition-colors duration-300">
                  <Target className="w-4 h-4 text-neutral-600 group-hover:text-white transition-colors duration-300" />
                </div>
                <h3 className="text-sm font-semibold text-neutral-900">Intent Level</h3>
              </div>
              {intentData.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie
                        data={intentData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={65}
                        paddingAngle={4}
                        dataKey="value"
                        stroke="none"
                      >
                        {intentData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} className="hover:opacity-80 transition-opacity cursor-pointer" />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          background: '#fff',
                          borderRadius: '12px',
                          border: '1px solid #e5e5e5',
                          boxShadow: '0 10px 40px rgba(0,0,0,0.1)'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap justify-center gap-3 mt-2">
                    {intentData.map((item) => (
                      <div key={item.name} className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-xs text-neutral-500">{item.name}</span>
                        <span className="text-xs font-bold text-neutral-900">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-neutral-400 text-sm">
                  No intent data
                </div>
              )}
            </div>

            {/* Urgency Distribution */}
            <div className="group bg-white rounded-3xl p-5 border border-neutral-200/80 shadow-sm hover:shadow-xl hover:shadow-neutral-200/50 transition-all duration-500 animate-slide-up animation-delay-600">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-neutral-100 flex items-center justify-center group-hover:bg-[var(--warm-primary)] transition-colors duration-300">
                  <AlertTriangle className="w-4 h-4 text-neutral-600 group-hover:text-white transition-colors duration-300" />
                </div>
                <h3 className="text-sm font-semibold text-neutral-900">Urgency Level</h3>
              </div>
              {urgencyData.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie
                        data={urgencyData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={65}
                        paddingAngle={4}
                        dataKey="value"
                        stroke="none"
                      >
                        {urgencyData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} className="hover:opacity-80 transition-opacity cursor-pointer" />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          background: '#fff',
                          borderRadius: '12px',
                          border: '1px solid #e5e5e5',
                          boxShadow: '0 10px 40px rgba(0,0,0,0.1)'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap justify-center gap-3 mt-2">
                    {urgencyData.map((item) => (
                      <div key={item.name} className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-xs text-neutral-500">{item.name}</span>
                        <span className="text-xs font-bold text-neutral-900">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-neutral-400 text-sm">
                  No urgency data
                </div>
              )}
            </div>

            {/* Status Distribution */}
            <div className="group bg-white rounded-3xl p-5 border border-neutral-200/80 shadow-sm hover:shadow-xl hover:shadow-neutral-200/50 transition-all duration-500 animate-slide-up animation-delay-700">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-neutral-100 flex items-center justify-center group-hover:bg-[var(--accent-2)] transition-colors duration-300">
                  <CheckCircle2 className="w-4 h-4 text-neutral-600 group-hover:text-white transition-colors duration-300" />
                </div>
                <h3 className="text-sm font-semibold text-neutral-900">Lead Status</h3>
              </div>
              {statusData.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie
                        data={statusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={65}
                        paddingAngle={4}
                        dataKey="value"
                        stroke="none"
                      >
                        {statusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} className="hover:opacity-80 transition-opacity cursor-pointer" />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          background: '#fff',
                          borderRadius: '12px',
                          border: '1px solid #e5e5e5',
                          boxShadow: '0 10px 40px rgba(0,0,0,0.1)'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap justify-center gap-3 mt-2">
                    {statusData.map((item) => (
                      <div key={item.name} className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-xs text-neutral-500">{item.name}</span>
                        <span className="text-xs font-bold text-neutral-900">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-neutral-400 text-sm">
                  No status data
                </div>
              )}
            </div>

            {/* Sentiment Distribution */}
            <div className="group bg-white rounded-3xl p-5 border border-neutral-200/80 shadow-sm hover:shadow-xl hover:shadow-neutral-200/50 transition-all duration-500 animate-slide-up animation-delay-800">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-neutral-100 flex items-center justify-center group-hover:bg-[var(--success)] transition-colors duration-300">
                  <MessageCircle className="w-4 h-4 text-neutral-600 group-hover:text-white transition-colors duration-300" />
                </div>
                <h3 className="text-sm font-semibold text-neutral-900">Sentiment</h3>
              </div>
              {sentimentData.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie
                        data={sentimentData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={65}
                        paddingAngle={4}
                        dataKey="value"
                        stroke="none"
                      >
                        {sentimentData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} className="hover:opacity-80 transition-opacity cursor-pointer" />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          background: '#fff',
                          borderRadius: '12px',
                          border: '1px solid #e5e5e5',
                          boxShadow: '0 10px 40px rgba(0,0,0,0.1)'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap justify-center gap-3 mt-2">
                    {sentimentData.map((item) => (
                      <div key={item.name} className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-xs text-neutral-500">{item.name}</span>
                        <span className="text-xs font-bold text-neutral-900">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-neutral-400 text-sm">
                  No sentiment data
                </div>
              )}
            </div>
          </div>

          {/* Charts Row 2 - Buyer Stage & Business Analysis */}
          <div className="grid grid-cols-2 gap-5">
            {/* Buyer Stage */}
            <div className="group bg-white rounded-3xl p-5 border border-neutral-200/80 shadow-sm hover:shadow-xl hover:shadow-neutral-200/50 transition-all duration-500 animate-slide-up animation-delay-900">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-neutral-100 flex items-center justify-center group-hover:bg-[var(--accent-1)] transition-colors duration-300">
                  <TrendingUp className="w-4 h-4 text-neutral-600 group-hover:text-white transition-colors duration-300" />
                </div>
                <h3 className="text-sm font-semibold text-neutral-900">Buyer Stage Funnel</h3>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={stageData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#737373' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#737373' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      background: '#fff',
                      borderRadius: '12px',
                      border: '1px solid #e5e5e5',
                      boxShadow: '0 10px 40px rgba(0,0,0,0.1)'
                    }}
                  />
                  <Bar dataKey="value" fill="#8B5CF6" radius={[8, 8, 0, 0]} maxBarSize={50} className="hover:opacity-80 transition-opacity" />
                </BarChart>
              </ResponsiveContainer>
            </div>


            {/* Business Type & Trust */}
            <div className="group bg-white rounded-3xl p-5 border border-neutral-200/80 shadow-sm hover:shadow-xl hover:shadow-neutral-200/50 transition-all duration-500 animate-slide-up animation-delay-1100">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-neutral-100 flex items-center justify-center group-hover:bg-[var(--accent-1)] transition-colors duration-300">
                  <Briefcase className="w-4 h-4 text-neutral-600 group-hover:text-white transition-colors duration-300" />
                </div>
                <h3 className="text-sm font-semibold text-neutral-900">Business Analysis</h3>
              </div>
              <div className="space-y-4">
                {/* Business Type */}
                <div>
                  <p className="text-xs text-neutral-500 mb-2 font-medium">Business Type</p>
                  <div className="flex gap-2">
                    {businessTypeData.map((item) => (
                      <div key={item.name} className="flex-1 p-3 bg-neutral-50 rounded-xl text-center">
                        <p className="text-lg font-bold text-neutral-900">{item.value}</p>
                        <p className="text-xs text-neutral-500">{item.name}</p>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Trust Level */}
                <div>
                  <p className="text-xs text-neutral-500 mb-2 font-medium">Trust Level</p>
                  <div className="flex gap-2">
                    {trustData.map((item) => (
                      <div key={item.name} className="flex-1 p-3 bg-neutral-50 rounded-xl text-center">
                        <div className="w-3 h-3 rounded-full mx-auto mb-1" style={{ backgroundColor: item.color }} />
                        <p className="text-lg font-bold text-neutral-900">{item.value}</p>
                        <p className="text-xs text-neutral-500">{item.name}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Charts Row 3 - Time Trends & Topics */}
          <div className="grid grid-cols-2 gap-5">
            {/* Leads Over Time */}
            <div className="group bg-white rounded-3xl p-5 border border-neutral-200/80 shadow-sm hover:shadow-xl hover:shadow-neutral-200/50 transition-all duration-500 animate-slide-up animation-delay-1200">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-neutral-100 flex items-center justify-center group-hover:bg-[var(--accent-1)] transition-colors duration-300">
                  <Activity className="w-4 h-4 text-neutral-600 group-hover:text-white transition-colors duration-300" />
                </div>
                <h3 className="text-sm font-semibold text-neutral-900">Leads Over Time</h3>
              </div>
              {dailyLeads.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={dailyLeads} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.15}/>
                        <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#737373' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#737373' }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        background: '#fff',
                        borderRadius: '12px',
                        border: '1px solid #e5e5e5',
                        boxShadow: '0 10px 40px rgba(0,0,0,0.1)'
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="count"
                      stroke="#8B5CF6"
                      strokeWidth={2}
                      fill="url(#colorLeads)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[240px] flex items-center justify-center text-neutral-400 text-sm">
                  No time series data available
                </div>
              )}
            </div>

            {/* Top Topics */}
            <div className="group bg-white rounded-3xl p-5 border border-neutral-200/80 shadow-sm hover:shadow-xl hover:shadow-neutral-200/50 transition-all duration-500 animate-slide-up animation-delay-1300">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-neutral-100 flex items-center justify-center group-hover:bg-[var(--accent-1)] transition-colors duration-300">
                  <Target className="w-4 h-4 text-neutral-600 group-hover:text-white transition-colors duration-300" />
                </div>
                <h3 className="text-sm font-semibold text-neutral-900">Top Topics Discussed</h3>
              </div>
              {topicData.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={topicData} layout="horizontal" margin={{ top: 10, right: 10, left: -20, bottom: 50 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" vertical={false} />
                    <XAxis
                      dataKey="name"
                      angle={-35}
                      textAnchor="end"
                      height={50}
                      tick={{ fontSize: 10, fill: '#737373' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis tick={{ fontSize: 11, fill: '#737373' }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        background: '#fff',
                        borderRadius: '12px',
                        border: '1px solid #e5e5e5',
                        boxShadow: '0 10px 40px rgba(0,0,0,0.1)'
                      }}
                      formatter={(value, name, props) => [value, props.payload.fullName || name]}
                    />
                    <Bar dataKey="value" fill="#8B5CF6" radius={[8, 8, 0, 0]} maxBarSize={40} className="hover:opacity-80 transition-opacity" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[240px] flex items-center justify-center text-neutral-400 text-sm">
                  No topic data available
                </div>
              )}
            </div>
          </div>

          {/* Charts Row 4 - Channel, Region, Budget */}
          <div className="grid grid-cols-3 gap-5">
            {/* Channel Breakdown */}
            <div className="group bg-white rounded-3xl p-5 border border-neutral-200/80 shadow-sm hover:shadow-xl hover:shadow-neutral-200/50 transition-all duration-500 animate-slide-up animation-delay-1500">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-neutral-100 flex items-center justify-center group-hover:bg-[var(--success)] transition-colors duration-300">
                  <MessageCircle className="w-4 h-4 text-neutral-600 group-hover:text-white transition-colors duration-300" />
                </div>
                <h3 className="text-sm font-semibold text-neutral-900">Channels</h3>
              </div>
              <div className="space-y-2">
                {channelData.length > 0 ? channelData.map((item, idx) => (
                  <div key={item.name} className="flex items-center justify-between p-2.5 bg-neutral-50 rounded-xl hover:bg-neutral-100 transition-colors">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-[var(--success)] text-white text-xs flex items-center justify-center font-medium">{idx + 1}</span>
                      <span className="text-xs text-neutral-700 font-medium">{item.name}</span>
                    </div>
                    <span className="text-sm font-bold text-neutral-900">{item.value}</span>
                  </div>
                )) : (
                  <div className="text-center py-8 text-neutral-400 text-sm">No channel data</div>
                )}
              </div>
            </div>

            {/* Region Breakdown */}
            <div className="group bg-white rounded-3xl p-5 border border-neutral-200/80 shadow-sm hover:shadow-xl hover:shadow-neutral-200/50 transition-all duration-500 animate-slide-up animation-delay-1600">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-neutral-100 flex items-center justify-center group-hover:bg-[var(--hot-primary)] transition-colors duration-300">
                  <Globe className="w-4 h-4 text-neutral-600 group-hover:text-white transition-colors duration-300" />
                </div>
                <h3 className="text-sm font-semibold text-neutral-900">Regions</h3>
              </div>
              <div className="space-y-2">
                {regionData.length > 0 ? regionData.slice(0, 5).map((item, idx) => (
                  <div key={item.name} className="flex items-center justify-between p-2.5 bg-neutral-50 rounded-xl hover:bg-neutral-100 transition-colors">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-[var(--hot-primary)] text-white text-xs flex items-center justify-center font-medium">{idx + 1}</span>
                      <span className="text-xs text-neutral-700 font-medium truncate max-w-[100px]">{item.name}</span>
                    </div>
                    <span className="text-sm font-bold text-neutral-900">{item.value}</span>
                  </div>
                )) : (
                  <div className="text-center py-8 text-neutral-400 text-sm">No region data</div>
                )}
              </div>
            </div>

            {/* Budget Distribution */}
            <div className="group bg-white rounded-3xl p-5 border border-neutral-200/80 shadow-sm hover:shadow-xl hover:shadow-neutral-200/50 transition-all duration-500 animate-slide-up animation-delay-1700">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-neutral-100 flex items-center justify-center group-hover:bg-[var(--warm-primary)] transition-colors duration-300">
                  <DollarSign className="w-4 h-4 text-neutral-600 group-hover:text-white transition-colors duration-300" />
                </div>
                <h3 className="text-sm font-semibold text-neutral-900">Budget Ranges</h3>
              </div>
              <div className="space-y-2">
                {budgetData.length > 0 ? budgetData.slice(0, 5).map((item, idx) => (
                  <div key={item.name} className="flex items-center justify-between p-2.5 bg-neutral-50 rounded-xl hover:bg-neutral-100 transition-colors">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-[var(--warm-primary)] text-white text-xs flex items-center justify-center font-medium">{idx + 1}</span>
                      <span className="text-xs text-neutral-700 font-medium truncate max-w-[100px]">{item.name}</span>
                    </div>
                    <span className="text-sm font-bold text-neutral-900">{item.value}</span>
                  </div>
                )) : (
                  <div className="text-center py-8 text-neutral-400 text-sm">No budget data</div>
                )}
              </div>
            </div>
          </div>

          {/* Charts Row 5 - Completeness, Conversation Stats & Use Cases */}
          <div className="grid grid-cols-3 gap-5">
            {/* Avg Completeness - Circular Progress */}
            <div className="group bg-white rounded-3xl p-5 border border-neutral-200/80 shadow-sm hover:shadow-xl hover:shadow-neutral-200/50 transition-all duration-500 animate-slide-up animation-delay-1900">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-xl bg-neutral-100 flex items-center justify-center group-hover:bg-[var(--accent-1)] transition-colors duration-300">
                  <PieChartIcon className="w-4 h-4 text-neutral-600 group-hover:text-white transition-colors duration-300" />
                </div>
                <h3 className="text-sm font-semibold text-neutral-900">Data Completeness</h3>
              </div>
              <div className="flex items-center justify-center py-2">
                <div className="relative w-28 h-28 group-hover:scale-105 transition-transform duration-500">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="56"
                      cy="56"
                      r="48"
                      stroke="#f5f5f5"
                      strokeWidth="8"
                      fill="none"
                    />
                    <circle
                      cx="56"
                      cy="56"
                      r="48"
                      stroke="#8B5CF6"
                      strokeWidth="8"
                      fill="none"
                      strokeDasharray={`${(dataQuality.avgCompleteness / 100) * 301.6} 301.6`}
                      strokeLinecap="round"
                      className="transition-all duration-1000 ease-out"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-bold text-neutral-900">{dataQuality.avgCompleteness}%</span>
                  </div>
                </div>
              </div>
              <p className="text-center text-xs text-neutral-500 mt-1">Average profile completeness</p>
            </div>

            {/* Conversation Stats */}
            <div className="group bg-white rounded-3xl p-5 border border-neutral-200/80 shadow-sm hover:shadow-xl hover:shadow-neutral-200/50 transition-all duration-500 animate-slide-up animation-delay-2000">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-neutral-100 flex items-center justify-center group-hover:bg-[var(--success)] transition-colors duration-300">
                  <MessageCircle className="w-4 h-4 text-neutral-600 group-hover:text-white transition-colors duration-300" />
                </div>
                <h3 className="text-sm font-semibold text-neutral-900">Conversation Stats</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-neutral-50 rounded-xl text-center">
                  <Clock className="w-4 h-4 text-neutral-400 mx-auto mb-1" />
                  <p className="text-xl font-bold text-neutral-900">{conversationMetrics.avgDuration}</p>
                  <p className="text-xs text-neutral-500">Avg Minutes</p>
                </div>
                <div className="p-3 bg-neutral-50 rounded-xl text-center">
                  <MessageCircle className="w-4 h-4 text-neutral-400 mx-auto mb-1" />
                  <p className="text-xl font-bold text-neutral-900">{conversationMetrics.avgMessages}</p>
                  <p className="text-xs text-neutral-500">Avg Messages</p>
                </div>
                <div className="p-3 bg-neutral-50 rounded-xl text-center">
                  <Users className="w-4 h-4 text-neutral-400 mx-auto mb-1" />
                  <p className="text-xl font-bold text-neutral-900">{conversationMetrics.avgUserMessages}</p>
                  <p className="text-xs text-neutral-500">User Msgs</p>
                </div>
                <div className="p-3 bg-neutral-50 rounded-xl text-center">
                  <Zap className="w-4 h-4 text-neutral-400 mx-auto mb-1" />
                  <p className="text-xl font-bold text-neutral-900">{conversationMetrics.avgAssistantMessages}</p>
                  <p className="text-xs text-neutral-500">Bot Msgs</p>
                </div>
              </div>
            </div>

            {/* Use Cases & Competitors */}
            <div className="group bg-white rounded-3xl p-5 border border-neutral-200/80 shadow-sm hover:shadow-xl hover:shadow-neutral-200/50 transition-all duration-500 animate-slide-up animation-delay-2100">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-neutral-100 flex items-center justify-center group-hover:bg-[var(--hot-primary)] transition-colors duration-300">
                  <Briefcase className="w-4 h-4 text-neutral-600 group-hover:text-white transition-colors duration-300" />
                </div>
                <h3 className="text-sm font-semibold text-neutral-900">Use Cases</h3>
              </div>
              <div className="space-y-2">
                {useCaseData.length > 0 ? useCaseData.slice(0, 4).map((item, idx) => (
                  <div key={item.name} className="flex items-center justify-between p-2 bg-neutral-50 rounded-lg">
                    <span className="text-xs text-neutral-700 truncate max-w-[120px]" title={item.fullName}>{item.name}</span>
                    <span className="text-xs font-bold text-neutral-900">{item.value}</span>
                  </div>
                )) : (
                  <div className="text-center py-4 text-neutral-400 text-xs">No use case data</div>
                )}
              </div>
              {competitorData.length > 0 && (
                <div className="mt-4 pt-3 border-t border-neutral-100">
                  <p className="text-xs text-neutral-500 mb-2 font-medium">Top Competitors Mentioned</p>
                  <div className="flex flex-wrap gap-1.5">
                    {competitorData.map((comp) => (
                      <span key={comp.name} className="px-2 py-1 bg-red-50 text-red-700 text-xs rounded-lg font-medium">
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

      {/* Custom Styles for Animations */}
      <style jsx global>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(2deg); }
        }

        @keyframes float-delayed {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-15px) rotate(-2deg); }
        }

        @keyframes pulse-slow {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.05); }
        }

        @keyframes slide-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes slide-down {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .animate-float {
          animation: float 6s ease-in-out infinite;
        }

        .animate-float-delayed {
          animation: float-delayed 8s ease-in-out infinite;
          animation-delay: 2s;
        }

        .animate-pulse-slow {
          animation: pulse-slow 8s ease-in-out infinite;
        }

        .animate-slide-up {
          animation: slide-up 0.6s ease-out forwards;
          opacity: 0;
        }

        .animate-slide-down {
          animation: slide-down 0.3s ease-out forwards;
        }

        .animate-fade-in {
          animation: fade-in 0.8s ease-out forwards;
        }

        .animation-delay-100 { animation-delay: 0.1s; }
        .animation-delay-200 { animation-delay: 0.2s; }
        .animation-delay-300 { animation-delay: 0.3s; }
        .animation-delay-400 { animation-delay: 0.4s; }
        .animation-delay-500 { animation-delay: 0.5s; }
        .animation-delay-600 { animation-delay: 0.6s; }
        .animation-delay-700 { animation-delay: 0.7s; }
        .animation-delay-800 { animation-delay: 0.8s; }
        .animation-delay-900 { animation-delay: 0.9s; }
        .animation-delay-1000 { animation-delay: 1s; }
        .animation-delay-1100 { animation-delay: 1.1s; }
        .animation-delay-1200 { animation-delay: 1.2s; }
        .animation-delay-1300 { animation-delay: 1.3s; }
        .animation-delay-1400 { animation-delay: 1.4s; }
        .animation-delay-1500 { animation-delay: 1.5s; }
        .animation-delay-1600 { animation-delay: 1.6s; }
        .animation-delay-1700 { animation-delay: 1.7s; }
        .animation-delay-1800 { animation-delay: 1.8s; }
        .animation-delay-1900 { animation-delay: 1.9s; }
        .animation-delay-2000 { animation-delay: 2s; }
        .animation-delay-2100 { animation-delay: 2.1s; }
        .animation-delay-2200 { animation-delay: 2.2s; }
      `}</style>
    </div>
  );
}
