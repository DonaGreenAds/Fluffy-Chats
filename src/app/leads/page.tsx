'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import LeadTable from '@/components/LeadTable';
import LeadDetail from '@/components/LeadDetail';
import { useLeads } from '@/context/LeadContext';
import { Lead } from '@/types/lead';

export default function LeadsPage() {
  const { leads } = useLeads();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  // Auto-select lead if ID is in URL query params
  useEffect(() => {
    const leadId = searchParams.get('id');
    if (leadId && leads.length > 0) {
      const lead = leads.find(l => l.id === leadId);
      if (lead) {
        setSelectedLead(lead);
      }
    }
  }, [searchParams, leads]);

  // Clear URL param when closing lead detail
  const handleCloseLead = () => {
    setSelectedLead(null);
    // Remove the id param from URL
    router.push('/leads');
  };

  return (
    <div className="h-[calc(100vh-2rem)] flex flex-col">
      {/* Page Header */}
      <div className="p-6 border-b border-[var(--border)] animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Leads</h1>
          <p className="text-[var(--muted-foreground)]">
            View and manage all leads from Fluffy conversations
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {selectedLead ? (
          <div className="animate-slide-in-right w-full">
            <LeadDetail lead={selectedLead} onClose={handleCloseLead} />
          </div>
        ) : (
          <div className="flex-1 bg-[var(--card)] animate-slide-up animation-delay-100">
            <LeadTable
              leads={leads}
              onSelectLead={setSelectedLead}
              selectedLeadId={undefined}
            />
          </div>
        )}
      </div>
    </div>
  );
}
