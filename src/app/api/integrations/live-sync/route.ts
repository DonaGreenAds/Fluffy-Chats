import { NextResponse } from 'next/server';
import { updateIntegrationToken, getIntegrationTokens } from '@/lib/integration-tokens';

export async function POST(request: Request) {
  try {
    const { integration, liveSync } = await request.json();

    if (!integration) {
      return NextResponse.json(
        { success: false, error: 'Integration ID is required' },
        { status: 400 }
      );
    }

    // Update the liveSync setting for this integration
    updateIntegrationToken(integration as 'google-sheets' | 'hubspot' | 'zoho-crm', {
      liveSync: Boolean(liveSync),
    });

    console.log(`[LiveSync] Updated ${integration} liveSync to: ${liveSync}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[LiveSync] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const tokens = getIntegrationTokens();

    return NextResponse.json({
      'google-sheets': tokens['google-sheets']?.liveSync || false,
      'hubspot': tokens['hubspot']?.liveSync || false,
      'zoho-crm': tokens['zoho-crm']?.liveSync || false,
    });
  } catch (error) {
    console.error('[LiveSync] Error:', error);
    return NextResponse.json({
      'google-sheets': false,
      'hubspot': false,
      'zoho-crm': false,
    });
  }
}
