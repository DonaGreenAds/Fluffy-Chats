import { NextResponse } from 'next/server';
import { Lead } from '@/types/lead';
import { updateIntegrationToken, getGoogleSheetsTokens } from '@/lib/integration-tokens';

interface SyncRequest {
  accessToken: string;
  refreshToken?: string;
  spreadsheetId?: string;
  leads: Lead[];
  createNew?: boolean;
}

// All lead fields for comprehensive export
const HEADERS = [
  'ID',
  'Prospect Name',
  'Phone',
  'Email',
  'Company',
  'Region',
  'Conversation Date',
  'Start Time (IST)',
  'End Time (IST)',
  'Duration (min)',
  'Total Messages',
  'User Messages',
  'Assistant Messages',
  'Lead Score',
  'Intent Level',
  'Buyer Stage',
  'Urgency',
  'Hot Lead',
  'Sentiment',
  'Emotional Intensity',
  'Trust Level',
  'Primary Topic',
  'Secondary Topics',
  'Use Case',
  'Need Summary',
  'Conversation Summary',
  'Next Action',
  'Recommended Routing',
  'Needs Immediate Followup',
  'Key Questions',
  'Main Objections',
  'Competitors Mentioned',
  'Budget Bucket (INR)',
  'Estimated Scale',
  'Is Enterprise',
  'Is Partner',
  'Has Phone',
  'Has Email',
  'Has Company',
  'Completeness %',
  'Source',
  'Channel',
  'Status',
  'Created At',
  'Session ID',
];

// Refresh access token if needed
async function refreshAccessToken(refreshToken: string): Promise<string | null> {
  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
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
    console.error('Failed to refresh Google token:', error);
    return null;
  }
}

// Create a new spreadsheet for FluffyChats leads
async function createSpreadsheet(accessToken: string): Promise<{ id: string; url: string; name: string } | null> {
  try {
    const spreadsheetName = `FluffyChats Leads - ${new Date().toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })}`;

    const response = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        properties: {
          title: spreadsheetName,
        },
        sheets: [
          {
            properties: {
              title: 'Leads',
              gridProperties: {
                frozenRowCount: 1,
              },
            },
          },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Failed to create spreadsheet:', error);
      return null;
    }

    const spreadsheet = await response.json();
    const spreadsheetId = spreadsheet.spreadsheetId;

    // Add headers with formatting
    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Leads!A1:${getColumnLetter(HEADERS.length)}1?valueInputOption=RAW`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          values: [HEADERS],
        }),
      }
    );

    // Format header row (bold, background color)
    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [
            {
              repeatCell: {
                range: {
                  sheetId: 0,
                  startRowIndex: 0,
                  endRowIndex: 1,
                },
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
            {
              updateSheetProperties: {
                properties: {
                  sheetId: 0,
                  gridProperties: {
                    frozenRowCount: 1,
                  },
                },
                fields: 'gridProperties.frozenRowCount',
              },
            },
            {
              autoResizeDimensions: {
                dimensions: {
                  sheetId: 0,
                  dimension: 'COLUMNS',
                  startIndex: 0,
                  endIndex: HEADERS.length,
                },
              },
            },
          ],
        }),
      }
    );

    return {
      id: spreadsheetId,
      url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
      name: spreadsheetName,
    };
  } catch (error) {
    console.error('Error creating spreadsheet:', error);
    return null;
  }
}

// Get column letter from index (0 = A, 25 = Z, 26 = AA, etc.)
function getColumnLetter(index: number): string {
  let letter = '';
  while (index > 0) {
    const remainder = (index - 1) % 26;
    letter = String.fromCharCode(65 + remainder) + letter;
    index = Math.floor((index - 1) / 26);
  }
  return letter || 'A';
}

// Check if spreadsheet exists and is accessible
async function checkSpreadsheet(accessToken: string, spreadsheetId: string): Promise<{ exists: boolean; name?: string }> {
  try {
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=properties.title`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (response.ok) {
      const data = await response.json();
      return { exists: true, name: data.properties?.title };
    }
    return { exists: false };
  } catch {
    return { exists: false };
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

// Convert lead to row data
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

// Append new leads to sheet
async function appendLeads(
  accessToken: string,
  spreadsheetId: string,
  leads: Lead[]
): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    // Get existing IDs to avoid duplicates
    const existingIds = await getExistingLeadIds(accessToken, spreadsheetId);

    // Filter out already synced leads
    const newLeads = leads.filter(lead => !existingIds.has(lead.id));

    if (newLeads.length === 0) {
      return { success: true, count: 0 };
    }

    // Convert leads to rows
    const rows = newLeads.map(leadToRow);

    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Leads!A:${getColumnLetter(HEADERS.length)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          values: rows,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      return { success: false, count: 0, error: error.error?.message || 'Failed to append' };
    }

    // Apply conditional formatting for hot leads (highlight row)
    const result = await response.json();
    const updatedRange = result.updates?.updatedRange;

    if (updatedRange) {
      // Extract start row from range like "Leads!A2:AS5"
      const match = updatedRange.match(/!A(\d+):/);
      if (match) {
        const startRow = parseInt(match[1]) - 1; // 0-indexed
        const endRow = startRow + newLeads.length;

        // Find hot lead rows and highlight them
        const hotLeadRows: number[] = [];
        newLeads.forEach((lead, idx) => {
          if (lead.is_hot_lead) {
            hotLeadRows.push(startRow + idx);
          }
        });

        if (hotLeadRows.length > 0) {
          const formatRequests = hotLeadRows.map(rowIndex => ({
            repeatCell: {
              range: {
                sheetId: 0,
                startRowIndex: rowIndex,
                endRowIndex: rowIndex + 1,
              },
              cell: {
                userEnteredFormat: {
                  backgroundColor: { red: 1, green: 0.9, blue: 0.8 }, // Light orange for hot leads
                },
              },
              fields: 'userEnteredFormat.backgroundColor',
            },
          }));

          await fetch(
            `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ requests: formatRequests }),
            }
          );
        }
      }
    }

    return { success: true, count: newLeads.length };
  } catch (error) {
    return {
      success: false,
      count: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function POST(request: Request) {
  try {
    const body: SyncRequest = await request.json();
    const { accessToken, refreshToken, spreadsheetId, leads, createNew } = body;

    if (!accessToken) {
      return NextResponse.json(
        { success: false, error: 'Missing access token' },
        { status: 400 }
      );
    }

    let currentToken = accessToken;
    let currentSpreadsheetId = spreadsheetId;
    let spreadsheetName: string | undefined;
    let spreadsheetUrl: string | undefined;
    let isNewSpreadsheet = false;

    // Create new spreadsheet if requested or no spreadsheet ID provided
    if (createNew || !currentSpreadsheetId) {
      const newSheet = await createSpreadsheet(currentToken);

      if (!newSheet) {
        // Try refreshing token and retry
        if (refreshToken) {
          const newToken = await refreshAccessToken(refreshToken);
          if (newToken) {
            currentToken = newToken;
            const retrySheet = await createSpreadsheet(currentToken);
            if (retrySheet) {
              currentSpreadsheetId = retrySheet.id;
              spreadsheetName = retrySheet.name;
              spreadsheetUrl = retrySheet.url;
              isNewSpreadsheet = true;
            } else {
              return NextResponse.json(
                { success: false, error: 'Failed to create spreadsheet' },
                { status: 500 }
              );
            }
          }
        } else {
          return NextResponse.json(
            { success: false, error: 'Failed to create spreadsheet' },
            { status: 500 }
          );
        }
      } else {
        currentSpreadsheetId = newSheet.id;
        spreadsheetName = newSheet.name;
        spreadsheetUrl = newSheet.url;
        isNewSpreadsheet = true;
      }
    } else {
      // Verify existing spreadsheet is accessible
      const check = await checkSpreadsheet(currentToken, currentSpreadsheetId);

      if (!check.exists && refreshToken) {
        const newToken = await refreshAccessToken(refreshToken);
        if (newToken) {
          currentToken = newToken;
          const retryCheck = await checkSpreadsheet(currentToken, currentSpreadsheetId);
          if (!retryCheck.exists) {
            return NextResponse.json(
              { success: false, error: 'Spreadsheet not found or not accessible' },
              { status: 400 }
            );
          }
          spreadsheetName = retryCheck.name;
        }
      } else if (!check.exists) {
        return NextResponse.json(
          { success: false, error: 'Spreadsheet not found or not accessible' },
          { status: 400 }
        );
      } else {
        spreadsheetName = check.name;
      }

      spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${currentSpreadsheetId}/edit`;
    }

    // Sync leads
    let syncResult: { success: boolean; count: number; error?: string } = { success: true, count: 0 };

    if (leads && leads.length > 0) {
      syncResult = await appendLeads(currentToken, currentSpreadsheetId!, leads);

      if (!syncResult.success) {
        return NextResponse.json(
          { success: false, error: syncResult.error || 'Sync failed' },
          { status: 500 }
        );
      }
    }

    // Save spreadsheet info and updated tokens server-side for auto-sync
    // Get actual row count from sheet for accurate leadsExported
    const actualCount = currentSpreadsheetId ? await getSheetRowCount(currentToken, currentSpreadsheetId) : 0;
    const currentTokens = getGoogleSheetsTokens();
    updateIntegrationToken('google-sheets', {
      accessToken: currentToken,
      refreshToken: refreshToken || currentTokens?.refreshToken || '',
      spreadsheetId: currentSpreadsheetId,
      spreadsheetName,
      spreadsheetUrl,
      lastSync: new Date().toISOString(),
      leadsExported: actualCount,
    });

    return NextResponse.json({
      success: true,
      message: isNewSpreadsheet
        ? `Created new spreadsheet and synced ${syncResult.count} leads`
        : `Synced ${syncResult.count} new leads`,
      count: syncResult.count,
      spreadsheetId: currentSpreadsheetId,
      spreadsheetName,
      spreadsheetUrl,
      isNewSpreadsheet,
      newAccessToken: currentToken !== accessToken ? currentToken : undefined,
    });
  } catch (error) {
    console.error('Google Sheets sync error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
