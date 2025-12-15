import { NextResponse } from 'next/server';
import { updateIntegrationToken } from '@/lib/integration-tokens';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');

  console.log('[Zoho OAuth] Callback received');

  // Zoho returns location in the callback for data center routing
  const location = url.searchParams.get('location') || 'us';
  const accountsUrl = location === 'us'
    ? 'https://accounts.zoho.com'
    : `https://accounts.zoho.${location}`;

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
    const tokenResponse = await fetch(`${accountsUrl}/oauth/v2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: process.env.NEXT_PUBLIC_ZOHO_CLIENT_ID || '',
        client_secret: process.env.ZOHO_CLIENT_SECRET || '',
        redirect_uri: `${url.origin}/api/auth/callback/zoho`,
        code,
      }),
    });

    const tokens = await tokenResponse.json();

    if (tokens.error) {
      console.error('[Zoho OAuth] Token error:', tokens);
      return NextResponse.redirect(
        `${url.origin}/integrations?error=${encodeURIComponent(tokens.error)}`
      );
    }

    const apiDomain = tokens.api_domain || 'https://www.zohoapis.com';

    // Save tokens server-side for auto-sync
    updateIntegrationToken('zoho-crm', {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      apiDomain,
      location,
    });
    console.log('[Zoho OAuth] Saved tokens server-side for auto-sync');

    // Encode tokens for client-side storage
    const tokenData = {
      integration: 'zoho-crm',
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresIn: tokens.expires_in,
      apiDomain,
      location,
    };

    const encodedTokens = encodeURIComponent(btoa(JSON.stringify(tokenData)));

    return NextResponse.redirect(
      `${url.origin}/integrations?success=zoho-crm&tokens=${encodedTokens}`
    );
  } catch (error) {
    console.error('[Zoho OAuth] Callback error:', error);
    return NextResponse.redirect(
      `${url.origin}/integrations?error=token_exchange_failed`
    );
  }
}
