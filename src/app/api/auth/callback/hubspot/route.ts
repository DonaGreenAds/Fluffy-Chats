import { NextResponse } from 'next/server';
import { updateIntegrationToken } from '@/lib/integration-tokens';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');

  console.log('[HubSpot OAuth] Callback received');

  if (error) {
    return NextResponse.redirect(
      `${url.origin}/integrations?error=${encodeURIComponent(error)}`
    );
  }

  if (!code) {
    return NextResponse.redirect(
      `${url.origin}/integrations?error=no_code`
    );
  }

  try {
    // Exchange code for tokens
    const tokenResponse = await fetch('https://api.hubapi.com/oauth/v1/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: process.env.NEXT_PUBLIC_HUBSPOT_CLIENT_ID || '',
        client_secret: process.env.HUBSPOT_CLIENT_SECRET || '',
        redirect_uri: `${url.origin}/api/auth/callback/hubspot`,
        code,
      }),
    });

    const tokens = await tokenResponse.json();

    if (tokens.error || tokens.status === 'error') {
      console.error('[HubSpot OAuth] Token error:', tokens);
      return NextResponse.redirect(
        `${url.origin}/integrations?error=${encodeURIComponent(tokens.message || tokens.error || 'Unknown error')}`
      );
    }

    // Save tokens server-side for auto-sync
    updateIntegrationToken('hubspot', {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
    });
    console.log('[HubSpot OAuth] Saved tokens server-side for auto-sync');

    // Encode tokens for client-side storage
    const tokenData = {
      integration: 'hubspot',
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresIn: tokens.expires_in,
    };

    const encodedTokens = encodeURIComponent(btoa(JSON.stringify(tokenData)));

    return NextResponse.redirect(
      `${url.origin}/integrations?success=hubspot&tokens=${encodedTokens}`
    );
  } catch (error) {
    console.error('[HubSpot OAuth] Callback error:', error);
    return NextResponse.redirect(
      `${url.origin}/integrations?error=token_exchange_failed`
    );
  }
}
