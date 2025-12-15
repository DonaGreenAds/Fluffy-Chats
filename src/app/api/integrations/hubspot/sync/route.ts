import { NextResponse } from 'next/server';
import { Lead } from '@/types/lead';
import { updateIntegrationToken, getHubSpotTokens } from '@/lib/integration-tokens';
import { isValidEmail, isTokenExpiredError } from '@/lib/integration-utils';

interface SyncRequest {
  accessToken?: string;
  refreshToken?: string;
  leads: Lead[];
}

// Refresh access token and save to server storage
async function refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string } | null> {
  try {
    console.log('[HubSpot] Attempting to refresh access token...');
    const response = await fetch('https://api.hubapi.com/oauth/v1/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: process.env.NEXT_PUBLIC_HUBSPOT_CLIENT_ID || '',
        client_secret: process.env.HUBSPOT_CLIENT_SECRET || '',
        refresh_token: refreshToken,
      }),
    });

    const data = await response.json();
    console.log('[HubSpot] Token refresh response:', response.status, data.access_token ? 'got new token' : 'no token');

    if (data.access_token) {
      // Save the new tokens to server storage
      const newRefreshToken = data.refresh_token || refreshToken;
      updateIntegrationToken('hubspot', {
        accessToken: data.access_token,
        refreshToken: newRefreshToken,
      });
      console.log('[HubSpot] Saved new tokens to server storage');
      return { accessToken: data.access_token, refreshToken: newRefreshToken };
    }

    console.error('[HubSpot] Token refresh failed:', data);
    return null;
  } catch (error) {
    console.error('[HubSpot] Failed to refresh token:', error);
    return null;
  }
}


// Map lead to HubSpot contact properties (only standard HubSpot properties)
function mapLeadToHubSpotContact(lead: Lead) {
  // Build properties object, only including non-empty values
  const properties: Record<string, string> = {};

  // Standard HubSpot contact properties
  if (lead.prospect_name) {
    const nameParts = lead.prospect_name.split(' ');
    properties.firstname = nameParts[0] || '';
    properties.lastname = nameParts.slice(1).join(' ') || '';
  }

  // Only add email if it's valid format
  if (isValidEmail(lead.email)) {
    properties.email = lead.email;
  }

  if (lead.phone) properties.phone = lead.phone;
  if (lead.company_name) properties.company = lead.company_name;
  if (lead.region) properties.city = lead.region;

  // Use message field for conversation summary (standard property)
  if (lead.conversation_summary) {
    properties.message = lead.conversation_summary.substring(0, 65535);
  }

  // Lead status - valid values: NEW, OPEN, IN_PROGRESS, OPEN_DEAL, UNQUALIFIED, ATTEMPTED_TO_CONTACT, CONNECTED, BAD_TIMING
  properties.hs_lead_status = lead.is_hot_lead ? 'OPEN_DEAL' : 'NEW';

  // Lifecycle stage
  properties.lifecyclestage = lead.buyer_stage === 'decision' ? 'opportunity' :
                              lead.buyer_stage === 'consideration' ? 'marketingqualifiedlead' : 'lead';

  // Store lead.id in website field for deduplication (UUID is clean and unique)
  if (lead.id) {
    properties.website = `https://fluffychats.app/lead/${lead.id}`;
  }

  return { properties };
}

// Generate detailed note content with all lead information
function generateLeadNoteContent(lead: Lead): string {
  const sections: string[] = [];

  // Header
  sections.push(`📋 FLUFFYCHATS LEAD DETAILS`);
  sections.push(`Generated: ${new Date().toISOString()}`);
  sections.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

  // Contact Information
  sections.push(`\n👤 CONTACT INFORMATION`);
  sections.push(`Name: ${lead.prospect_name || 'Unknown'}`);
  sections.push(`Phone: ${lead.phone || 'N/A'}`);
  sections.push(`Email: ${lead.email || 'N/A'}`);
  sections.push(`Company: ${lead.company_name || 'N/A'}`);
  sections.push(`Region: ${lead.region || 'N/A'}`);

  // Conversation Metadata
  sections.push(`\n📅 CONVERSATION DETAILS`);
  sections.push(`Date: ${lead.conversation_date || 'N/A'}`);
  sections.push(`Start Time: ${lead.start_time_ist || 'N/A'}`);
  sections.push(`End Time: ${lead.end_time_ist || 'N/A'}`);
  sections.push(`Duration: ${lead.duration_minutes || 0} minutes`);
  sections.push(`Total Messages: ${lead.total_messages || 0}`);
  sections.push(`User Messages: ${lead.user_messages || 0}`);
  sections.push(`Assistant Messages: ${lead.assistant_messages || 0}`);
  if (lead.session_id) sections.push(`Session ID: ${lead.session_id}`);

  // Lead Intelligence
  sections.push(`\n🎯 LEAD INTELLIGENCE`);
  sections.push(`Primary Topic: ${lead.primary_topic || 'N/A'}`);
  if (lead.secondary_topics?.length) sections.push(`Secondary Topics: ${lead.secondary_topics.join(', ')}`);
  sections.push(`Use Case: ${lead.use_case_category || 'N/A'}`);
  sections.push(`Need Summary: ${lead.need_summary || 'N/A'}`);

  // Sales Scoring
  sections.push(`\n📊 SALES SCORING`);
  sections.push(`Lead Score: ${lead.lead_score || 0}/100`);
  sections.push(`Intent Level: ${lead.intent_level || 'N/A'}`);
  sections.push(`Buyer Stage: ${lead.buyer_stage || 'N/A'}`);
  sections.push(`Urgency: ${lead.urgency || 'N/A'}`);
  sections.push(`Hot Lead: ${lead.is_hot_lead ? '🔥 YES' : 'No'}`);

  // Psychological Analysis
  sections.push(`\n🧠 PSYCHOLOGICAL ANALYSIS`);
  sections.push(`Sentiment: ${lead.sentiment_overall || 'N/A'}`);
  sections.push(`Emotional Intensity: ${lead.emotional_intensity || 'N/A'}`);
  sections.push(`Motivation Type: ${lead.motivation_type || 'N/A'}`);
  sections.push(`Trust Level: ${lead.trust_level || 'N/A'}`);

  // Sales Actions
  sections.push(`\n✅ RECOMMENDED ACTIONS`);
  sections.push(`Next Action: ${lead.next_action || 'N/A'}`);
  sections.push(`Recommended Routing: ${lead.recommended_routing || 'N/A'}`);
  sections.push(`Needs Immediate Followup: ${lead.needs_immediate_followup ? '⚡ YES' : 'No'}`);

  // Questions & Objections
  if (lead.key_questions?.length) {
    sections.push(`\n❓ KEY QUESTIONS`);
    lead.key_questions.forEach((q, i) => sections.push(`${i + 1}. ${q}`));
  }
  if (lead.main_objections?.length) {
    sections.push(`\n⚠️ MAIN OBJECTIONS`);
    lead.main_objections.forEach((o, i) => sections.push(`${i + 1}. ${o}`));
  }
  if (lead.competitors_mentioned?.length) {
    sections.push(`\n🏢 COMPETITORS MENTIONED`);
    sections.push(lead.competitors_mentioned.join(', '));
  }

  // Business Details
  sections.push(`\n💼 BUSINESS DETAILS`);
  sections.push(`Budget Range: ${lead.budget_bucket_inr || 'N/A'}`);
  sections.push(`Estimated Scale: ${lead.estimated_scale || 'N/A'}`);
  sections.push(`Enterprise: ${lead.is_enterprise ? 'Yes' : 'No'}`);
  sections.push(`Partner Intent: ${lead.partner_intent ? 'Yes' : 'No'}`);

  // Conversation Summary
  sections.push(`\n📝 CONVERSATION SUMMARY`);
  sections.push(lead.conversation_summary || 'No summary available');

  // Timeline Points
  if (lead.conversation_timeline_points?.length) {
    sections.push(`\n📌 CONVERSATION TIMELINE`);
    lead.conversation_timeline_points.forEach((point, i) => sections.push(`${i + 1}. ${point}`));
  }

  // Open Loops
  if (lead.open_loops_or_commitments?.length) {
    sections.push(`\n🔄 OPEN LOOPS / COMMITMENTS`);
    lead.open_loops_or_commitments.forEach((item, i) => sections.push(`${i + 1}. ${item}`));
  }

  // Source Info
  sections.push(`\n📡 SOURCE INFORMATION`);
  sections.push(`Source: ${lead.source || 'WhatsApp'}`);
  sections.push(`Channel: ${lead.channel || 'WhatsApp'}`);
  sections.push(`Created: ${lead.created_at || 'N/A'}`);

  return sections.join('\n');
}

// Create a note in HubSpot and associate it with a contact
async function createContactNote(
  accessToken: string,
  contactId: string,
  lead: Lead
): Promise<{ success: boolean; error?: string }> {
  try {
    const noteContent = generateLeadNoteContent(lead);

    // Create note engagement
    const noteResponse = await fetch(
      'https://api.hubapi.com/crm/v3/objects/notes',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          properties: {
            hs_timestamp: new Date().toISOString(),
            hs_note_body: noteContent,
          },
          associations: [
            {
              to: { id: contactId },
              types: [
                {
                  associationCategory: 'HUBSPOT_DEFINED',
                  associationTypeId: 202, // Note to Contact association
                },
              ],
            },
          ],
        }),
      }
    );

    if (!noteResponse.ok) {
      const errorResult = await noteResponse.json();
      console.error('[HubSpot] Note creation error:', errorResult);
      return { success: false, error: errorResult.message || 'Failed to create note' };
    }

    console.log('[HubSpot] Note created successfully for contact:', contactId);
    return { success: true };
  } catch (error) {
    console.error('[HubSpot] Note creation error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Create or update contact in HubSpot
async function syncContact(
  accessToken: string,
  lead: Lead
): Promise<{ success: boolean; contactId?: string; error?: string; skipped?: boolean }> {
  const contact = mapLeadToHubSpotContact(lead);

  console.log('[HubSpot] Syncing lead:', lead.prospect_name || lead.session_id || lead.phone);
  console.log('[HubSpot] Contact properties:', JSON.stringify(contact.properties));

  try {
    let contactId: string | undefined;

    // First, search by lead.id (via website field) - most reliable for deduplication
    if (lead.id) {
      const leadUrl = `https://fluffychats.app/lead/${lead.id}`;
      console.log('[HubSpot] Searching for existing contact by lead.id:', lead.id);
      const searchResponse = await fetch(
        'https://api.hubapi.com/crm/v3/objects/contacts/search',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            filterGroups: [
              {
                filters: [
                  {
                    propertyName: 'website',
                    operator: 'EQ',
                    value: leadUrl,
                  },
                ],
              },
            ],
          }),
        }
      );

      const searchResult = await searchResponse.json();
      if (searchResult.results?.length > 0) {
        console.log('[HubSpot] Lead already exists (lead.id match), skipping');
        return { success: true, contactId: searchResult.results[0].id, skipped: true };
      }
    }

    // Fallback: search by email (only if valid email)
    if (!contactId && isValidEmail(lead.email)) {
      console.log('[HubSpot] Searching for existing contact by email:', lead.email);
      const searchResponse = await fetch(
        'https://api.hubapi.com/crm/v3/objects/contacts/search',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            filterGroups: [
              {
                filters: [
                  {
                    propertyName: 'email',
                    operator: 'EQ',
                    value: lead.email,
                  },
                ],
              },
            ],
          }),
        }
      );

      const searchResult = await searchResponse.json();
      console.log('[HubSpot] Search result:', JSON.stringify(searchResult));

      if (searchResult.results?.length > 0) {
        // Update existing contact
        const existingId = searchResult.results[0].id;
        console.log('[HubSpot] Updating existing contact:', existingId);

        const updateResponse = await fetch(
          `https://api.hubapi.com/crm/v3/objects/contacts/${existingId}`,
          {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(contact),
          }
        );

        const updateResult = await updateResponse.json();
        console.log('[HubSpot] Update response:', updateResponse.status, JSON.stringify(updateResult));

        if (updateResponse.ok) {
          contactId = existingId;
        } else {
          return { success: false, error: updateResult.message || JSON.stringify(updateResult) };
        }
      }
    }

    // Create new contact if not found
    if (!contactId) {
      console.log('[HubSpot] Creating new contact');
      const createResponse = await fetch(
        'https://api.hubapi.com/crm/v3/objects/contacts',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(contact),
        }
      );

      const createResult = await createResponse.json();
      console.log('[HubSpot] Create response:', createResponse.status, JSON.stringify(createResult));

      if (createResponse.ok) {
        contactId = createResult.id;
      } else {
        return { success: false, error: createResult.message || JSON.stringify(createResult) };
      }
    }

    // Create a detailed note with all lead information
    if (contactId) {
      const noteResult = await createContactNote(accessToken, contactId, lead);
      if (!noteResult.success) {
        console.warn('[HubSpot] Note creation failed but contact was created:', noteResult.error);
        // Don't fail the sync if note creation fails - contact is already created
      }
      return { success: true, contactId };
    }

    return { success: false, error: 'Failed to create or update contact' };
  } catch (error) {
    console.error('[HubSpot] Sync error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function POST(request: Request) {
  try {
    const body: SyncRequest = await request.json();
    let { accessToken, refreshToken, leads } = body;

    console.log('[HubSpot] Sync request received');
    console.log('[HubSpot] Access token provided:', !!accessToken);
    console.log('[HubSpot] Refresh token provided:', !!refreshToken);
    console.log('[HubSpot] Leads count:', leads?.length || 0);

    // If no tokens provided in request, try to get from server storage
    if (!accessToken || !refreshToken) {
      const serverTokens = getHubSpotTokens();
      if (serverTokens) {
        accessToken = accessToken || serverTokens.accessToken;
        refreshToken = refreshToken || serverTokens.refreshToken;
        console.log('[HubSpot] Using tokens from server storage');
      }
    }

    let currentToken = accessToken;
    let currentRefreshToken = refreshToken;

    if (!currentToken) {
      console.error('[HubSpot] No access token provided');
      return NextResponse.json(
        { success: false, error: 'Missing access token. Please reconnect HubSpot.' },
        { status: 400 }
      );
    }

    if (!leads || leads.length === 0) {
      return NextResponse.json(
        { success: true, message: 'No leads to sync', count: 0 }
      );
    }

    let successCount = 0;
    let skippedCount = 0;
    let failedCount = 0;
    const errors: string[] = [];
    let tokenWasRefreshed = false;

    // Try first lead to check if token is valid
    let firstResult = await syncContact(currentToken, leads[0]);

    // If first one fails with auth/expiry error, try refreshing token
    if (!firstResult.success && isTokenExpiredError(firstResult.error)) {
      console.log('[HubSpot] Token appears expired, attempting refresh...');
      console.log('[HubSpot] Error was:', firstResult.error);

      if (currentRefreshToken) {
        const newTokens = await refreshAccessToken(currentRefreshToken);
        if (newTokens) {
          console.log('[HubSpot] Token refreshed successfully, retrying first lead...');
          currentToken = newTokens.accessToken;
          currentRefreshToken = newTokens.refreshToken;
          tokenWasRefreshed = true;

          // Retry the first lead with new token
          firstResult = await syncContact(currentToken, leads[0]);
          if (firstResult.success) {
            if (firstResult.skipped) {
              skippedCount++;
            } else {
              successCount++;
            }
          } else {
            failedCount++;
            if (firstResult.error) errors.push(firstResult.error);
          }
        } else {
          console.error('[HubSpot] Failed to refresh token');
          return NextResponse.json(
            { success: false, error: 'Access token expired and refresh failed. Please reconnect HubSpot.' },
            { status: 401 }
          );
        }
      } else {
        console.error('[HubSpot] No refresh token available');
        return NextResponse.json(
          { success: false, error: 'Access token expired. Please reconnect HubSpot.' },
          { status: 401 }
        );
      }
    } else if (firstResult.success) {
      if (firstResult.skipped) {
        skippedCount++;
      } else {
        successCount++;
      }
    } else {
      failedCount++;
      if (firstResult.error) errors.push(firstResult.error);
    }

    // Process remaining leads (skip first since already processed)
    for (let i = 1; i < leads.length; i++) {
      const result = await syncContact(currentToken, leads[i]);
      if (result.success) {
        if (result.skipped) {
          skippedCount++;
        } else {
          successCount++;
        }
      } else {
        failedCount++;
        if (result.error && errors.length < 5) {
          errors.push(result.error);
        }
      }
    }

    console.log(`[HubSpot] Sync complete: ${successCount} new, ${skippedCount} skipped, ${failedCount} failed`);

    // Update lastSync and leadsExported in server storage
    const currentTokens = getHubSpotTokens();
    updateIntegrationToken('hubspot', {
      lastSync: new Date().toISOString(),
      leadsExported: (currentTokens?.leadsExported || 0) + successCount,
    });

    const message = successCount === 0 && skippedCount > 0
      ? `All ${skippedCount} contacts already synced (0 new)`
      : `Synced ${successCount} new contacts to HubSpot${skippedCount > 0 ? ` (${skippedCount} already synced)` : ''}`;

    return NextResponse.json({
      success: successCount > 0 || skippedCount > 0 || failedCount === 0,
      message,
      count: successCount,
      skipped: skippedCount,
      failed: failedCount,
      errors: errors.length > 0 ? errors : undefined,
      newAccessToken: tokenWasRefreshed ? currentToken : undefined,
    });
  } catch (error) {
    console.error('[HubSpot] Sync error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
