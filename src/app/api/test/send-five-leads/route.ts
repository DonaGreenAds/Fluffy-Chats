import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST() {
  const results: any[] = [];

  // Read webhook config
  const configPath = path.join(process.cwd(), 'data', 'webhook-config.json');
  let webhookConfig: any = null;

  if (fs.existsSync(configPath)) {
    webhookConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  }

  // 5 different leads with different characteristics
  const testLeads = [
    {
      // Lead 1: Regular new lead (tests newLead event)
      id: `test-new-${Date.now()}`,
      prospect_name: 'Rahul Kumar',
      phone: '+919876543001',
      email: 'rahul@startup.com',
      company_name: 'TechStart India',
      region: 'Bangalore, India',
      lead_score: 65,
      is_hot_lead: false,
      intent_level: 'medium',
      buyer_stage: 'awareness',
      urgency: 'low',
      primary_topic: 'Product Information',
      use_case_category: 'Customer Support',
      conversation_summary: 'Interested in basic product information and pricing.',
      next_action: 'Send brochure',
      needs_immediate_followup: false,
      budget_bucket_inr: '10k-50k',
      is_enterprise: false,
      events: ['newLead'],
    },
    {
      // Lead 2: Hot lead (tests newLead + hotLead events)
      id: `test-hot-${Date.now()}`,
      prospect_name: 'Priya Sharma',
      phone: '+919876543002',
      email: 'priya@growthco.in',
      company_name: 'GrowthCo Solutions',
      region: 'Mumbai, India',
      lead_score: 78,
      is_hot_lead: true,
      intent_level: 'high',
      buyer_stage: 'evaluation',
      urgency: 'medium',
      primary_topic: 'Demo Request',
      use_case_category: 'Sales Automation',
      conversation_summary: 'Very interested in demo, comparing with competitors.',
      next_action: 'Schedule demo this week',
      needs_immediate_followup: false,
      budget_bucket_inr: '50k-1L',
      is_enterprise: false,
      events: ['newLead', 'hotLead'],
    },
    {
      // Lead 3: Urgent followup (tests newLead + urgentFollowup events)
      id: `test-urgent-${Date.now()}`,
      prospect_name: 'Amit Patel',
      phone: '+919876543003',
      email: 'amit@retailking.com',
      company_name: 'RetailKing',
      region: 'Delhi, India',
      lead_score: 72,
      is_hot_lead: false,
      intent_level: 'high',
      buyer_stage: 'decision',
      urgency: 'high',
      primary_topic: 'Pricing Negotiation',
      use_case_category: 'E-commerce Integration',
      conversation_summary: 'Ready to buy but needs pricing clarification urgently.',
      next_action: 'Call within 2 hours',
      needs_immediate_followup: true,
      budget_bucket_inr: '1L-5L',
      is_enterprise: false,
      events: ['newLead', 'urgentFollowup'],
    },
    {
      // Lead 4: Enterprise lead (tests newLead + enterpriseLead events)
      id: `test-enterprise-${Date.now()}`,
      prospect_name: 'Vikram Singh',
      phone: '+919876543004',
      email: 'vikram@megacorp.com',
      company_name: 'MegaCorp Industries',
      region: 'Chennai, India',
      lead_score: 75,
      is_hot_lead: false,
      intent_level: 'medium',
      buyer_stage: 'evaluation',
      urgency: 'medium',
      primary_topic: 'Enterprise Solution',
      use_case_category: 'Enterprise CRM',
      conversation_summary: 'Large enterprise looking for customized solution.',
      next_action: 'Prepare custom proposal',
      needs_immediate_followup: false,
      budget_bucket_inr: '10L+',
      is_enterprise: true,
      events: ['newLead', 'enterpriseLead'],
    },
    {
      // Lead 5: High score lead - Hot + Urgent + Enterprise (tests all events)
      id: `test-premium-${Date.now()}`,
      prospect_name: 'Neha Gupta',
      phone: '+919876543005',
      email: 'neha@unicorntech.io',
      company_name: 'Unicorn Tech',
      region: 'Hyderabad, India',
      lead_score: 92,
      is_hot_lead: true,
      intent_level: 'very_high',
      buyer_stage: 'decision',
      urgency: 'critical',
      primary_topic: 'Full Platform Integration',
      use_case_category: 'Complete Business Suite',
      conversation_summary: 'Premium lead - Ready to sign, needs immediate attention. Multi-million deal potential.',
      next_action: 'CEO call scheduled',
      needs_immediate_followup: true,
      budget_bucket_inr: '50L+',
      is_enterprise: true,
      events: ['newLead', 'hotLead', 'urgentFollowup', 'enterpriseLead', 'highScoreLead'],
    },
  ];

  // Parse webhook headers
  const webhookHeaders: Record<string, string> = {};
  if (webhookConfig?.headers) {
    try {
      const customHeaders = JSON.parse(webhookConfig.headers);
      Object.assign(webhookHeaders, customHeaders);
    } catch {
      // Invalid JSON headers
    }
  }

  // Send each lead
  for (const lead of testLeads) {
    const leadResult: any = {
      lead: lead.prospect_name,
      events: lead.events,
      webhook: { sent: false, events: [] },
      sheets: { sent: false },
      hubspot: { sent: false },
      zoho: { sent: false },
    };

    // Send webhook for each applicable event
    if (webhookConfig?.url) {
      for (const eventType of lead.events) {
        if (webhookConfig.events?.[eventType]) {
          const params = new URLSearchParams({
            event: eventType,
            timestamp: new Date().toISOString(),
            id: lead.id,
            prospect_name: lead.prospect_name,
            phone: lead.phone,
            email: lead.email,
            company_name: lead.company_name,
            region: lead.region,
            lead_score: String(lead.lead_score),
            is_hot_lead: String(lead.is_hot_lead),
            intent_level: lead.intent_level,
            buyer_stage: lead.buyer_stage,
            urgency: lead.urgency,
            primary_topic: lead.primary_topic,
            use_case_category: lead.use_case_category,
            conversation_summary: lead.conversation_summary,
            next_action: lead.next_action,
            needs_immediate_followup: String(lead.needs_immediate_followup),
            budget_bucket_inr: lead.budget_bucket_inr,
            is_enterprise: String(lead.is_enterprise),
            created_at: new Date().toISOString(),
          });

          const webhookUrl = `${webhookConfig.url}${webhookConfig.url.includes('?') ? '&' : '?'}${params.toString()}`;

          try {
            const response = await fetch(webhookUrl, {
              method: 'GET',
              headers: webhookHeaders,
            });
            leadResult.webhook.events.push({ event: eventType, status: response.status });
            leadResult.webhook.sent = true;
          } catch (error) {
            leadResult.webhook.events.push({ event: eventType, error: String(error) });
          }
        }
      }
    }

    // Sync to Google Sheets
    try {
      const { syncLeadToGoogleSheets, isGoogleSheetsLiveSyncEnabled } = await import('@/lib/google-sheets-sync');
      if (isGoogleSheetsLiveSyncEnabled()) {
        const fullLead = {
          ...lead,
          conversation_date: new Date().toISOString().split('T')[0],
          start_time_ist: '10:00:00',
          end_time_ist: '10:15:00',
          duration_minutes: 15,
          duration_seconds: 0,
          total_messages: 12,
          user_messages: 6,
          assistant_messages: 6,
          messages_per_minute: 0.8,
          engagement_rate: 50,
          session_id: lead.id,
          conversation: 'Test conversation',
          sentiment_overall: 'positive',
          emotional_intensity: 'medium',
          trust_level: 'high',
          secondary_topics: [],
          need_summary: lead.conversation_summary,
          recommended_routing: 'sales',
          key_questions: [],
          main_objections: [],
          competitors_mentioned: [],
          estimated_scale: 'medium',
          is_partner: false,
          completeness: 85,
          has_phone: true,
          has_email: true,
          has_company: true,
          source: 'test',
          channel: 'WhatsApp',
          status: 'new',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        const result = await syncLeadToGoogleSheets(fullLead as any);
        leadResult.sheets = { sent: result.success, error: result.error };
      } else {
        leadResult.sheets = { sent: false, reason: 'liveSync disabled' };
      }
    } catch (error) {
      leadResult.sheets = { sent: false, error: String(error) };
    }

    // Sync to HubSpot
    try {
      const { syncLeadToHubSpot, isHubSpotLiveSyncEnabled } = await import('@/lib/hubspot-sync');
      if (isHubSpotLiveSyncEnabled()) {
        const fullLead = {
          ...lead,
          conversation_date: new Date().toISOString().split('T')[0],
          session_id: lead.id,
          conversation: 'Test conversation',
          conversation_summary: lead.conversation_summary,
          source: 'test',
          channel: 'WhatsApp',
          created_at: new Date().toISOString(),
        };
        const result = await syncLeadToHubSpot(fullLead as any);
        leadResult.hubspot = { sent: result.success, error: result.error };
      } else {
        leadResult.hubspot = { sent: false, reason: 'liveSync disabled' };
      }
    } catch (error) {
      leadResult.hubspot = { sent: false, error: String(error) };
    }

    // Sync to Zoho
    try {
      const { syncLeadToZoho, isZohoLiveSyncEnabled } = await import('@/lib/zoho-sync');
      if (isZohoLiveSyncEnabled()) {
        const fullLead = {
          ...lead,
          session_id: lead.id,
          source: 'test',
          created_at: new Date().toISOString(),
        };
        const result = await syncLeadToZoho(fullLead as any);
        leadResult.zoho = { sent: result.success, error: result.error };
      } else {
        leadResult.zoho = { sent: false, reason: 'liveSync disabled or not connected' };
      }
    } catch (error) {
      leadResult.zoho = { sent: false, error: String(error) };
    }

    results.push(leadResult);

    // Small delay between leads
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  return NextResponse.json({
    success: true,
    message: '5 test leads sent!',
    results,
  });
}
