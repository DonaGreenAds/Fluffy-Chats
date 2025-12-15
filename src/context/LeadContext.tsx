/**
 * =============================================================================
 * LEAD STATE MANAGEMENT CONTEXT
 * =============================================================================
 *
 * Manages all lead data throughout the application. Provides a unified
 * interface for accessing, updating, and syncing leads.
 *
 * TWO LEAD SOURCES:
 *
 * 1. Sample Leads (leads state):
 *    - Hardcoded demo data from sampleLeads.ts
 *    - Status persisted in localStorage
 *    - Used for UI testing and demos without touching real data
 *
 * 2. Database Leads (webhookLeads state):
 *    - Actual leads from WhatsApp conversations
 *    - Fetched via /api/leads endpoint (SQLite database)
 *    - Contains full AI analysis and metadata
 *
 * LEAD LIFECYCLE:
 * new → (user marks as contacted) → contacted
 *
 * POLLING STRATEGY:
 * - Polls every 30 seconds for new leads
 * - Only polls when browser tab is visible (saves bandwidth)
 * - Immediately refreshes when tab becomes visible again
 *
 * =============================================================================
 */

'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Lead } from '@/types/lead';
import { sampleLeads as initialLeads } from '@/data/sampleLeads';

// Context type definition - all methods available to consumers
interface LeadContextType {
  leads: Lead[];                                                              // Combined leads (sample + database)
  webhookLeads: Lead[];                                                       // Database leads only
  updateLeadStatus: (leadId: string, status: Lead['status']) => void;        // Update lead status
  markAsContacted: (leadId: string) => void;                                 // Shortcut for status='contacted'
  getLeadById: (leadId: string) => Lead | undefined;                         // Find lead by ID
  refreshWebhookLeads: () => Promise<void>;                                  // Manually refresh from database
  deleteLead: (leadId: string) => Promise<boolean>;                          // Delete a lead
  triggerProcessing: () => Promise<{ success: boolean; message: string }>;   // Trigger chat processing
  bulkMarkContacted: (leadIds: string[]) => Promise<{ success: number; failed: number }>;  // Bulk update
  bulkDelete: (leadIds: string[]) => Promise<{ success: number; failed: number }>;         // Bulk delete
  stats: {
    total: number;           // Total lead count
    contacted: number;       // Leads marked as contacted
    needsFollowup: number;   // Leads not yet contacted
    newLeads: number;        // Leads with status 'new'
  };
}

const LeadContext = createContext<LeadContextType | undefined>(undefined);

/**
 * LeadProvider - Wraps the app to provide lead state
 *
 * Usage: Wrap your app or page with <LeadProvider>
 * Access: const { leads, markAsContacted, ... } = useLeads();
 */
export function LeadProvider({ children }: { children: ReactNode }) {
  // Sample leads - in-memory with localStorage persistence for status
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  // Database leads - fetched from SQLite via API
  const [webhookLeads, setWebhookLeads] = useState<Lead[]>([]);

  // Fetch leads from local API (SQLite database)
  const refreshWebhookLeads = useCallback(async () => {
    try {
      console.log('[LeadContext] Fetching leads from local database...');
      const response = await fetch('/api/leads');
      const result = await response.json();

      if (!result.success) {
        console.error('[LeadContext] API error:', result.error);
        return;
      }

      if (result.leads) {
        console.log('[LeadContext] Fetched leads:', result.leads.length);
        setWebhookLeads(result.leads);
      }
    } catch (error) {
      console.error('Failed to fetch leads:', error);
    }
  }, []);

  // Trigger chat processing (calls the process-chats endpoint)
  const triggerProcessing = useCallback(async (): Promise<{ success: boolean; message: string }> => {
    try {
      console.log('[LeadContext] Triggering chat processing...');
      const response = await fetch('/api/process-chats');
      const result = await response.json();

      if (result.success) {
        // Refresh leads after processing
        await refreshWebhookLeads();
        return {
          success: true,
          message: `Processed ${result.results?.processed?.length || 0} new chats`
        };
      } else {
        return { success: false, message: result.error || 'Processing failed' };
      }
    } catch (error) {
      console.error('Failed to trigger processing:', error);
      return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
    }
  }, [refreshWebhookLeads]);

  // Load persisted state from localStorage on mount
  useEffect(() => {
    const savedLeads = localStorage.getItem('fluffychats_leads');
    if (savedLeads) {
      try {
        const parsed = JSON.parse(savedLeads);
        setLeads(initialLeads.map(lead => {
          const saved = parsed.find((s: { id: string; status: Lead['status'] }) => s.id === lead.id);
          return saved ? { ...lead, status: saved.status } : lead;
        }));
      } catch (e) {
        console.error('Failed to parse saved leads:', e);
      }
    }

    // Fetch leads from database on mount
    refreshWebhookLeads();

    // Smart polling: only poll when tab is visible
    let interval: NodeJS.Timeout | null = null;

    const startPolling = () => {
      if (!interval) {
        interval = setInterval(refreshWebhookLeads, 10000); // Poll every 10 seconds
      }
    };

    const stopPolling = () => {
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopPolling();
      } else {
        refreshWebhookLeads(); // Refresh immediately when tab becomes visible
        startPolling();
      }
    };

    // Start polling if tab is visible
    if (!document.hidden) {
      startPolling();
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refreshWebhookLeads]);

  // Save sample leads status to localStorage
  useEffect(() => {
    const toSave = leads.map(l => ({ id: l.id, status: l.status }));
    localStorage.setItem('fluffychats_leads', JSON.stringify(toSave));
  }, [leads]);

  const updateLeadStatus = async (leadId: string, status: Lead['status']) => {
    // Check if it's a database lead (not a sample lead)
    const isDatabaseLead = webhookLeads.some(l => l.id === leadId);

    if (isDatabaseLead) {
      // Update via API
      try {
        const response = await fetch(`/api/leads/${leadId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        });

        const result = await response.json();
        if (!result.success) {
          console.error('Failed to update lead status:', result.error);
          return;
        }

        setWebhookLeads(prev => prev.map(lead =>
          lead.id === leadId ? { ...lead, status } : lead
        ));
      } catch (error) {
        console.error('Failed to update lead status:', error);
      }
    } else {
      setLeads(prev => prev.map(lead =>
        lead.id === leadId ? { ...lead, status } : lead
      ));
    }
  };

  const markAsContacted = (leadId: string) => {
    updateLeadStatus(leadId, 'contacted');
  };

  // Delete a lead
  const deleteLead = useCallback(async (leadId: string): Promise<boolean> => {
    try {
      const isDatabaseLead = webhookLeads.some(l => l.id === leadId);

      if (isDatabaseLead) {
        const response = await fetch(`/api/leads/${leadId}`, {
          method: 'DELETE',
        });

        const result = await response.json();
        if (!result.success) {
          console.error('Failed to delete lead:', result.error);
          return false;
        }

        setWebhookLeads(prev => prev.filter(lead => lead.id !== leadId));
        return true;
      } else {
        setLeads(prev => prev.filter(lead => lead.id !== leadId));
        return true;
      }
    } catch (error) {
      console.error('Failed to delete lead:', error);
      return false;
    }
  }, [webhookLeads]);

  // Bulk mark leads as contacted
  const bulkMarkContacted = useCallback(async (leadIds: string[]): Promise<{ success: number; failed: number }> => {
    let success = 0;
    let failed = 0;

    for (const leadId of leadIds) {
      try {
        const isDatabaseLead = webhookLeads.some(l => l.id === leadId);

        if (isDatabaseLead) {
          const response = await fetch(`/api/leads/${leadId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'contacted' }),
          });

          const result = await response.json();
          if (result.success) {
            success++;
          } else {
            failed++;
          }
        } else {
          success++;
        }
      } catch {
        failed++;
      }
    }

    // Refresh leads after bulk update
    if (success > 0) {
      // Update local state for sample leads
      setLeads(prev => prev.map(lead =>
        leadIds.includes(lead.id) ? { ...lead, status: 'contacted' as const } : lead
      ));
      // Update webhook leads state
      setWebhookLeads(prev => prev.map(lead =>
        leadIds.includes(lead.id) ? { ...lead, status: 'contacted' as const } : lead
      ));
    }

    return { success, failed };
  }, [webhookLeads]);

  // Bulk delete leads
  const bulkDelete = useCallback(async (leadIds: string[]): Promise<{ success: number; failed: number }> => {
    let success = 0;
    let failed = 0;

    for (const leadId of leadIds) {
      const deleted = await deleteLead(leadId);
      if (deleted) {
        success++;
      } else {
        failed++;
      }
    }

    return { success, failed };
  }, [deleteLead]);

  // Combine sample leads with database leads
  const allLeads = [...leads, ...webhookLeads];

  const getLeadById = (leadId: string) => {
    return allLeads.find(lead => lead.id === leadId);
  };

  const stats = {
    total: allLeads.length,
    contacted: allLeads.filter(l => l.status === 'contacted').length,
    needsFollowup: allLeads.filter(l => l.status !== 'contacted').length,
    newLeads: allLeads.filter(l => l.status === 'new').length,
  };

  return (
    <LeadContext.Provider value={{
      leads: allLeads,
      webhookLeads,
      updateLeadStatus,
      markAsContacted,
      getLeadById,
      refreshWebhookLeads,
      deleteLead,
      triggerProcessing,
      bulkMarkContacted,
      bulkDelete,
      stats
    }}>
      {children}
    </LeadContext.Provider>
  );
}

export function useLeads() {
  const context = useContext(LeadContext);
  if (context === undefined) {
    throw new Error('useLeads must be used within a LeadProvider');
  }
  return context;
}
