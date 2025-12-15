// Auto-sync leads to Google Sheets
import { Lead } from '@/types/lead';
import { getGoogleSheetsTokens, updateIntegrationToken } from './integration-tokens';

const HEADERS = [
  'ID', 'Prospect Name', 'Phone', 'Email', 'Company', 'Region',
  'Conversation Date', 'Start Time (IST)', 'End Time (IST)', 'Duration (min)',
  'Total Messages', 'User Messages', 'Assistant Messages', 'Lead Score',
  'Intent Level', 'Buyer Stage', 'Urgency', 'Hot Lead', 'Sentiment',
  'Emotional Intensity', 'Trust Level', 'Primary Topic', 'Secondary Topics',
  'Use Case', 'Need Summary', 'Conversation Summary', 'Next Action',
  'Recommended Routing', 'Needs Immediate Followup', 'Key Questions',
  'Main Objections', 'Competitors Mentioned', 'Budget Bucket (INR)',
  'Estimated Scale', 'Is Enterprise', 'Is Partner', 'Has Phone', 'Has Email',
  'Has Company', 'Completeness %', 'Source', 'Channel', 'Status', 'Created At', 'Session ID',
];

function getColumnLetter(index: number): string {
  let letter = '';
  while (index > 0) {
    const remainder = (index - 1) % 26;
    letter = String.fromCharCode(65 + remainder) + letter;
    index = Math.floor((index - 1) / 26);
  }
  return letter || 'A';
}

function leadToRow(lead: Lead): string[] {
  return [
    lead.id,
    lead.prospect_name || '',
    lead.phone || '',
    lead.email || '',
    lead.company_name || '',
    lead.region || '',
    lead.conversation_date || '',
    lead.start_time_ist || '',
    lead.end_time_ist || '',
    lead.duration_minutes?.toString() || '0',
    lead.total_messages?.toString() || '0',
    lead.user_messages?.toString() || '0',
    lead.assistant_messages?.toString() || '0',
    lead.lead_score?.toString() || '0',
    lead.intent_level || '',
    lead.buyer_stage || '',
    lead.urgency || '',
    lead.is_hot_lead ? 'Yes' : 'No',
    lead.sentiment_overall || '',
    lead.emotional_intensity || '',
    lead.trust_level || '',
    lead.primary_topic || '',
    Array.isArray(lead.secondary_topics) ? lead.secondary_topics.join(', ') : '',
    lead.use_case_category || '',
    lead.need_summary || '',
    lead.conversation_summary || '',
    lead.next_action || '',
    lead.recommended_routing || '',
    lead.needs_immediate_followup ? 'Yes' : 'No',
    Array.isArray(lead.key_questions) ? lead.key_questions.join('; ') : '',
    Array.isArray(lead.main_objections) ? lead.main_objections.join('; ') : '',
    Array.isArray(lead.competitors_mentioned) ? lead.competitors_mentioned.join(', ') : '',
    lead.budget_bucket_inr || '',
    lead.estimated_scale || '',
    lead.is_enterprise ? 'Yes' : 'No',
    lead.is_partner ? 'Yes' : 'No',
    lead.has_phone ? 'Yes' : 'No',
    lead.has_email ? 'Yes' : 'No',
    lead.has_company ? 'Yes' : 'No',
    lead.completeness?.toString() || '0',
    lead.source || '',
    lead.channel || '',
    lead.status || '',
    lead.created_at || '',
    lead.session_id || '',
  ];
}

async function refreshAccessToken(refreshToken: string): Promise<string | null> {
  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '',
        client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });
    const data = await response.json();
    return data.access_token || null;
  } catch (error) {
    console.error('[GoogleSheets] Token refresh failed:', error);
    return null;
  }
}

async function createSpreadsheet(accessToken: string): Promise<{ id: string; url: string; name: string } | null> {
  try {
    const spreadsheetName = `FluffyChats Leads - ${new Date().toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
    })}`;

    const response = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        properties: { title: spreadsheetName },
        sheets: [{ properties: { title: 'Leads', gridProperties: { frozenRowCount: 1 } } }],
      }),
    });

    if (!response.ok) return null;

    const spreadsheet = await response.json();
    const spreadsheetId = spreadsheet.spreadsheetId;

    // Add headers
    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Leads!A1:${getColumnLetter(HEADERS.length)}1?valueInputOption=RAW`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ values: [HEADERS] }),
      }
    );

    // Format header row
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: [
          {
            repeatCell: {
              range: { sheetId: 0, startRowIndex: 0, endRowIndex: 1 },
              cell: {
                userEnteredFormat: {
                  backgroundColor: { red: 0.2, green: 0.4, blue: 0.9 },
                  textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } },
                  horizontalAlignment: 'CENTER',
                },
              },
              fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)',
            },
          },
        ],
      }),
    });

    return {
      id: spreadsheetId,
      url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
      name: spreadsheetName,
    };
  } catch (error) {
    console.error('[GoogleSheets] Create spreadsheet failed:', error);
    return null;
  }
}

// Get existing lead IDs from spreadsheet to avoid duplicates
async function getExistingLeadIds(accessToken: string, spreadsheetId: string): Promise<Set<string>> {
  try {
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Leads!A:A`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) return new Set();

    const data = await response.json();
    const ids = new Set<string>();

    // Skip header row (index 0)
    if (data.values) {
      for (let i = 1; i < data.values.length; i++) {
        if (data.values[i][0]) {
          ids.add(data.values[i][0]);
        }
      }
    }

    return ids;
  } catch {
    return new Set();
  }
}

// Get actual row count from spreadsheet (excluding header, only counting non-empty rows)
async function getSheetRowCount(accessToken: string, spreadsheetId: string): Promise<number> {
  try {
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Leads!A:A`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) return 0;

    const data = await response.json();
    if (!data.values) return 0;

    // Count only non-empty rows (skip header at index 0)
    let count = 0;
    for (let i = 1; i < data.values.length; i++) {
      if (data.values[i] && data.values[i][0] && data.values[i][0].trim() !== '') {
        count++;
      }
    }
    return count;
  } catch {
    return 0;
  }
}

export async function syncLeadToGoogleSheets(lead: Lead): Promise<{ success: boolean; error?: string; skipped?: boolean }> {
  const tokens = getGoogleSheetsTokens();

  if (!tokens?.accessToken || !tokens?.refreshToken) {
    return { success: false, error: 'Google Sheets not connected' };
  }

  let accessToken = tokens.accessToken;
  let spreadsheetId = tokens.spreadsheetId;

  // If no spreadsheet exists, create one
  if (!spreadsheetId) {
    console.log('[GoogleSheets] No spreadsheet configured, creating new one...');
    const newSheet = await createSpreadsheet(accessToken);

    if (!newSheet) {
      // Try refreshing token
      const newToken = await refreshAccessToken(tokens.refreshToken);
      if (newToken) {
        accessToken = newToken;
        const retrySheet = await createSpreadsheet(accessToken);
        if (retrySheet) {
          spreadsheetId = retrySheet.id;
          updateIntegrationToken('google-sheets', {
            accessToken,
            spreadsheetId: retrySheet.id,
            spreadsheetName: retrySheet.name,
            spreadsheetUrl: retrySheet.url,
          });
        } else {
          return { success: false, error: 'Failed to create spreadsheet' };
        }
      } else {
        return { success: false, error: 'Failed to refresh token' };
      }
    } else {
      spreadsheetId = newSheet.id;
      updateIntegrationToken('google-sheets', {
        spreadsheetId: newSheet.id,
        spreadsheetName: newSheet.name,
        spreadsheetUrl: newSheet.url,
      });
    }
  }

  try {
    // Check if lead already exists in the spreadsheet
    const existingIds = await getExistingLeadIds(accessToken, spreadsheetId);
    if (existingIds.has(lead.id)) {
      console.log(`[GoogleSheets] Lead ${lead.id} already exists, skipping`);
      // Update lastSync with actual count from sheet
      const actualCount = await getSheetRowCount(accessToken, spreadsheetId);
      updateIntegrationToken('google-sheets', {
        lastSync: new Date().toISOString(),
        leadsExported: actualCount,
      });
      return { success: true, skipped: true };
    }

    // Append the lead row
    const row = leadToRow(lead);
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Leads!A:${getColumnLetter(HEADERS.length)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ values: [row] }),
      }
    );

    if (!response.ok) {
      // Try refreshing token and retry
      const newToken = await refreshAccessToken(tokens.refreshToken);
      if (newToken) {
        accessToken = newToken;
        updateIntegrationToken('google-sheets', { accessToken });

        const retryResponse = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Leads!A:${getColumnLetter(HEADERS.length)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ values: [row] }),
          }
        );

        if (!retryResponse.ok) {
          const error = await retryResponse.json();
          return { success: false, error: error.error?.message || 'Failed to append' };
        }
      } else {
        return { success: false, error: 'Token refresh failed' };
      }
    }

    // Highlight hot leads
    if (lead.is_hot_lead) {
      const result = await response.json();
      const updatedRange = result.updates?.updatedRange;
      if (updatedRange) {
        const match = updatedRange.match(/!A(\d+):/);
        if (match) {
          const rowIndex = parseInt(match[1]) - 1;
          await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              requests: [{
                repeatCell: {
                  range: { sheetId: 0, startRowIndex: rowIndex, endRowIndex: rowIndex + 1 },
                  cell: {
                    userEnteredFormat: {
                      backgroundColor: { red: 1, green: 0.9, blue: 0.8 },
                    },
                  },
                  fields: 'userEnteredFormat.backgroundColor',
                },
              }],
            }),
          });
        }
      }
    }

    // Update lastSync and leadsExported (get actual count from sheet)
    const actualCount = await getSheetRowCount(accessToken, spreadsheetId);
    updateIntegrationToken('google-sheets', {
      lastSync: new Date().toISOString(),
      leadsExported: actualCount,
    });

    console.log(`[GoogleSheets] Auto-synced lead: ${lead.prospect_name || lead.id}`);
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export function isGoogleSheetsConnected(): boolean {
  const tokens = getGoogleSheetsTokens();
  return !!(tokens?.accessToken && tokens?.refreshToken);
}

export function isGoogleSheetsLiveSyncEnabled(): boolean {
  const tokens = getGoogleSheetsTokens();
  return !!(tokens?.accessToken && tokens?.refreshToken && tokens?.liveSync === true);
}
