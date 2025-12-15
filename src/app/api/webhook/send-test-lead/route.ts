import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST() {
  try {
    // Read webhook config
    const configPath = path.join(process.cwd(), 'data', 'webhook-config.json');

    if (!fs.existsSync(configPath)) {
      return NextResponse.json(
        { success: false, error: 'No webhook configuration found' },
        { status: 400 }
      );
    }

    const webhookConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

    if (!webhookConfig?.url) {
      return NextResponse.json(
        { success: false, error: 'No webhook URL configured' },
        { status: 400 }
      );
    }

    // Check if newLead event is enabled
    if (!webhookConfig.events?.newLead) {
      return NextResponse.json(
        { success: false, error: 'newLead event is not enabled in webhook config' },
        { status: 400 }
      );
    }

    const headers: Record<string, string> = {};

    // Parse custom headers
    if (webhookConfig.headers) {
      try {
        const customHeaders = JSON.parse(webhookConfig.headers);
        Object.assign(headers, customHeaders);
      } catch {
        // Invalid JSON headers, skip
      }
    }

    // Create a realistic test lead
    const testLead = {
      id: `live-test-${Date.now()}`,
      prospect_name: 'Live Test Lead',
      phone: '+919876543210',
      email: 'livetest@example.com',
      company_name: 'GreenAds Global',
      region: 'Mumbai, India',
      lead_score: 85,
      is_hot_lead: true,
      intent_level: 'high',
      buyer_stage: 'decision',
      urgency: 'high',
      primary_topic: 'WhatsApp Integration',
      use_case_category: 'Lead Generation',
      conversation_summary: 'Live test lead - interested in WhatsApp chatbot for lead generation and customer support.',
      next_action: 'Schedule demo call',
      needs_immediate_followup: true,
      budget_bucket_inr: '1L-5L',
      is_enterprise: true,
      created_at: new Date().toISOString(),
    };

    // Build query parameters for GET request
    const params = new URLSearchParams({
      event: 'newLead',
      timestamp: new Date().toISOString(),
      id: testLead.id,
      prospect_name: testLead.prospect_name,
      phone: testLead.phone,
      email: testLead.email,
      company_name: testLead.company_name,
      region: testLead.region,
      lead_score: String(testLead.lead_score),
      is_hot_lead: String(testLead.is_hot_lead),
      intent_level: testLead.intent_level,
      buyer_stage: testLead.buyer_stage,
      urgency: testLead.urgency,
      primary_topic: testLead.primary_topic,
      use_case_category: testLead.use_case_category,
      conversation_summary: testLead.conversation_summary,
      next_action: testLead.next_action,
      needs_immediate_followup: String(testLead.needs_immediate_followup),
      budget_bucket_inr: testLead.budget_bucket_inr,
      is_enterprise: String(testLead.is_enterprise),
      created_at: testLead.created_at,
    });

    const webhookUrlWithParams = `${webhookConfig.url}${webhookConfig.url.includes('?') ? '&' : '?'}${params.toString()}`;

    console.log(`[Webhook Live Test] Sending GET to: ${webhookConfig.url}`);

    const response = await fetch(webhookUrlWithParams, {
      method: 'GET',
      headers,
    });

    const status = response.status;
    const statusText = response.statusText || 'Unknown';

    console.log(`[Webhook Live Test] Response: ${status} ${statusText}`);

    if (response.ok) {
      return NextResponse.json({
        success: true,
        message: 'Live test lead sent successfully!',
        lead: testLead,
        status,
        statusText,
      });
    } else {
      return NextResponse.json({
        success: false,
        error: `Webhook responded with ${status} ${statusText}`,
        status,
        statusText,
      });
    }
  } catch (error) {
    console.error('[Webhook Live Test] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send test lead',
      },
      { status: 500 }
    );
  }
}
