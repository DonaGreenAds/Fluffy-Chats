/**
 * =============================================================================
 * LEAD TABLE COMPONENT
 * =============================================================================
 *
 * Interactive table displaying all leads with filtering, sorting, and bulk
 * actions. Primary interface for lead management in the application.
 *
 * FEATURES:
 * - Full-text search across 6 fields (name, company, phone, email, topic, region)
 * - Sort by 4 fields: date (default), name, company, topic
 * - Multi-select with "select all visible" option
 * - Bulk operations: mark contacted, delete
 * - Inline delete for owners
 * - Click row to open lead detail panel
 *
 * SEARCH BEHAVIOR:
 * Searches are case-insensitive and match any part of:
 * 1. prospect_name
 * 2. company_name
 * 3. phone
 * 4. email
 * 5. primary_topic
 * 6. region
 *
 * PERMISSIONS:
 * - View: All authenticated users
 * - Mark Contacted: All users
 * - Delete: Owner role only
 *
 * PERFORMANCE:
 * Uses useMemo to optimize search+sort calculations
 *
 * =============================================================================
 */

'use client';

import { useState, useMemo } from 'react';
import { Lead } from '@/types/lead';
import { useAuth } from '@/context/AuthContext';
import { useLeads } from '@/context/LeadContext';
import {
  Search,
  ChevronDown,
  ChevronUp,
  Phone,
  Mail,
  CheckCircle2,
  Trash2,
  Loader2,
  Send,
  CheckSquare,
  Square,
  X
} from 'lucide-react';
import clsx from 'clsx';

// Component props
interface LeadTableProps {
  leads: Lead[];                           // Array of leads to display
  onSelectLead: (lead: Lead) => void;      // Called when a lead row is clicked
  selectedLeadId?: string;                  // Currently selected lead (highlighted)
}

// Sortable columns - only these 4 fields support sorting
type SortField = 'conversation_date' | 'prospect_name' | 'company_name' | 'primary_topic';
type SortDirection = 'asc' | 'desc';

export default function LeadTable({ leads, onSelectLead, selectedLeadId }: LeadTableProps) {
  const { user } = useAuth();
  const { deleteLead, bulkMarkContacted, bulkDelete } = useLeads();
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('conversation_date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState<string | null>(null);

  const isOwner = user?.role === 'owner';

  const handleDelete = async (e: React.MouseEvent, leadId: string) => {
    e.stopPropagation(); // Prevent row click
    if (!confirm('Are you sure you want to delete this lead?')) return;

    setDeletingId(leadId);
    await deleteLead(leadId);
    setDeletingId(null);
  };

  // Filter and sort leads - must be defined first as other functions depend on it
  const filteredAndSortedLeads = useMemo(() => {
    let result = [...leads];

    // Search
    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(
        (lead) =>
          lead.prospect_name.toLowerCase().includes(searchLower) ||
          lead.company_name.toLowerCase().includes(searchLower) ||
          lead.phone.includes(search) ||
          lead.email.toLowerCase().includes(searchLower) ||
          lead.primary_topic.toLowerCase().includes(searchLower) ||
          lead.region.toLowerCase().includes(searchLower)
      );
    }

    // Sort
    result.sort((a, b) => {
      let aVal: string | number = a[sortField] || '';
      let bVal: string | number = b[sortField] || '';

      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [leads, search, sortField, sortDirection]);

  // Toggle single selection
  const toggleSelection = (e: React.MouseEvent, leadId: string) => {
    e.stopPropagation();
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(leadId)) {
        newSet.delete(leadId);
      } else {
        newSet.add(leadId);
      }
      return newSet;
    });
  };

  // Select all visible leads
  const selectAll = () => {
    const allVisibleIds = filteredAndSortedLeads.map(l => l.id);
    setSelectedIds(new Set(allVisibleIds));
  };

  // Deselect all
  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  // Check if all visible leads are selected
  const allSelected = filteredAndSortedLeads.length > 0 &&
    filteredAndSortedLeads.every(l => selectedIds.has(l.id));

  // Handle bulk mark as contacted
  const handleBulkMarkContacted = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Mark ${selectedIds.size} lead(s) as contacted?`)) return;

    setBulkActionLoading('contacted');
    const result = await bulkMarkContacted(Array.from(selectedIds));
    setBulkActionLoading(null);

    if (result.success > 0) {
      alert(`Successfully marked ${result.success} lead(s) as contacted${result.failed > 0 ? `. ${result.failed} failed.` : ''}`);
      setSelectedIds(new Set());
    }
  };

  // Handle bulk delete (owner only)
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0 || !isOwner) return;
    if (!confirm(`Are you sure you want to delete ${selectedIds.size} lead(s)? This cannot be undone.`)) return;

    setBulkActionLoading('delete');
    const result = await bulkDelete(Array.from(selectedIds));
    setBulkActionLoading(null);

    if (result.success > 0) {
      alert(`Successfully deleted ${result.success} lead(s)${result.failed > 0 ? `. ${result.failed} failed.` : ''}`);
      setSelectedIds(new Set());
    }
  };

  // Handle send to CRM (placeholder - opens alert for now)
  const handleSendToCRM = async () => {
    if (selectedIds.size === 0) return;

    const selectedLeads = filteredAndSortedLeads.filter(l => selectedIds.has(l.id));
    const leadInfo = selectedLeads.map(l => `- ${l.prospect_name} (${l.phone || l.email || 'No contact'})`).join('\n');

    alert(`Send to CRM feature coming soon!\n\nSelected ${selectedIds.size} lead(s):\n${leadInfo}`);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronDown className="w-4 h-4 opacity-30" />;
    return sortDirection === 'asc' ? (
      <ChevronUp className="w-4 h-4" />
    ) : (
      <ChevronDown className="w-4 h-4" />
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Search Bar */}
      <div className="p-4 border-b border-[var(--border)]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--muted-foreground)]" />
          <input
            type="text"
            placeholder="Search leads by name, company, phone, topic, or region..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-[var(--secondary)] border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
          />
        </div>
      </div>

      {/* Results count and bulk actions */}
      <div className="px-4 py-2 border-b border-[var(--border)] flex items-center justify-between">
        <div className="text-sm text-[var(--muted-foreground)]">
          Showing {filteredAndSortedLeads.length} of {leads.length} leads
          {selectedIds.size > 0 && (
            <span className="ml-2 text-[var(--primary)] font-medium">
              ({selectedIds.size} selected)
            </span>
          )}
        </div>

        {/* Bulk Actions Toolbar */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleSendToCRM}
              disabled={bulkActionLoading !== null}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              Send to CRM
            </button>
            <button
              onClick={handleBulkMarkContacted}
              disabled={bulkActionLoading !== null}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 transition-colors disabled:opacity-50"
            >
              {bulkActionLoading === 'contacted' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5" />
              )}
              Mark Contacted
            </button>
            {isOwner && (
              <button
                onClick={handleBulkDelete}
                disabled={bulkActionLoading !== null}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 transition-colors disabled:opacity-50"
              >
                {bulkActionLoading === 'delete' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                Delete Selected
              </button>
            )}
            <button
              onClick={deselectAll}
              className="inline-flex items-center gap-1 px-2 py-1.5 text-xs font-medium rounded-lg text-[var(--muted-foreground)] hover:bg-[var(--secondary)] transition-colors"
              title="Clear selection"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full">
          <thead className="sticky top-0 bg-[var(--card)] border-b border-[var(--border)]">
            <tr>
              <th className="text-left p-4 w-12">
                <button
                  onClick={allSelected ? deselectAll : selectAll}
                  className="flex items-center justify-center w-5 h-5 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                  title={allSelected ? "Deselect all" : "Select all"}
                >
                  {allSelected ? (
                    <CheckSquare className="w-5 h-5 text-[var(--primary)]" />
                  ) : (
                    <Square className="w-5 h-5" />
                  )}
                </button>
              </th>
              <th className="text-left p-4">
                <button
                  onClick={() => handleSort('prospect_name')}
                  className="flex items-center gap-1 text-xs font-semibold uppercase text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                >
                  Lead <SortIcon field="prospect_name" />
                </button>
              </th>
              <th className="text-left p-4">
                <span className="text-xs font-semibold uppercase text-[var(--muted-foreground)]">
                  Contact
                </span>
              </th>
              <th className="text-left p-4">
                <button
                  onClick={() => handleSort('company_name')}
                  className="flex items-center gap-1 text-xs font-semibold uppercase text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                >
                  Company <SortIcon field="company_name" />
                </button>
              </th>
              <th className="text-left p-4">
                <button
                  onClick={() => handleSort('primary_topic')}
                  className="flex items-center gap-1 text-xs font-semibold uppercase text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                >
                  Topic <SortIcon field="primary_topic" />
                </button>
              </th>
              <th className="text-left p-4">
                <span className="text-xs font-semibold uppercase text-[var(--muted-foreground)]">
                  Region
                </span>
              </th>
              <th className="text-left p-4">
                <span className="text-xs font-semibold uppercase text-[var(--muted-foreground)]">
                  Use Case
                </span>
              </th>
              <th className="text-left p-4">
                <span className="text-xs font-semibold uppercase text-[var(--muted-foreground)]">
                  Status
                </span>
              </th>
              <th className="text-left p-4">
                <button
                  onClick={() => handleSort('conversation_date')}
                  className="flex items-center gap-1 text-xs font-semibold uppercase text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                >
                  Date <SortIcon field="conversation_date" />
                </button>
              </th>
              {isOwner && (
                <th className="text-left p-4">
                  <span className="text-xs font-semibold uppercase text-[var(--muted-foreground)]">
                    Actions
                  </span>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedLeads.map((lead) => (
              <tr
                key={lead.id}
                onClick={() => onSelectLead(lead)}
                className={clsx(
                  'lead-row cursor-pointer border-b border-[var(--border)]',
                  selectedLeadId === lead.id && 'bg-[var(--primary)]/5',
                  selectedIds.has(lead.id) && 'bg-[var(--primary)]/10'
                )}
              >
                <td className="p-4 w-12">
                  <button
                    onClick={(e) => toggleSelection(e, lead.id)}
                    className="flex items-center justify-center w-5 h-5 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                  >
                    {selectedIds.has(lead.id) ? (
                      <CheckSquare className="w-5 h-5 text-[var(--primary)]" />
                    ) : (
                      <Square className="w-5 h-5" />
                    )}
                  </button>
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-[var(--text)] font-semibold flex-shrink-0"
                      style={{ backgroundColor: `var(--avatar-${['pink', 'mint', 'lavender', 'peach', 'sage', 'sky', 'coral'][lead.prospect_name.charCodeAt(0) % 7]})` }}
                    >
                      {lead.prospect_name === 'unknown' || lead.prospect_name === 'Unknown Lead'
                        ? (lead.company_name && lead.company_name !== 'unknown' ? lead.company_name.charAt(0).toUpperCase() : 'L')
                        : lead.prospect_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-medium text-[var(--foreground)]">
                        {lead.prospect_name === 'unknown' || lead.prospect_name === 'Unknown Lead'
                          ? (lead.company_name && lead.company_name !== 'unknown' && lead.company_name !== 'Unknown'
                              ? `Lead from ${lead.company_name}`
                              : lead.phone && lead.phone !== 'unknown'
                                ? `Lead ${lead.phone.slice(-4)}`
                                : 'New Lead')
                          : lead.prospect_name}
                      </div>
                      <div className="text-xs text-[var(--muted-foreground)]">
                        {lead.total_messages} messages • {lead.duration_minutes > 0 ? `${lead.duration_minutes} min` : (lead.duration_seconds ?? 0) > 0 ? `${lead.duration_seconds}s` : '< 1 min'}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="p-4">
                  <div className="flex flex-wrap gap-1.5">
                    {lead.has_phone && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <Phone className="w-3 h-3" />
                        {lead.phone}
                      </span>
                    )}
                    {lead.has_email && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                        <Mail className="w-3 h-3" />
                        {lead.email}
                      </span>
                    )}
                    {!lead.has_phone && !lead.has_email && (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500 border border-gray-200">
                        No contact info
                      </span>
                    )}
                  </div>
                </td>
                <td className="p-4">
                  <span className="text-sm text-[var(--foreground)]">
                    {lead.company_name && lead.company_name !== 'unknown' ? lead.company_name : '-'}
                  </span>
                </td>
                <td className="p-4">
                  <span className="text-sm text-[var(--foreground)]">
                    {lead.primary_topic}
                  </span>
                </td>
                <td className="p-4">
                  <span className="text-sm text-[var(--foreground)]">
                    {lead.region && lead.region !== 'Unknown' && lead.region !== 'unknown' ? lead.region : '-'}
                  </span>
                </td>
                <td className="p-4">
                  <span className="text-sm text-[var(--foreground)]">
                    {lead.use_case_category}
                  </span>
                </td>
                <td className="p-4">
                  {lead.status === 'contacted' ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Contacted
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                      Not Contacted
                    </span>
                  )}
                </td>
                <td className="p-4">
                  <div className="text-sm font-medium text-[var(--foreground)]">
                    {(() => {
                      // Handle YYYY-MM-DD format without timezone conversion
                      const dateStr = lead.conversation_date;
                      if (!dateStr) return 'Unknown';

                      // If it's YYYY-MM-DD format, parse manually to avoid timezone issues
                      const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
                      if (match) {
                        const [, year, month, day] = match;
                        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                        return `${day} ${monthNames[parseInt(month, 10) - 1]} ${year}`;
                      }

                      // Fallback for other formats
                      return dateStr;
                    })()}
                  </div>
                  <div className="text-xs text-[var(--muted-foreground)] mt-0.5">
                    {lead.start_time_ist}
                  </div>
                </td>
                {isOwner && (
                  <td className="p-4">
                    <button
                      onClick={(e) => handleDelete(e, lead.id)}
                      disabled={deletingId === lead.id}
                      className="p-2 rounded-lg text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-50"
                      title="Delete lead"
                    >
                      {deletingId === lead.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>

        {filteredAndSortedLeads.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-[var(--muted-foreground)]">
            <Search className="w-12 h-12 mb-4 opacity-30" />
            <p className="text-lg font-medium">No leads found</p>
            <p className="text-sm">Try adjusting your search</p>
          </div>
        )}
      </div>
    </div>
  );
}
