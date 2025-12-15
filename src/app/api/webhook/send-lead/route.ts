import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { leadsDb } from '@/lib/database';

interface WebhookConfig {
  id: string;
  name: string;
  url: string;
  isActive: boolean;
  events: {
    newLead?: boolean;
    hotLead?: boolean;
    urgentFollowup?: boolean;
    enterpriseLead?: boolean;
    highScoreLead?: boolean;
  };
  headers?: string;
}

export async function POST(request: Request) {
  try {
    const { lead, webhookIds } = await request.json();

    if (!lead) {
      return NextResponse.json(
        { success: false, error: 'Lead data is required' },
        { status: 400 }
      );
    }

    // Read webhook config
    const configPath = path.join(process.cwd(), 'data', 'webhook-config.json');

    if (!fs.existsSync(configPath)) {
      return NextResponse.json(
        { success: false, error: 'No webhook configuration found. Please configure webhook in Integrations.' },
        { status: 400 }
      );
    }

    const allWebhooks: WebhookConfig[] = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

    if (!Array.isArray(allWebhooks) || allWebhooks.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No webhook configurations found. Please configure webhooks in Integrations.' },
        { status: 400 }
      );
    }

    // Filter to selected webhooks (or all active if none specified)
    let webhooksToSend = allWebhooks.filter(w => w.isActive);

    if (webhookIds && Array.isArray(webhookIds) && webhookIds.length > 0) {
      webhooksToSend = allWebhooks.filter(w => webhookIds.includes(w.id));
    }

    if (webhooksToSend.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No webhooks selected or no active webhooks available.' },
        { status: 400 }
      );
    }

    // Determine which events apply to this lead
    const applicableEvents: string[] = ['newLead']; // Always include newLead

    if (lead.is_hot_lead) {
      applicableEvents.push('hotLead');
    }
    if (lead.needs_immediate_followup) {
      applicableEvents.push('urgentFollowup');
    }
    if (lead.is_enterprise) {
      applicableEvents.push('enterpriseLead');
    }
    if ((lead.lead_score || 0) >= 80) {
      applicableEvents.push('highScoreLead');
    }

    const allResults: { webhook: string; event: string; status: number | string }[] = [];

    // Send to each selected webhook
    for (const webhook of webhooksToSend) {
      if (!webhook.url) continue;

      const headers: Record<string, string> = {};

      // Parse custom headers
      if (webhook.headers) {
        try {
          const customHeaders = JSON.parse(webhook.headers);
          Object.assign(headers, customHeaders);
        } catch {
          // Invalid JSON headers, skip
        }
      }

      // Filter to only enabled events for this webhook
      const eventsToSend = applicableEvents.filter(event => webhook.events?.[event as keyof typeof webhook.events]);

      if (eventsToSend.length === 0) continue;

      // Send webhook for each applicable event
      for (const eventType of eventsToSend) {
        const params = new URLSearchParams({
          event: eventType,
          timestamp: new Date().toISOString(),
          id: lead.id || '',
          prospect_name: lead.prospect_name || '',
          phone: lead.phone || '',
          email: lead.email || '',
          company_name: lead.company_name || '',
          region: lead.region || '',
          lead_score: String(lead.lead_score || 0),
          is_hot_lead: String(lead.is_hot_lead || false),
          intent_level: lead.intent_level || '',
          buyer_stage: lead.buyer_stage || '',
          urgency: lead.urgency || '',
          primary_topic: lead.primary_topic || '',
          use_case_category: lead.use_case_category || '',
          conversation_summary: lead.conversation_summary || '',
          next_action: lead.next_action || '',
          needs_immediate_followup: String(lead.needs_immediate_followup || false),
          budget_bucket_inr: lead.budget_bucket_inr || '',
          is_enterprise: String(lead.is_enterprise || false),
          created_at: lead.created_at || new Date().toISOString(),
        });

        const webhookUrlWithParams = `${webhook.url}${webhook.url.includes('?') ? '&' : '?'}${params.toString()}`;

        try {
          const response = await fetch(webhookUrlWithParams, {
            method: 'GET',
            headers,
          });
          allResults.push({ webhook: webhook.name, event: eventType, status: response.status });
        } catch (error) {
          allResults.push({ webhook: webhook.name, event: eventType, status: String(error) });
        }
      }
    }

    if (allResults.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No applicable events are enabled for any of the selected webhooks.' },
        { status: 400 }
      );
    }

    const successCount = allResults.filter(r => typeof r.status === 'number' && r.status >= 200 && r.status < 300).length;
    const allSucceeded = successCount === allResults.length;

    // Mark lead as synced to webhook if any events succeeded
    if (successCount > 0 && lead.id) {
      try {
        await leadsDb.markSyncedTo(lead.id, 'webhook');
        console.log(`[Webhook] Marked lead ${lead.id} as synced to webhook`);
      } catch (dbError) {
        console.error('[Webhook] Failed to mark lead as synced:', dbError);
      }
    }

    return NextResponse.json({
      success: allSucceeded,
      message: allSucceeded
        ? `Lead sent successfully! (${allResults.length} event${allResults.length > 1 ? 's' : ''} to ${webhooksToSend.length} webhook${webhooksToSend.length > 1 ? 's' : ''})`
        : `Sent ${successCount}/${allResults.length} events`,
      results: allResults,
    });
  } catch (error) {
    console.error('[Webhook Send Lead] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send lead to webhook',
      },
      { status: 500 }
    );
  }
}
