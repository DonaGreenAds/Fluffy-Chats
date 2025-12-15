import { NextResponse } from 'next/server';
import { getIntegrationTokens } from '@/lib/integration-tokens';

// GET - Fetch all integration tokens (for frontend to check connection status)
export async function GET() {
  try {
    const tokens = getIntegrationTokens();

    // Return connection status and tokens for each integration
    // Don't expose full tokens to frontend, just what's needed
    return NextResponse.json({
      'google-sheets': tokens['google-sheets'] ? {
        connected: true,
        accessToken: tokens['google-sheets'].accessToken,
        refreshToken: tokens['google-sheets'].refreshToken,
        spreadsheetId: tokens['google-sheets'].spreadsheetId,
        spreadsheetName: tokens['google-sheets'].spreadsheetName,
        spreadsheetUrl: tokens['google-sheets'].spreadsheetUrl,
        liveSync: tokens['google-sheets'].liveSync || false,
        lastSync: tokens['google-sheets'].lastSync,
        leadsExported: tokens['google-sheets'].leadsExported || 0,
      } : { connected: false },
      'hubspot': tokens['hubspot'] ? {
        connected: true,
        accessToken: tokens['hubspot'].accessToken,
        refreshToken: tokens['hubspot'].refreshToken,
        liveSync: tokens['hubspot'].liveSync || false,
        lastSync: tokens['hubspot'].lastSync,
        leadsExported: tokens['hubspot'].leadsExported || 0,
      } : { connected: false },
      'zoho-crm': tokens['zoho-crm'] ? {
        connected: true,
        accessToken: tokens['zoho-crm'].accessToken,
        refreshToken: tokens['zoho-crm'].refreshToken,
        apiDomain: tokens['zoho-crm'].apiDomain,
        location: tokens['zoho-crm'].location,
        liveSync: tokens['zoho-crm'].liveSync || false,
        lastSync: tokens['zoho-crm'].lastSync,
        leadsExported: tokens['zoho-crm'].leadsExported || 0,
      } : { connected: false },
    });
  } catch (error) {
    console.error('[Tokens API] Error:', error);
    return NextResponse.json({
      'google-sheets': { connected: false },
      'hubspot': { connected: false },
      'zoho-crm': { connected: false },
    });
  }
}
