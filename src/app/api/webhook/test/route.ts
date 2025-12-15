import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { url, headers: customHeaders } = await request.json();

    if (!url) {
      return NextResponse.json(
        { success: false, error: 'Webhook URL is required' },
        { status: 400 }
      );
    }

    const headers: Record<string, string> = {};

    // Parse and add custom headers
    if (customHeaders) {
      try {
        const parsed = JSON.parse(customHeaders);
        Object.assign(headers, parsed);
      } catch {
        // Invalid JSON headers, continue with default headers
      }
    }

    // Build query parameters with sample lead data for GET request
    const params = new URLSearchParams({
      event: 'newLead',
      timestamp: new Date().toISOString(),
      id: 'test-lead-' + Date.now(),
      prospect_name: 'Test User',
      phone: '+919876543210',
      email: 'test@example.com',
      company_name: 'Test Company',
      region: 'Mumbai, India',
      lead_score: '75',
      is_hot_lead: 'true',
      intent_level: 'high',
      buyer_stage: 'evaluation',
      urgency: 'medium',
      primary_topic: 'Product Demo',
      use_case_category: 'Sales Automation',
      conversation_summary: 'Test lead interested in product demo and pricing information.',
      next_action: 'Schedule a demo call',
      needs_immediate_followup: 'true',
      budget_bucket_inr: '50k-1L',
      is_enterprise: 'false',
      created_at: new Date().toISOString(),
    });

    const webhookUrlWithParams = `${url}${url.includes('?') ? '&' : '?'}${params.toString()}`;

    console.log(`[Webhook Test] Sending GET to: ${webhookUrlWithParams}`);

    const response = await fetch(webhookUrlWithParams, {
      method: 'GET',
      headers,
    });

    const statusText = response.statusText || 'Unknown';
    const status = response.status;

    console.log(`[Webhook Test] Response: ${status} ${statusText}`);

    if (response.ok) {
      return NextResponse.json({
        success: true,
        status,
        statusText,
      });
    } else {
      return NextResponse.json({
        success: false,
        error: `Server responded with ${status} ${statusText}`,
        status,
        statusText,
      });
    }
  } catch (error) {
    console.error('[Webhook Test] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send webhook',
      },
      { status: 500 }
    );
  }
}
