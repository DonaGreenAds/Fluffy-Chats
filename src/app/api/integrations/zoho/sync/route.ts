import { NextResponse } from 'next/server';
import { Lead } from '@/types/lead';
import { updateIntegrationToken, getZohoTokens } from '@/lib/integration-tokens';
import { isValidEmail, isValidPhone, isTokenExpiredError } from '@/lib/integration-utils';

interface SyncRequest {
  accessToken: string;
  refreshToken?: string;
  apiDomain?: string;
  location?: string;
  leads: Lead[];
}

// Refresh access token and save to server storage
async function refreshAccessToken(
  refreshToken: string,
  location: string = 'us'
): Promise<{ accessToken: string | null; apiDomain?: string; refreshToken?: string }> {
  const accountsUrl = location === 'us'
    ? 'https://accounts.zoho.com'
    : `https://accounts.zoho.${location}`;

  try {
    console.log('[Zoho] Attempting to refresh access token...');
    const response = await fetch(`${accountsUrl}/oauth/v2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: process.env.NEXT_PUBLIC_ZOHO_CLIENT_ID || '',
        client_secret: process.env.ZOHO_CLIENT_SECRET || '',
        refresh_token: refreshToken,
      }),
    });

    const data = await response.json();
    console.log('[Zoho] Token refresh response:', response.status, data.access_token ? 'got new token' : 'no token');

    if (data.access_token) {
      // Save the new tokens to server storage
      updateIntegrationToken('zoho-crm', {
        accessToken: data.access_token,
        refreshToken: refreshToken, // Zoho refresh tokens don't rotate
        apiDomain: data.api_domain,
        location,
      });
      console.log('[Zoho] Saved new tokens to server storage');
      return {
        accessToken: data.access_token,
        apiDomain: data.api_domain,
        refreshToken,
      };
    }

    console.error('[Zoho] Token refresh failed:', data);
    return { accessToken: null };
  } catch (error) {
    console.error('[Zoho] Failed to refresh token:', error);
    return { accessToken: null };
  }
}


// Zoho lead record type
interface ZohoLeadRecord {
  id?: string;
  First_Name: string;
  Last_Name: string;
  Email?: string;
  Phone?: string;
  Company: string;
  City: string;
  Lead_Source: string;
  Lead_Status: string;
  Description: string;
  Website?: string;
  [key: string]: string | undefined;
}

// Generate full description with all lead details (since Notes require extra OAuth scope)
function generateFullDescription(lead: Lead): string {
  const parts: string[] = [];

  // Conversation Summary first
  if (lead.conversation_summary) {
    parts.push(lead.conversation_summary);
    parts.push('\n---\n');
  }

  // Key Sales Info
  parts.push(`LEAD INTELLIGENCE:`);
  parts.push(`• Lead Score: ${lead.lead_score || 0}/100`);
  parts.push(`• Intent: ${lead.intent_level || 'N/A'} | Buyer Stage: ${lead.buyer_stage || 'N/A'}`);
  parts.push(`• Urgency: ${lead.urgency || 'N/A'} | Hot Lead: ${lead.is_hot_lead ? 'YES' : 'No'}`);
  parts.push(`• Primary Topic: ${lead.primary_topic || 'N/A'}`);

  // Business Details
  parts.push(`\nBUSINESS DETAILS:`);
  parts.push(`• Budget: ${lead.budget_bucket_inr || 'N/A'}`);
  parts.push(`• Scale: ${lead.estimated_scale || 'N/A'}`);
  parts.push(`• Enterprise: ${lead.is_enterprise ? 'Yes' : 'No'} | Partner: ${lead.partner_intent ? 'Yes' : 'No'}`);

  // Recommended Actions
  parts.push(`\nRECOMMENDED ACTIONS:`);
  parts.push(`• Next Action: ${lead.next_action || 'N/A'}`);
  parts.push(`• Routing: ${lead.recommended_routing || 'N/A'}`);
  parts.push(`• Immediate Followup: ${lead.needs_immediate_followup ? 'YES' : 'No'}`);

  // Conversation Details
  parts.push(`\nCONVERSATION:`);
  parts.push(`• Date: ${lead.conversation_date || 'N/A'}`);
  parts.push(`• Duration: ${lead.duration_minutes || 0} min | Messages: ${lead.total_messages || 0}`);
  parts.push(`• Sentiment: ${lead.sentiment_overall || 'N/A'} | Trust: ${lead.trust_level || 'N/A'}`);

  // Questions & Objections
  if (lead.key_questions?.length) {
    parts.push(`\nKEY QUESTIONS: ${lead.key_questions.join('; ')}`);
  }
  if (lead.main_objections?.length) {
    parts.push(`OBJECTIONS: ${lead.main_objections.join('; ')}`);
  }
  if (lead.competitors_mentioned?.length) {
    parts.push(`COMPETITORS: ${lead.competitors_mentioned.join(', ')}`);
  }

  // Source
  parts.push(`\nSource: ${lead.source || 'WhatsApp'} | Channel: ${lead.channel || 'WhatsApp'}`);
  parts.push(`Session: ${lead.session_id || 'N/A'}`);

  return parts.join('\n');
}

// Map lead to Zoho CRM lead record
function mapLeadToZohoLead(lead: Lead): { data: ZohoLeadRecord[]; trigger: string[]; skip?: boolean; skipReason?: string } {
  // Split name into first and last
  const nameParts = (lead.prospect_name || 'Unknown').split(' ');
  const firstName = nameParts[0] || 'Unknown';
  const lastName = nameParts.slice(1).join(' ') || 'Lead';

  const record: ZohoLeadRecord = {
    First_Name: firstName,
    Last_Name: lastName,
    Company: lead.company_name || 'Unknown',
    City: lead.region && lead.region !== 'unknown' ? lead.region : '',
    Lead_Source: 'WhatsApp - FluffyChats',
    Lead_Status: lead.is_hot_lead ? 'Hot' : 'Not Contacted',
    Description: generateFullDescription(lead),
  };

  // Only add phone if valid (not a placeholder like ${waba_mobile})
  if (isValidPhone(lead.phone)) {
    record.Phone = lead.phone;
  }

  // Only add email if valid
  if (isValidEmail(lead.email)) {
    record.Email = lead.email;
  }

  // Store lead.id in Website field for deduplication (UUID is clean and unique)
  if (lead.id) {
    record.Website = `https://fluffychats.app/lead/${lead.id}`;
  }

  return {
    data: [record],
    trigger: ['workflow'], // Trigger Zoho workflows on create
  };
}

// Generate detailed note content with all lead information
function generateLeadNoteContent(lead: Lead): string {
  const sections: string[] = [];

  // Header
  sections.push(`FLUFFYCHATS LEAD DETAILS`);
  sections.push(`Generated: ${new Date().toISOString()}`);
  sections.push(`========================================`);

  // Contact Information
  sections.push(`\nCONTACT INFORMATION`);
  sections.push(`Name: ${lead.prospect_name || 'Unknown'}`);
  sections.push(`Phone: ${lead.phone || 'N/A'}`);
  sections.push(`Email: ${lead.email || 'N/A'}`);
  sections.push(`Company: ${lead.company_name || 'N/A'}`);
  sections.push(`Region: ${lead.region || 'N/A'}`);

  // Conversation Metadata
  sections.push(`\nCONVERSATION DETAILS`);
  sections.push(`Date: ${lead.conversation_date || 'N/A'}`);
  sections.push(`Start Time: ${lead.start_time_ist || 'N/A'}`);
  sections.push(`End Time: ${lead.end_time_ist || 'N/A'}`);
  sections.push(`Duration: ${lead.duration_minutes || 0} minutes`);
  sections.push(`Total Messages: ${lead.total_messages || 0}`);
  sections.push(`User Messages: ${lead.user_messages || 0}`);
  sections.push(`Assistant Messages: ${lead.assistant_messages || 0}`);
  if (lead.session_id) sections.push(`Session ID: ${lead.session_id}`);

  // Lead Intelligence
  sections.push(`\nLEAD INTELLIGENCE`);
  sections.push(`Primary Topic: ${lead.primary_topic || 'N/A'}`);
  if (lead.secondary_topics?.length) sections.push(`Secondary Topics: ${lead.secondary_topics.join(', ')}`);
  sections.push(`Use Case: ${lead.use_case_category || 'N/A'}`);
  sections.push(`Need Summary: ${lead.need_summary || 'N/A'}`);

  // Sales Scoring
  sections.push(`\nSALES SCORING`);
  sections.push(`Lead Score: ${lead.lead_score || 0}/100`);
  sections.push(`Intent Level: ${lead.intent_level || 'N/A'}`);
  sections.push(`Buyer Stage: ${lead.buyer_stage || 'N/A'}`);
  sections.push(`Urgency: ${lead.urgency || 'N/A'}`);
  sections.push(`Hot Lead: ${lead.is_hot_lead ? 'YES' : 'No'}`);

  // Psychological Analysis
  sections.push(`\nPSYCHOLOGICAL ANALYSIS`);
  sections.push(`Sentiment: ${lead.sentiment_overall || 'N/A'}`);
  sections.push(`Emotional Intensity: ${lead.emotional_intensity || 'N/A'}`);
  sections.push(`Motivation Type: ${lead.motivation_type || 'N/A'}`);
  sections.push(`Trust Level: ${lead.trust_level || 'N/A'}`);

  // Sales Actions
  sections.push(`\nRECOMMENDED ACTIONS`);
  sections.push(`Next Action: ${lead.next_action || 'N/A'}`);
  sections.push(`Recommended Routing: ${lead.recommended_routing || 'N/A'}`);
  sections.push(`Needs Immediate Followup: ${lead.needs_immediate_followup ? 'YES' : 'No'}`);

  // Questions & Objections
  if (lead.key_questions?.length) {
    sections.push(`\nKEY QUESTIONS`);
    lead.key_questions.forEach((q, i) => sections.push(`${i + 1}. ${q}`));
  }
  if (lead.main_objections?.length) {
    sections.push(`\nMAIN OBJECTIONS`);
    lead.main_objections.forEach((o, i) => sections.push(`${i + 1}. ${o}`));
  }
  if (lead.competitors_mentioned?.length) {
    sections.push(`\nCOMPETITORS MENTIONED`);
    sections.push(lead.competitors_mentioned.join(', '));
  }

  // Business Details
  sections.push(`\nBUSINESS DETAILS`);
  sections.push(`Budget Range: ${lead.budget_bucket_inr || 'N/A'}`);
  sections.push(`Estimated Scale: ${lead.estimated_scale || 'N/A'}`);
  sections.push(`Enterprise: ${lead.is_enterprise ? 'Yes' : 'No'}`);
  sections.push(`Partner Intent: ${lead.partner_intent ? 'Yes' : 'No'}`);

  // Conversation Summary
  sections.push(`\nCONVERSATION SUMMARY`);
  sections.push(lead.conversation_summary || 'No summary available');

  // Timeline Points
  if (lead.conversation_timeline_points?.length) {
    sections.push(`\nCONVERSATION TIMELINE`);
    lead.conversation_timeline_points.forEach((point, i) => sections.push(`${i + 1}. ${point}`));
  }

  // Open Loops
  if (lead.open_loops_or_commitments?.length) {
    sections.push(`\nOPEN LOOPS / COMMITMENTS`);
    lead.open_loops_or_commitments.forEach((item, i) => sections.push(`${i + 1}. ${item}`));
  }

  // Source Info
  sections.push(`\nSOURCE INFORMATION`);
  sections.push(`Source: ${lead.source || 'WhatsApp'}`);
  sections.push(`Channel: ${lead.channel || 'WhatsApp'}`);
  sections.push(`Created: ${lead.created_at || 'N/A'}`);

  return sections.join('\n');
}

// Create a note in Zoho CRM and attach it to a lead
async function createLeadNote(
  accessToken: string,
  apiDomain: string,
  leadId: string,
  lead: Lead
): Promise<{ success: boolean; error?: string }> {
  try {
    const noteContent = generateLeadNoteContent(lead);

    const noteResponse = await fetch(
      `${apiDomain}/crm/v2/Leads/${leadId}/Notes`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Zoho-oauthtoken ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: [
            {
              Note_Title: `FluffyChats Lead Details - ${lead.prospect_name || 'Unknown'}`,
              Note_Content: noteContent,
            },
          ],
        }),
      }
    );

    const result = await noteResponse.json();
    console.log('[Zoho] Note creation response:', JSON.stringify(result));

    if (result.data?.[0]?.code === 'SUCCESS') {
      console.log('[Zoho] Note created successfully for lead:', leadId);
      return { success: true };
    }

    return {
      success: false,
      error: result.data?.[0]?.message || result.message || 'Failed to create note',
    };
  } catch (error) {
    console.error('[Zoho] Note creation error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Create or update lead in Zoho CRM
async function syncLead(
  accessToken: string,
  apiDomain: string,
  lead: Lead
): Promise<{ success: boolean; leadId?: string; error?: string; skipped?: boolean }> {
  const zohoLead = mapLeadToZohoLead(lead);

  console.log('[Zoho] Syncing lead:', lead.prospect_name || lead.session_id || lead.phone);

  try {
    let leadId: string | undefined;

    // First, search by lead.id (via Website field) - most reliable for deduplication
    if (lead.id) {
      const leadUrl = `https://fluffychats.app/lead/${lead.id}`;
      console.log('[Zoho] Searching for existing lead by lead.id:', lead.id);
      const searchResponse = await fetch(
        `${apiDomain}/crm/v2/Leads/search?criteria=(Website:equals:${encodeURIComponent(leadUrl)})`,
        {
          headers: {
            'Authorization': `Zoho-oauthtoken ${accessToken}`,
          },
        }
      );

      const responseText = await searchResponse.text();
      if (searchResponse.ok && responseText) {
        try {
          const searchResult = JSON.parse(responseText);
          if (searchResult.data?.length > 0) {
            console.log('[Zoho] Lead already exists (lead.id match), skipping');
            return { success: true, leadId: searchResult.data[0].id, skipped: true };
          }
        } catch {
          // Empty or invalid JSON - continue
        }
      }
    }

    // Fallback: search by email (only if valid email)
    if (!leadId && isValidEmail(lead.email)) {
      console.log('[Zoho] Searching for existing lead by email:', lead.email);
      const searchResponse = await fetch(
        `${apiDomain}/crm/v2/Leads/search?email=${encodeURIComponent(lead.email)}`,
        {
          headers: {
            'Authorization': `Zoho-oauthtoken ${accessToken}`,
          },
        }
      );

      // Check if response has content before parsing
      const responseText = await searchResponse.text();
      if (searchResponse.ok && responseText) {
        try {
          const searchResult = JSON.parse(responseText);
          console.log('[Zoho] Search result:', JSON.stringify(searchResult));

          if (searchResult.data?.length > 0) {
            // Update existing lead
            const existingId = searchResult.data[0].id;
            console.log('[Zoho] Updating existing lead:', existingId);
            zohoLead.data[0] = { ...zohoLead.data[0], id: existingId };

            const updateResponse = await fetch(
              `${apiDomain}/crm/v2/Leads`,
              {
                method: 'PUT',
                headers: {
                  'Authorization': `Zoho-oauthtoken ${accessToken}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(zohoLead),
              }
            );

            const updateResult = await updateResponse.json();
            console.log('[Zoho] Update response:', JSON.stringify(updateResult));

            if (updateResponse.ok && updateResult.data?.[0]?.code === 'SUCCESS') {
              leadId = existingId;
            } else {
              return {
                success: false,
                error: updateResult.data?.[0]?.message || updateResult.message || 'Failed to update lead',
              };
            }
          }
        } catch {
          // Empty response or invalid JSON - no existing lead found, continue to create
          console.log('[Zoho] No existing lead found (empty search result)');
        }
      }
    }

    // Create new lead if not found
    if (!leadId) {
      console.log('[Zoho] Creating new lead');
      const createResponse = await fetch(
        `${apiDomain}/crm/v2/Leads`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Zoho-oauthtoken ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(zohoLead),
        }
      );

      const result = await createResponse.json();
      console.log('[Zoho] Create response:', JSON.stringify(result));

      if (result.data?.[0]?.code === 'SUCCESS') {
        leadId = result.data[0].details.id;
        console.log('[Zoho] Lead created successfully:', leadId);
      } else {
        return {
          success: false,
          error: result.data?.[0]?.message || result.message || 'Failed to create lead',
        };
      }
    }

    return { success: true, leadId };
  } catch (error) {
    console.error('[Zoho] Sync error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function POST(request: Request) {
  try {
    const body: SyncRequest = await request.json();
    let {
      accessToken,
      refreshToken,
      apiDomain = 'https://www.zohoapis.com',
      location = 'us',
      leads,
    } = body;

    console.log('[Zoho] Sync request received');
    console.log('[Zoho] Access token provided:', !!accessToken);
    console.log('[Zoho] Refresh token provided:', !!refreshToken);
    console.log('[Zoho] Leads count:', leads?.length || 0);

    // If no tokens provided in request, try to get from server storage
    if (!accessToken || !refreshToken) {
      const serverTokens = getZohoTokens();
      if (serverTokens) {
        accessToken = accessToken || serverTokens.accessToken;
        refreshToken = refreshToken || serverTokens.refreshToken;
        apiDomain = apiDomain || serverTokens.apiDomain || 'https://www.zohoapis.com';
        location = location || serverTokens.location || 'us';
        console.log('[Zoho] Using tokens from server storage');
      }
    }

    if (!accessToken) {
      return NextResponse.json(
        { success: false, error: 'Missing access token. Please reconnect Zoho CRM.' },
        { status: 400 }
      );
    }

    if (!leads || leads.length === 0) {
      return NextResponse.json(
        { success: true, message: 'No leads to sync', count: 0 }
      );
    }

    let currentToken = accessToken;
    let currentDomain = apiDomain;
    let currentRefreshToken = refreshToken;
    let successCount = 0;
    let skippedCount = 0;
    let failedCount = 0;
    const errors: string[] = [];
    let tokenWasRefreshed = false;

    // Try first lead to check if token is valid
    let firstResult = await syncLead(currentToken, currentDomain, leads[0]);

    // If first one fails with auth/expiry error, try refreshing token
    if (!firstResult.success && isTokenExpiredError(firstResult.error)) {
      console.log('[Zoho] Token appears expired, attempting refresh...');
      console.log('[Zoho] Error was:', firstResult.error);

      if (currentRefreshToken) {
        const refreshResult = await refreshAccessToken(currentRefreshToken, location);
        if (refreshResult.accessToken) {
          console.log('[Zoho] Token refreshed successfully, retrying first lead...');
          currentToken = refreshResult.accessToken;
          if (refreshResult.apiDomain) {
            currentDomain = refreshResult.apiDomain;
          }
          tokenWasRefreshed = true;

          // Retry first lead with new token
          firstResult = await syncLead(currentToken, currentDomain, leads[0]);
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
          console.error('[Zoho] Failed to refresh token');
          return NextResponse.json(
            { success: false, error: 'Access token expired and refresh failed. Please reconnect Zoho CRM.' },
            { status: 401 }
          );
        }
      } else {
        console.error('[Zoho] No refresh token available');
        return NextResponse.json(
          { success: false, error: 'Access token expired. Please reconnect Zoho CRM.' },
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

    // Process remaining leads
    for (let i = 1; i < leads.length; i++) {
      const result = await syncLead(currentToken, currentDomain, leads[i]);
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

    console.log(`[Zoho] Sync complete: ${successCount} new, ${skippedCount} skipped, ${failedCount} failed`);

    // Update lastSync and leadsExported in server storage
    const currentTokens = getZohoTokens();
    updateIntegrationToken('zoho-crm', {
      lastSync: new Date().toISOString(),
      leadsExported: (currentTokens?.leadsExported || 0) + successCount,
    });

    const message = successCount === 0 && skippedCount > 0
      ? `All ${skippedCount} leads already synced (0 new)`
      : `Synced ${successCount} new leads to Zoho CRM${skippedCount > 0 ? ` (${skippedCount} already synced)` : ''}`;

    return NextResponse.json({
      success: successCount > 0 || skippedCount > 0 || failedCount === 0,
      message,
      count: successCount,
      skipped: skippedCount,
      failed: failedCount,
      errors: errors.length > 0 ? errors : undefined,
      newAccessToken: tokenWasRefreshed ? currentToken : undefined,
      newApiDomain: tokenWasRefreshed && currentDomain !== apiDomain ? currentDomain : undefined,
    });
  } catch (error) {
    console.error('[Zoho] Sync error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
