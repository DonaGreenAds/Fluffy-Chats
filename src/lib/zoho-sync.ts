// Auto-sync leads to Zoho CRM
import { Lead } from '@/types/lead';
import { getZohoTokens, updateIntegrationToken } from './integration-tokens';

function isValidPhone(phone: string): boolean {
  if (!phone) return false;
  if (phone.includes('${') || phone.includes('}')) return false;
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 7;
}

function isValidEmail(email: string): boolean {
  if (!email || email === 'unknown' || email === 'Unknown') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

async function refreshAccessToken(refreshToken: string, apiDomain: string): Promise<string | null> {
  try {
    const accountsUrl = apiDomain.includes('.in')
      ? 'https://accounts.zoho.in'
      : apiDomain.includes('.eu')
        ? 'https://accounts.zoho.eu'
        : 'https://accounts.zoho.com';

    const response = await fetch(`${accountsUrl}/oauth/v2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: process.env.NEXT_PUBLIC_ZOHO_CLIENT_ID || '',
        client_secret: process.env.ZOHO_CLIENT_SECRET || '',
        refresh_token: refreshToken,
      }),
    });
    const data = await response.json();
    return data.access_token || null;
  } catch (error) {
    console.error('[Zoho] Token refresh failed:', error);
    return null;
  }
}

function generateFullDescription(lead: Lead): string {
  const parts: string[] = [];

  if (lead.conversation_summary) {
    parts.push(lead.conversation_summary);
    parts.push('\n---\n');
  }

  parts.push(`LEAD INTELLIGENCE:`);
  parts.push(`• Lead Score: ${lead.lead_score || 0}/100`);
  parts.push(`• Intent: ${lead.intent_level || 'N/A'} | Buyer Stage: ${lead.buyer_stage || 'N/A'}`);
  parts.push(`• Urgency: ${lead.urgency || 'N/A'} | Hot Lead: ${lead.is_hot_lead ? 'YES' : 'No'}`);

  parts.push(`\nCONVERSATION DETAILS:`);
  parts.push(`• Date: ${lead.conversation_date || 'N/A'}`);
  parts.push(`• Duration: ${lead.duration_minutes || 0} min | Messages: ${lead.total_messages || 0}`);

  parts.push(`\nRECOMMENDED ACTIONS:`);
  parts.push(`• Next Action: ${lead.next_action || 'N/A'}`);
  parts.push(`• Routing: ${lead.recommended_routing || 'N/A'}`);
  parts.push(`• Immediate Followup: ${lead.needs_immediate_followup ? 'YES' : 'No'}`);

  if (lead.key_questions?.length) {
    parts.push(`\nKEY QUESTIONS: ${lead.key_questions.join('; ')}`);
  }
  if (lead.main_objections?.length) {
    parts.push(`OBJECTIONS: ${lead.main_objections.join('; ')}`);
  }

  parts.push(`\nBUSINESS DETAILS:`);
  parts.push(`• Budget: ${lead.budget_bucket_inr || 'N/A'} | Scale: ${lead.estimated_scale || 'N/A'}`);

  return parts.join('\n');
}

export async function syncLeadToZoho(lead: Lead): Promise<{ success: boolean; error?: string }> {
  const tokens = getZohoTokens();

  if (!tokens?.accessToken || !tokens?.refreshToken) {
    return { success: false, error: 'Zoho CRM not connected' };
  }

  let accessToken = tokens.accessToken;
  const apiDomain = tokens.apiDomain || 'https://www.zohoapis.com';

  // Build lead data - Phone is now optional
  const leadData: Record<string, any> = {
    First_Name: lead.prospect_name?.split(' ')[0] || 'Unknown',
    Last_Name: lead.prospect_name?.split(' ').slice(1).join(' ') || 'Lead',
    Company: lead.company_name || 'Unknown Company',
    Lead_Source: 'WhatsApp Chat',
    Lead_Status: lead.is_hot_lead ? 'Hot' : 'Not Contacted',
    Description: generateFullDescription(lead),
  };

  // Only add phone if valid (not a placeholder like ${waba_mobile})
  if (isValidPhone(lead.phone)) {
    leadData.Phone = lead.phone;
  }

  if (isValidEmail(lead.email)) {
    leadData.Email = lead.email;
  }
  if (lead.region) leadData.City = lead.region;

  // Store lead.id in Website field for deduplication (UUID is clean and unique)
  if (lead.id) {
    leadData.Website = `https://fluffychats.app/lead/${lead.id}`;
  }

  try {
    // First, search by lead.id (via Website field) - most reliable for deduplication
    if (lead.id) {
      const leadUrl = `https://fluffychats.app/lead/${lead.id}`;
      const sessionSearchResponse = await fetch(
        `${apiDomain}/crm/v2/Leads/search?criteria=(Website:equals:${encodeURIComponent(leadUrl)})`,
        {
          headers: { 'Authorization': `Zoho-oauthtoken ${accessToken}` },
        }
      );

      if (sessionSearchResponse.ok) {
        const responseText = await sessionSearchResponse.text();
        if (responseText) {
          try {
            const searchResult = JSON.parse(responseText);
            if (searchResult.data?.length > 0) {
              console.log(`[Zoho] Lead ${lead.id} already exists, skipping`);
              // Update lastSync but don't increment leadsExported for skipped leads
              updateIntegrationToken('zoho-crm', {
                lastSync: new Date().toISOString(),
              });
              return { success: true };
            }
          } catch {
            // Continue if parse fails
          }
        }
      }
    }

    // Fallback: Search for existing lead by email first if available
    let searchUrl = '';
    if (isValidEmail(lead.email)) {
      searchUrl = `${apiDomain}/crm/v2/Leads/search?email=${encodeURIComponent(lead.email)}`;
    } else if (isValidPhone(lead.phone)) {
      searchUrl = `${apiDomain}/crm/v2/Leads/search?phone=${encodeURIComponent(lead.phone)}`;
    }

    let searchResponse = null;
    if (searchUrl) {
      searchResponse = await fetch(searchUrl, {
        headers: { 'Authorization': `Zoho-oauthtoken ${accessToken}` },
      });
    }

    // Handle token expiry
    if (searchResponse && searchResponse.status === 401) {
      const newToken = await refreshAccessToken(tokens.refreshToken, apiDomain);
      if (newToken) {
        accessToken = newToken;
        updateIntegrationToken('zoho-crm', { accessToken });
      } else {
        return { success: false, error: 'Token refresh failed' };
      }
    }

    let existingLeadId: string | undefined;

    if (searchResponse && searchResponse.ok) {
      const responseText = await searchResponse.text();
      if (responseText) {
        try {
          const searchResult = JSON.parse(responseText);
          if (searchResult.data?.length > 0) {
            existingLeadId = searchResult.data[0].id;
          }
        } catch {
          // Empty or invalid JSON - no existing lead
        }
      }
    }

    // Create or update lead
    const method = existingLeadId ? 'PUT' : 'POST';
    const url = existingLeadId
      ? `${apiDomain}/crm/v2/Leads/${existingLeadId}`
      : `${apiDomain}/crm/v2/Leads`;

    const response = await fetch(url, {
      method,
      headers: {
        'Authorization': `Zoho-oauthtoken ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ data: [leadData] }),
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.message || JSON.stringify(error) };
    }

    // Update lastSync and leadsExported
    const currentTokens = getZohoTokens();
    updateIntegrationToken('zoho-crm', {
      lastSync: new Date().toISOString(),
      leadsExported: (currentTokens?.leadsExported || 0) + 1,
    });

    console.log(`[Zoho] Auto-synced lead: ${lead.prospect_name || lead.id}`);
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export function isZohoConnected(): boolean {
  const tokens = getZohoTokens();
  return !!(tokens?.accessToken && tokens?.refreshToken);
}

export function isZohoLiveSyncEnabled(): boolean {
  const tokens = getZohoTokens();
  return !!(tokens?.accessToken && tokens?.refreshToken && tokens?.liveSync === true);
}
