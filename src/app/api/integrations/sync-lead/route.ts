import { NextResponse } from 'next/server';
import { Lead } from '@/types/lead';
import { leadsDb } from '@/lib/database';

interface SyncLeadRequest {
  lead: Lead;
  integrations: string[];
  tokens: {
    [key: string]: {
      accessToken: string;
      refreshToken?: string;
      apiDomain?: string;
      location?: string;
      spreadsheetId?: string;
    };
  };
}

export async function POST(request: Request) {
  try {
    const body: SyncLeadRequest = await request.json();
    const { lead, integrations, tokens } = body;

    console.log('[Sync Lead] Request received for integrations:', integrations);

    if (!lead || !integrations || integrations.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Missing lead or integrations' },
        { status: 400 }
      );
    }

    const results: { [key: string]: { success: boolean; error?: string; skipped?: boolean } } = {};

    for (const integrationId of integrations) {
      const token = tokens[integrationId];
      console.log(`[Sync Lead] Processing ${integrationId}, token exists:`, !!token?.accessToken);

      if (!token?.accessToken) {
        console.log(`[Sync Lead] ${integrationId} missing access token - not connected`);
        results[integrationId] = { success: false, error: `${integrationId === 'hubspot' ? 'HubSpot' : integrationId === 'zoho-crm' ? 'Zoho CRM' : 'Google Sheets'} not connected. Please connect it from the Integrations page first.` };
        continue;
      }

      try {
        let endpoint = '';
        let requestBody: Record<string, unknown> = {
          accessToken: token.accessToken,
          refreshToken: token.refreshToken,
          leads: [lead],
        };

        switch (integrationId) {
          case 'google-sheets':
            endpoint = '/api/integrations/google-sheets/sync';
            if (token.spreadsheetId) {
              requestBody.spreadsheetId = token.spreadsheetId;
            } else {
              requestBody.createNew = true;
            }
            break;
          case 'hubspot':
            endpoint = '/api/integrations/hubspot/sync';
            console.log('[Sync Lead] HubSpot request body keys:', Object.keys(requestBody));
            break;
          case 'zoho-crm':
            endpoint = '/api/integrations/zoho/sync';
            requestBody.apiDomain = token.apiDomain;
            requestBody.location = token.location;
            break;
          default:
            results[integrationId] = { success: false, error: 'Unknown integration' };
            continue;
        }

        // Make internal API call
        const baseUrl = request.headers.get('host') || 'localhost:3000';
        const protocol = baseUrl.includes('localhost') ? 'http' : 'https';
        const fullUrl = `${protocol}://${baseUrl}${endpoint}`;

        console.log(`[Sync Lead] Calling ${integrationId} at:`, fullUrl);

        const response = await fetch(fullUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        });

        const result = await response.json();
        console.log(`[Sync Lead] ${integrationId} response:`, { success: result.success, error: result.error, skipped: result.skipped });

        results[integrationId] = {
          success: result.success,
          error: result.error,
          skipped: result.skipped || (result.count === 0 && result.success),
        };

        // Mark lead as synced to this integration (if successful and not already synced)
        if (result.success && !results[integrationId].skipped) {
          try {
            await leadsDb.markSyncedTo(lead.id, integrationId);
            console.log(`[Sync Lead] Marked lead ${lead.id} as synced to ${integrationId}`);
          } catch (dbError) {
            console.error(`[Sync Lead] Failed to mark lead as synced:`, dbError);
          }
        }
      } catch (error) {
        console.error(`[Sync Lead] ${integrationId} error:`, error);
        results[integrationId] = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }

    const successCount = Object.values(results).filter(r => r.success && !r.skipped).length;
    const skippedCount = Object.values(results).filter(r => r.success && r.skipped).length;
    const failedCount = Object.values(results).filter(r => !r.success).length;

    console.log('[Sync Lead] Final results:', results);

    let message = '';
    if (successCount > 0 && skippedCount > 0) {
      message = `Synced to ${successCount} integration(s), ${skippedCount} already synced`;
    } else if (successCount > 0) {
      message = `Synced to ${successCount} integration(s)`;
    } else if (skippedCount > 0) {
      message = `Already synced to ${skippedCount} integration(s)`;
    } else if (failedCount > 0) {
      message = `Failed to sync to ${failedCount} integration(s)`;
    }

    if (failedCount > 0 && (successCount > 0 || skippedCount > 0)) {
      message += `, ${failedCount} failed`;
    }

    return NextResponse.json({
      success: successCount > 0 || skippedCount > 0,
      results,
      message,
    });
  } catch (error) {
    console.error('[Sync Lead] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
