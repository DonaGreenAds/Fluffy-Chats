import { NextResponse } from 'next/server';
import { updateIntegrationToken } from '@/lib/integration-tokens';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');

  console.log('[Google OAuth] Callback received');
  console.log('[Google OAuth] Code exists:', !!code);
  console.log('[Google OAuth] Error:', error);
  console.log('[Google OAuth] Origin:', url.origin);

  if (error) {
    console.log('[Google OAuth] Error from Google:', error);
    return NextResponse.redirect(
      `${url.origin}/integrations?error=${encodeURIComponent(error)}`
    );
  }

  if (!code) {
    console.log('[Google OAuth] No code received');
    return NextResponse.redirect(
      `${url.origin}/integrations?error=no_code`
    );
  }

  try {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
    const redirectUri = `${url.origin}/api/auth/callback/google`;

    console.log('[Google OAuth] Client ID exists:', !!clientId);
    console.log('[Google OAuth] Client Secret exists:', !!clientSecret);
    console.log('[Google OAuth] Redirect URI:', redirectUri);

    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokens = await tokenResponse.json();
    console.log('[Google OAuth] Token response status:', tokenResponse.status);
    console.log('[Google OAuth] Access token exists:', !!tokens.access_token);
    console.log('[Google OAuth] Refresh token exists:', !!tokens.refresh_token);

    if (tokens.error) {
      console.error('[Google OAuth] Token error:', tokens.error, tokens.error_description);
      return NextResponse.redirect(
        `${url.origin}/integrations?error=${encodeURIComponent(tokens.error_description || tokens.error)}`
      );
    }

    // Save tokens server-side for auto-sync
    updateIntegrationToken('google-sheets', {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
    });
    console.log('[Google OAuth] Saved tokens server-side for auto-sync');

    // Encode tokens in state for client-side storage
    const tokenData = {
      integration: 'google-sheets',
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresIn: tokens.expires_in,
    };

    const encodedTokens = encodeURIComponent(btoa(JSON.stringify(tokenData)));
    const redirectUrl = `${url.origin}/integrations?success=google-sheets&tokens=${encodedTokens}`;

    console.log('[Google OAuth] Success! Redirecting with tokens');

    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error('[Google OAuth] Callback error:', error);
    return NextResponse.redirect(
      `${url.origin}/integrations?error=token_exchange_failed`
    );
  }
}
