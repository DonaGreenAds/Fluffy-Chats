// Server-side cron scheduler for processing chats every 1 minute
import fs from 'fs';
import path from 'path';

const INTERVAL_MS = 1 * 60 * 1000; // 1 minute
let isRunning = false;
let intervalId: NodeJS.Timeout | null = null;

// Webhook trigger function
async function triggerWebhook(lead: any, eventType: string) {
  try {
    // Read webhook config from server-side file
    const configPath = path.join(process.cwd(), 'data', 'webhook-config.json');
    let webhookConfig: { url: string; headers: string; events: Record<string, boolean> } | null = null;

    if (fs.existsSync(configPath)) {
      const data = fs.readFileSync(configPath, 'utf-8');
      webhookConfig = JSON.parse(data);
      console.log(`[Webhook] Config loaded: URL=${webhookConfig?.url?.substring(0, 50)}...`);
    } else {
      console.log('[Webhook] No webhook config file found at:', configPath);
      return;
    }

    if (!webhookConfig?.url) {
      console.log('[Webhook] No webhook URL configured');
      return;
    }

    // Check if this event type is enabled
    if (!webhookConfig.events || !webhookConfig.events[eventType]) {
      console.log(`[Webhook] Event type '${eventType}' not enabled`);
      return;
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Parse custom headers
    try {
      if (webhookConfig.headers) {
        const customHeaders = JSON.parse(webhookConfig.headers);
        Object.assign(headers, customHeaders);
      }
    } catch {
      // Invalid JSON headers, skip
    }

    // Build query parameters for GET request
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

    const webhookUrlWithParams = `${webhookConfig.url}${webhookConfig.url.includes('?') ? '&' : '?'}${params.toString()}`;

    console.log(`[Webhook] Sending GET ${eventType} to ${webhookConfig.url}`);

    const response = await fetch(webhookUrlWithParams, {
      method: 'GET',
      headers,
    });

    console.log(`[Webhook] Triggered ${eventType} for ${lead.prospect_name} - Status: ${response.status}`);
  } catch (error) {
    console.error('[Webhook] Error triggering webhook:', error);
  }
}

async function processChats() {
  if (isRunning) {
    console.log('[Cron] Previous job still running, skipping...');
    return;
  }

  isRunning = true;
  const startTime = Date.now();

  try {
    console.log('[Cron] Starting scheduled chat processing...');

    // Dynamic import to avoid circular dependencies
    const { redis } = await import('@/lib/redis');
    const { analyzeConversation, enrichAnalysis } = await import('@/lib/gemini');
    const { leadsDb } = await import('@/lib/database');
    const { v4: uuidv4 } = await import('uuid');

    const MAX_MESSAGES = 50;
    const TTL_THRESHOLD_MIN = 0;
    const TTL_THRESHOLD_MAX = 6600; // Process chats with 10 minutes of inactivity (2hr=7200s, 7200-600=6600)

    const results = { processed: 0, skipped: 0, errors: 0 };

    // Scan Redis for chat keys
    const keys = await redis.scanChatKeys();
    console.log(`[Cron] Found ${keys.length} chat keys`);

    for (const key of keys) {
      try {
        // Check TTL
        const ttl = await redis.getTTL(key);
        if (ttl < TTL_THRESHOLD_MIN || ttl > TTL_THRESHOLD_MAX) {
          results.skipped++;
          continue;
        }

        // Get conversation data
        const raw = await redis.get(key);
        const chatData = redis.parseChatData(raw);

        // Note: processedToSheets flag from old n8n workflow is ignored
        // We only check our own database for duplicates

        // Parse key info
        const keyInfo = redis.parseKey(key);
        const phone = chatData.metadata.phone || keyInfo.phone;
        const product = chatData.metadata.product || keyInfo.product;
        const sessionId = chatData.metadata.sessionId || keyInfo.sessionId;
        const businessInfo = (chatData.metadata.businessInfo && chatData.metadata.businessInfo.trim()) || '';
        const username = (chatData.metadata.username && chatData.metadata.username.trim()) || '';

        // Note: Allowing duplicate session IDs - each processing creates a new lead

        // Process messages
        let messages = chatData.messages;
        if (messages.length > MAX_MESSAGES) {
          messages = messages.slice(-MAX_MESSAGES);
        }

        if (messages.length === 0) {
          results.skipped++;
          continue;
        }

        const conversationText = redis.buildConversationText(messages);

        // Check for duplicate conversation content
        if (await leadsDb.isConversationDuplicate(conversationText)) {
          results.skipped++;
          continue;
        }

        // Extract email
        let email = chatData.metadata.email || '';
        if (!email) {
          const emailMatch = conversationText.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/);
          email = emailMatch ? emailMatch[0] : '';
        }

        console.log(`[Cron] Analyzing: ${sessionId}`);

        // Extract timing and analyze
        const timingInfo = redis.extractTimingInfo(messages);
        const analysis = await analyzeConversation(phone, product, sessionId, conversationText);
        const enriched = enrichAnalysis(analysis);

        // Use businessInfo from metadata (MyBusinessIs field) first, then AI fallback
        const companyName = businessInfo || enriched.company_name || '';

        // Create and save lead - prioritize username from webhook, then AI extraction
        const prospectName = username || enriched.prospect_name || 'Unknown Lead';

        const lead = {
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
          intent_level: enriched.intent_level,
          buyer_stage: enriched.buyer_stage,
          urgency: enriched.urgency,
          is_hot_lead: enriched.is_hot_lead,
          sentiment_overall: enriched.sentiment_overall,
          emotional_intensity: enriched.emotional_intensity,
          motivation_type: enriched.motivation_type,
          trust_level: enriched.trust_level,
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

        await leadsDb.insert(lead as any);
        // Mark as processed in Redis only (not tracking in DB to allow duplicates)
        await redis.markAsProcessed(key, chatData);

        // Trigger webhooks
        await triggerWebhook(lead, 'newLead');
        if (lead.is_hot_lead) {
          await triggerWebhook(lead, 'hotLead');
        }
        if (lead.needs_immediate_followup) {
          await triggerWebhook(lead, 'urgentFollowup');
        }
        if (lead.is_enterprise) {
          await triggerWebhook(lead, 'enterpriseLead');
        }
        if (lead.lead_score >= 80) {
          await triggerWebhook(lead, 'highScoreLead');
        }

        // Auto-sync to Google Sheets if live sync is enabled
        try {
          const { syncLeadToGoogleSheets, isGoogleSheetsLiveSyncEnabled } = await import('@/lib/google-sheets-sync');
          if (isGoogleSheetsLiveSyncEnabled()) {
            const syncResult = await syncLeadToGoogleSheets(lead as any);
            if (syncResult.success) {
              console.log(`[Cron] Auto-synced to Google Sheets: ${sessionId}`);
            } else {
              console.log(`[Cron] Google Sheets sync skipped: ${syncResult.error}`);
            }
          }
        } catch (syncError) {
          console.error(`[Cron] Google Sheets sync error:`, syncError);
        }

        // Auto-sync to HubSpot if live sync is enabled
        try {
          const { syncLeadToHubSpot, isHubSpotLiveSyncEnabled } = await import('@/lib/hubspot-sync');
          if (isHubSpotLiveSyncEnabled()) {
            const syncResult = await syncLeadToHubSpot(lead as any);
            if (syncResult.success) {
              console.log(`[Cron] Auto-synced to HubSpot: ${sessionId}`);
            } else {
              console.log(`[Cron] HubSpot sync skipped: ${syncResult.error}`);
            }
          }
        } catch (syncError) {
          console.error(`[Cron] HubSpot sync error:`, syncError);
        }

        // Auto-sync to Zoho CRM if live sync is enabled
        try {
          const { syncLeadToZoho, isZohoLiveSyncEnabled } = await import('@/lib/zoho-sync');
          if (isZohoLiveSyncEnabled()) {
            const syncResult = await syncLeadToZoho(lead as any);
            if (syncResult.success) {
              console.log(`[Cron] Auto-synced to Zoho CRM: ${sessionId}`);
            } else {
              console.log(`[Cron] Zoho CRM sync skipped: ${syncResult.error}`);
            }
          }
        } catch (syncError) {
          console.error(`[Cron] Zoho CRM sync error:`, syncError);
        }

        results.processed++;
        console.log(`[Cron] Processed: ${sessionId}`);

      } catch (error) {
        console.error(`[Cron] Error processing ${key}:`, error);
        results.errors++;
      }
    }

    const duration = Date.now() - startTime;
    console.log(`[Cron] Completed: ${results.processed} processed, ${results.skipped} skipped, ${results.errors} errors (${duration}ms)`);

  } catch (error) {
    console.error('[Cron] Fatal error:', error);
  } finally {
    isRunning = false;
  }
}

export function startCronJob() {
  if (intervalId) {
    console.log('[Cron] Already running');
    return;
  }

  console.log('[Cron] Starting scheduler (every 1 minute)');

  // Run immediately on start
  processChats();

  // Then run every 5 minutes
  intervalId = setInterval(processChats, INTERVAL_MS);
}

export function stopCronJob() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log('[Cron] Stopped scheduler');
  }
}
