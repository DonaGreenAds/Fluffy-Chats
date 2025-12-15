// Auto-sync leads to HubSpot CRM
import { Lead } from '@/types/lead';
import { getHubSpotTokens, updateIntegrationToken } from './integration-tokens';

function isValidEmail(email: string): boolean {
  if (!email || email === 'unknown' || email === 'Unknown') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

async function refreshAccessToken(refreshToken: string): Promise<string | null> {
  try {
    const response = await fetch('https://api.hubapi.com/oauth/v1/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: process.env.NEXT_PUBLIC_HUBSPOT_CLIENT_ID || '',
        client_secret: process.env.HUBSPOT_CLIENT_SECRET || '',
        refresh_token: refreshToken,
      }),
    });
    const data = await response.json();
    return data.access_token || null;
  } catch (error) {
    console.error('[HubSpot] Token refresh failed:', error);
    return null;
  }
}

function generateNoteContent(lead: Lead): string {
  const sections: string[] = [];

  sections.push(`📋 FLUFFYCHATS LEAD DETAILS`);
  sections.push(`Generated: ${new Date().toISOString()}`);
  sections.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

  sections.push(`\n👤 CONTACT INFORMATION`);
  sections.push(`Name: ${lead.prospect_name || 'Unknown'}`);
  sections.push(`Phone: ${lead.phone || 'N/A'}`);
  sections.push(`Email: ${lead.email || 'N/A'}`);
  sections.push(`Company: ${lead.company_name || 'N/A'}`);
  sections.push(`Region: ${lead.region || 'N/A'}`);

  sections.push(`\n📊 SALES SCORING`);
  sections.push(`Lead Score: ${lead.lead_score || 0}/100`);
  sections.push(`Intent Level: ${lead.intent_level || 'N/A'}`);
  sections.push(`Buyer Stage: ${lead.buyer_stage || 'N/A'}`);
  sections.push(`Urgency: ${lead.urgency || 'N/A'}`);
  sections.push(`Hot Lead: ${lead.is_hot_lead ? '🔥 YES' : 'No'}`);

  sections.push(`\n✅ RECOMMENDED ACTIONS`);
  sections.push(`Next Action: ${lead.next_action || 'N/A'}`);
  sections.push(`Routing: ${lead.recommended_routing || 'N/A'}`);
  sections.push(`Immediate Followup: ${lead.needs_immediate_followup ? '⚡ YES' : 'No'}`);

  sections.push(`\n📝 CONVERSATION SUMMARY`);
  sections.push(lead.conversation_summary || 'No summary available');

  sections.push(`\n📅 CONVERSATION DETAILS`);
  sections.push(`Date: ${lead.conversation_date || 'N/A'}`);
  sections.push(`Duration: ${lead.duration_minutes || 0} min | Messages: ${lead.total_messages || 0}`);

  if (lead.key_questions?.length) {
    sections.push(`\n❓ KEY QUESTIONS: ${lead.key_questions.join('; ')}`);
  }
  if (lead.main_objections?.length) {
    sections.push(`⚠️ OBJECTIONS: ${lead.main_objections.join('; ')}`);
  }

  sections.push(`\n💼 BUSINESS DETAILS`);
  sections.push(`Budget: ${lead.budget_bucket_inr || 'N/A'} | Scale: ${lead.estimated_scale || 'N/A'}`);

  return sections.join('\n');
}

export async function syncLeadToHubSpot(lead: Lead): Promise<{ success: boolean; error?: string }> {
  const tokens = getHubSpotTokens();

  if (!tokens?.accessToken || !tokens?.refreshToken) {
    return { success: false, error: 'HubSpot not connected' };
  }

  let accessToken = tokens.accessToken;

  // Build contact properties
  const properties: Record<string, string> = {};
  if (lead.prospect_name) {
    const nameParts = lead.prospect_name.split(' ');
    properties.firstname = nameParts[0] || '';
    properties.lastname = nameParts.slice(1).join(' ') || '';
  }
  if (isValidEmail(lead.email)) properties.email = lead.email;
  if (lead.phone) properties.phone = lead.phone;
  if (lead.company_name) properties.company = lead.company_name;
  if (lead.region) properties.city = lead.region;
  if (lead.conversation_summary) {
    properties.message = lead.conversation_summary.substring(0, 65535);
  }
  properties.hs_lead_status = lead.is_hot_lead ? 'OPEN_DEAL' : 'NEW';
  properties.lifecyclestage = lead.buyer_stage === 'decision' ? 'opportunity' :
    lead.buyer_stage === 'consideration' ? 'marketingqualifiedlead' : 'lead';

  // Store lead.id in website field for deduplication (UUID is clean and unique)
  if (lead.id) {
    properties.website = `https://fluffychats.app/lead/${lead.id}`;
  }

  try {
    let contactId: string | undefined;

    // First, search by lead.id (via website field) - most reliable for deduplication
    if (lead.id) {
      const leadUrl = `https://fluffychats.app/lead/${lead.id}`;
      const searchResponse = await fetch(
        'https://api.hubapi.com/crm/v3/objects/contacts/search',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            filterGroups: [{
              filters: [{
                propertyName: 'website',
                operator: 'EQ',
                value: leadUrl,
              }],
            }],
          }),
        }
      );

      if (searchResponse.ok) {
        const searchResult = await searchResponse.json();
        if (searchResult.results?.length > 0) {
          console.log(`[HubSpot] Lead ${lead.id} already exists, skipping`);
          // Update lastSync but don't increment leadsExported for skipped leads
          updateIntegrationToken('hubspot', {
            lastSync: new Date().toISOString(),
          });
          return { success: true };
        }
      }
    }

    // Fallback: Search for existing contact by email
    if (isValidEmail(lead.email)) {
      const searchResponse = await fetch(
        'https://api.hubapi.com/crm/v3/objects/contacts/search',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            filterGroups: [{
              filters: [{
                propertyName: 'email',
                operator: 'EQ',
                value: lead.email,
              }],
            }],
          }),
        }
      );

      if (searchResponse.status === 401) {
        // Refresh token and retry
        const newToken = await refreshAccessToken(tokens.refreshToken);
        if (newToken) {
          accessToken = newToken;
          updateIntegrationToken('hubspot', { accessToken });
        } else {
          return { success: false, error: 'Token refresh failed' };
        }
      } else if (searchResponse.ok) {
        const searchResult = await searchResponse.json();
        if (searchResult.results?.length > 0) {
          contactId = searchResult.results[0].id;
        }
      }
    }

    // Create or update contact
    if (contactId) {
      const updateResponse = await fetch(
        `https://api.hubapi.com/crm/v3/objects/contacts/${contactId}`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ properties }),
        }
      );
      if (!updateResponse.ok) {
        const error = await updateResponse.json();
        return { success: false, error: error.message || 'Update failed' };
      }
    } else {
      const createResponse = await fetch(
        'https://api.hubapi.com/crm/v3/objects/contacts',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ properties }),
        }
      );
      if (!createResponse.ok) {
        const error = await createResponse.json();
        return { success: false, error: error.message || 'Create failed' };
      }
      const createResult = await createResponse.json();
      contactId = createResult.id;
    }

    // Create note with full details
    if (contactId) {
      await fetch('https://api.hubapi.com/crm/v3/objects/notes', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          properties: {
            hs_timestamp: new Date().toISOString(),
            hs_note_body: generateNoteContent(lead),
          },
          associations: [{
            to: { id: contactId },
            types: [{
              associationCategory: 'HUBSPOT_DEFINED',
              associationTypeId: 202,
            }],
          }],
        }),
      });
    }

    // Update lastSync and leadsExported
    const currentTokens = getHubSpotTokens();
    updateIntegrationToken('hubspot', {
      lastSync: new Date().toISOString(),
      leadsExported: (currentTokens?.leadsExported || 0) + 1,
    });

    console.log(`[HubSpot] Auto-synced lead: ${lead.prospect_name || lead.id}`);
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export function isHubSpotConnected(): boolean {
  const tokens = getHubSpotTokens();
  return !!(tokens?.accessToken && tokens?.refreshToken);
}

export function isHubSpotLiveSyncEnabled(): boolean {
  const tokens = getHubSpotTokens();
  return !!(tokens?.accessToken && tokens?.refreshToken && tokens?.liveSync === true);
}
