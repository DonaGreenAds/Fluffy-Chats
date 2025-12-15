import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const privateToken = process.env.HUBSPOT_PRIVATE_APP_TOKEN;

    if (!privateToken) {
      return NextResponse.json(
        { success: false, error: 'HubSpot Private App Token not configured in server' },
        { status: 400 }
      );
    }

    // Test the token by fetching account info
    const response = await fetch('https://api.hubapi.com/account-info/v3/details', {
      headers: {
        'Authorization': `Bearer ${privateToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(
        { success: false, error: error.message || 'Invalid token or insufficient permissions' },
        { status: 401 }
      );
    }

    const accountInfo = await response.json();

    return NextResponse.json({
      success: true,
      portalId: accountInfo.portalId,
      accountType: accountInfo.accountType,
      timeZone: accountInfo.timeZone,
    });
  } catch (error) {
    console.error('HubSpot verification error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
