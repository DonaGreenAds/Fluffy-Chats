/**
 * =============================================================================
 * CORE CONVERSATION PROCESSING PIPELINE
 * =============================================================================
 *
 * This is the heart of FluffyChats - converts WhatsApp conversations from Redis
 * into analyzed leads stored in the database.
 *
 * TRIGGER METHODS:
 * - Vercel Cron: Automatically every 5 minutes (production)
 * - Manual: Via UI button or direct API call (testing)
 *
 * PROCESSING FLOW:
 * 1. Redis Scan    → Find all active conversation keys (chat:*)
 * 2. TTL Filter    → Only process conversations ending soon (TTL 0-2 hours)
 * 3. Deduplication → Skip if already in database
 * 4. AI Analysis   → Gemini/OpenAI analyzes conversation psychologically
 * 5. Enrichment    → Calculate scores, flags (hot_lead, enterprise, etc.)
 * 6. Database Save → Store lead with all analysis
 * 7. CRM Auto-Sync → Send to Google Sheets/HubSpot/Zoho if configured
 * 8. Webhooks      → Notify configured webhooks based on lead type
 *
 * SECURITY:
 * Requires CRON_SECRET environment variable as Bearer token.
 * Vercel automatically provides this for scheduled cron jobs.
 *
 * =============================================================================
 */

import { NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { analyzeConversation, enrichAnalysis } from '@/lib/gemini';
import { leadsDb } from '@/lib/database';
import { Lead } from '@/types/lead';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';

/**
 * Triggers configured webhooks after a lead is processed
 *
 * Webhooks are configured in data/webhook-config.json
 * Each webhook can subscribe to specific events:
 * - newLead: Any new lead processed
 * - hotLead: Lead score >= 70
 * - urgentFollowup: Needs immediate attention
 * - enterpriseLead: Large deal opportunity
 * - highScoreLead: Score >= 80
 */
async function triggerWebhooks(lead: Lead, eventType: string) {
  try {
    const configPath = path.join(process.cwd(), 'data', 'webhook-config.json');
    if (!fs.existsSync(configPath)) return;

    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    const webhooks = config.webhooks || [];

    for (const webhook of webhooks) {
      // Only trigger if webhook is active and event is enabled
      if (!webhook.isActive || !webhook.events?.[eventType]) continue;

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      try {
        if (webhook.headers) {
          Object.assign(headers, JSON.parse(webhook.headers));
        }
      } catch {}

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
        created_at: lead.created_at || '',
      });

      const webhookUrl = `${webhook.url}${webhook.url.includes('?') ? '&' : '?'}${params.toString()}`;

      try {
        const response = await fetch(webhookUrl, { method: 'GET', headers });
        console.log(`[ProcessChats] Webhook ${webhook.name} triggered for ${eventType}: ${response.status}`);
      } catch (err) {
        console.error(`[ProcessChats] Webhook ${webhook.name} failed:`, err);
      }
    }
  } catch (error) {
    console.error('[ProcessChats] Webhook trigger error:', error);
  }
}

// ============================================================================
// CONFIGURATION
// ============================================================================

// Maximum messages to analyze per conversation (prevents token overflow)
const MAX_MESSAGES = 50;

// TTL Threshold Strategy:
// - MIN = 0: Process conversations that are about to expire
// - MAX = 6600 (110 minutes): Process conversations with 10+ minutes of inactivity (2hr=7200s, 7200-600=6600)
// This ensures we analyze complete conversations, not in-progress ones
const TTL_THRESHOLD_MIN = 0;
const TTL_THRESHOLD_MAX = 6600;

/**
 * GET /api/process-chats
 *
 * Main processing endpoint - scans Redis and processes ready conversations.
 * Returns summary of processed, skipped, and errored conversations.
 */
export async function GET(request: Request) {
  const startTime = Date.now();
  const results: { processed: string[]; skipped: string[]; errors: string[] } = {
    processed: [],
    skipped: [],
    errors: [],
  };

  try {
    // Verify cron secret for security (Vercel automatically adds this header)
    const authHeader = request.headers.get('authorization');
    const expectedKey = process.env.CRON_SECRET;
    if (expectedKey && authHeader !== `Bearer ${expectedKey}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log(`[ProcessChats] Starting chat processing...`);

    // Step 1: Scan Redis for chat keys
    const keys = await redis.scanChatKeys();
    console.log(`[ProcessChats] Found ${keys.length} chat keys`);

    if (keys.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No chats to process',
        results,
        duration: Date.now() - startTime,
      });
    }

    // Step 2: Process each key
    for (const key of keys) {
      try {
        // Check TTL - only process conversations that are ending (TTL < threshold)
        const ttl = await redis.getTTL(key);
        if (ttl < TTL_THRESHOLD_MIN || ttl > TTL_THRESHOLD_MAX) {
          results.skipped.push(`${key} (TTL: ${ttl})`);
          continue;
        }

        // Get the conversation data
        const raw = await redis.get(key);
        const chatData = redis.parseChatData(raw);

        // Note: processedToSheets flag from old n8n workflow is ignored
        // We only check our own database for duplicates

        // Parse key for phone/product/sessionId
        const keyInfo = redis.parseKey(key);
        const phone = chatData.metadata.phone || keyInfo.phone;
        const product = chatData.metadata.product || keyInfo.product;
        const sessionId = chatData.metadata.sessionId || keyInfo.sessionId;
        const businessInfo = (chatData.metadata.businessInfo && chatData.metadata.businessInfo.trim()) || '';
        const username = (chatData.metadata.username && chatData.metadata.username.trim()) || ''; // Username from first webhook message

        // Note: Allowing duplicate session IDs - each processing creates a new lead

        // Limit messages
        let messages = chatData.messages;
        if (messages.length > MAX_MESSAGES) {
          messages = messages.slice(-MAX_MESSAGES);
        }

        if (messages.length === 0) {
          results.skipped.push(`${key} (no messages)`);
          continue;
        }

        // Build conversation text for AI
        const conversationText = redis.buildConversationText(messages);

        // Check for duplicate conversation content
        if (await leadsDb.isConversationDuplicate(conversationText)) {
          results.skipped.push(`${key} (duplicate conversation)`);
          continue;
        }

        // Extract email from conversation if not in metadata
        let email = chatData.metadata.email || '';
        if (!email) {
          const emailMatch = conversationText.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/);
          email = emailMatch ? emailMatch[0] : '';
        }

        console.log(`[ProcessChats] Analyzing conversation: ${sessionId}`);

        // Step 3: Extract timing info directly from message timestamps (IST)
        const timingInfo = redis.extractTimingInfo(messages);

        // Step 4: Analyze with Gemini (falls back to OpenAI if needed)
        const analysis = await analyzeConversation(phone, product, sessionId, conversationText);
        const enriched = enrichAnalysis(analysis);

        // Step 5: Create Lead object
        // Use businessInfo from metadata (MyBusinessIs field) first, then AI fallback
        const companyName = businessInfo || enriched.company_name || '';

        // Use username from metadata first, then AI-extracted name, then fallback
        const prospectName = username || enriched.prospect_name || 'Unknown Lead';

        const lead: Lead = {
          id: uuidv4(),
          prospect_name: prospectName,
          phone: enriched.phone || phone,
          email: enriched.email || email,
          company_name: companyName,
          region: enriched.region || 'Unknown',
          conversation_date: timingInfo.conversationDate,
          start_time_ist: timingInfo.startTimeIst,
          end_time_ist: timingInfo.endTimeIst,
          duration_minutes: timingInfo.durationMinutes,
          duration_seconds: timingInfo.durationSeconds,
          total_messages: timingInfo.totalMessages,
          user_messages: timingInfo.userMessages,
          assistant_messages: timingInfo.assistantMessages,
          messages_per_minute: enriched.messages_per_minute,
          engagement_rate: enriched.engagement_rate,
          session_id: sessionId,
          conversation: conversationText,
          conversation_summary: enriched.conversation_summary,
          conversation_timeline_points: typeof enriched.conversation_timeline_points === 'string'
            ? enriched.conversation_timeline_points.split(' → ').filter(Boolean)
            : [],
          timeline_notes: enriched.timeline_notes,
          info_shared_by_assistant: enriched.info_shared_by_assistant || [],
          links_shared: enriched.links_shared || [],
          open_loops_or_commitments: enriched.open_loops_or_commitments || [],
          detected_phone_numbers: enriched.detected_phone_numbers || [],
          detected_emails: enriched.detected_emails || [],
          primary_topic: enriched.primary_topic,
          secondary_topics: enriched.secondary_topics || [],
          use_case_category: enriched.use_case_category,
          need_summary: enriched.need_summary,
          lead_score: enriched.lead_score,
          intent_level: enriched.intent_level as Lead['intent_level'],
          buyer_stage: enriched.buyer_stage as Lead['buyer_stage'],
          urgency: enriched.urgency as Lead['urgency'],
          is_hot_lead: enriched.is_hot_lead,
          sentiment_overall: enriched.sentiment_overall as Lead['sentiment_overall'],
          emotional_intensity: enriched.emotional_intensity as Lead['emotional_intensity'],
          motivation_type: enriched.motivation_type,
          trust_level: enriched.trust_level as Lead['trust_level'],
          next_action: enriched.next_action,
          recommended_routing: enriched.recommended_routing,
          needs_immediate_followup: enriched.needs_immediate_followup,
          key_questions: enriched.key_questions || [],
          main_objections: enriched.main_objections || [],
          competitors_mentioned: enriched.competitors_mentioned || [],
          budget_bucket_inr: enriched.budget_bucket_inr,
          estimated_scale: enriched.estimated_scale,
          partner_intent: enriched.is_partner,
          is_enterprise: enriched.is_enterprise,
          is_partner: enriched.is_partner,
          completeness: parseInt(enriched.validation.completeness),
          isValid: enriched.validation.isValid,
          missingFields: enriched.validation.missingFields,
          has_phone: enriched.has_phone,
          has_email: enriched.has_email,
          has_company: enriched.has_company,
          source: 'redis',
          channel: 'WhatsApp',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          status: 'new',
        };

        // Step 6: Save to database
        await leadsDb.insert(lead);

        // Step 7: Mark as processed in Redis only (not tracking in DB to allow duplicates)
        await redis.markAsProcessed(key, chatData);

        // Step 8: Auto-sync to integrations if liveSync is enabled
        // Google Sheets
        try {
          const { syncLeadToGoogleSheets, isGoogleSheetsLiveSyncEnabled } = await import('@/lib/google-sheets-sync');
          if (isGoogleSheetsLiveSyncEnabled()) {
            const syncResult = await syncLeadToGoogleSheets(lead);
            if (syncResult.success) {
              console.log(`[ProcessChats] Auto-synced to Google Sheets: ${sessionId}`);
            } else {
              console.log(`[ProcessChats] Google Sheets sync failed: ${syncResult.error}`);
            }
          }
        } catch (syncError) {
          console.error(`[ProcessChats] Google Sheets sync error:`, syncError);
        }

        // HubSpot
        try {
          const { syncLeadToHubSpot, isHubSpotLiveSyncEnabled } = await import('@/lib/hubspot-sync');
          if (isHubSpotLiveSyncEnabled()) {
            const syncResult = await syncLeadToHubSpot(lead);
            if (syncResult.success) {
              console.log(`[ProcessChats] Auto-synced to HubSpot: ${sessionId}`);
            } else {
              console.log(`[ProcessChats] HubSpot sync failed: ${syncResult.error}`);
            }
          }
        } catch (syncError) {
          console.error(`[ProcessChats] HubSpot sync error:`, syncError);
        }

        // Zoho CRM
        try {
          const { syncLeadToZoho, isZohoLiveSyncEnabled } = await import('@/lib/zoho-sync');
          if (isZohoLiveSyncEnabled()) {
            const syncResult = await syncLeadToZoho(lead);
            if (syncResult.success) {
              console.log(`[ProcessChats] Auto-synced to Zoho CRM: ${sessionId}`);
            } else {
              console.log(`[ProcessChats] Zoho CRM sync failed: ${syncResult.error}`);
            }
          }
        } catch (syncError) {
          console.error(`[ProcessChats] Zoho CRM sync error:`, syncError);
        }

        // Step 9: Trigger webhooks for active webhooks
        await triggerWebhooks(lead, 'newLead');
        if (lead.is_hot_lead) {
          await triggerWebhooks(lead, 'hotLead');
        }
        if (lead.needs_immediate_followup) {
          await triggerWebhooks(lead, 'urgentFollowup');
        }
        if (lead.is_enterprise) {
          await triggerWebhooks(lead, 'enterpriseLead');
        }
        if (lead.lead_score >= 80) {
          await triggerWebhooks(lead, 'highScoreLead');
        }

        results.processed.push(sessionId);
        console.log(`[ProcessChats] Successfully processed: ${sessionId}`);

      } catch (error) {
        console.error(`[ProcessChats] Error processing ${key}:`, error);
        results.errors.push(`${key}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${results.processed.length} chats`,
      results,
      duration: Date.now() - startTime,
    });

  } catch (error) {
    console.error('[ProcessChats] Fatal error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      results,
      duration: Date.now() - startTime,
    }, { status: 500 });
  }
}

// Also support POST for webhook triggers
export async function POST(request: Request) {
  return GET(request);
}
