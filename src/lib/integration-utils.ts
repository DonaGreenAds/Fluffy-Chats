/**
 * Shared utility functions for CRM integrations
 * Used by HubSpot, Zoho, and Google Sheets sync routes
 */

/**
 * Validate email format
 * @param email - Email string to validate
 * @returns true if email is valid format
 */
export function isValidEmail(email: string | undefined | null): boolean {
  if (!email || email === 'unknown' || email === 'Unknown') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate phone number
 * @param phone - Phone string to validate
 * @returns true if phone has valid format
 */
export function isValidPhone(phone: string | undefined | null): boolean {
  if (!phone) return false;
  // Skip placeholder phones like ${waba_mobile}
  if (phone.includes('${') || phone.includes('}')) return false;
  // Must have at least some digits
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 7;
}

/**
 * Check if an error message indicates token expiration
 * Covers common error patterns from HubSpot, Zoho, and Google APIs
 * @param error - Error message to check
 * @returns true if error indicates token has expired
 */
export function isTokenExpiredError(error: string | undefined | null): boolean {
  if (!error) return false;
  const expiredIndicators = [
    'expired',
    '401',
    'unauthorized',
    'invalid_token',
    'invalid access token',
    'token is expired',
    'invalid_oauthtoken',
    'authentication_failure',
    'oauth_scope_mismatch',
    'invalid_code',
    'invalid oauth token',
  ];
  const lowerError = error.toLowerCase();
  return expiredIndicators.some(indicator => lowerError.includes(indicator));
}

/**
 * Format a date string for display
 * @param dateStr - ISO date string
 * @returns Formatted date string
 */
export function formatSyncDate(dateStr: string | undefined | null): string {
  if (!dateStr) return 'N/A';
  try {
    return new Date(dateStr).toLocaleString();
  } catch {
    return dateStr;
  }
}

/**
 * Truncate text to a maximum length
 * @param text - Text to truncate
 * @param maxLength - Maximum length (default 65535 for most CRM text fields)
 * @returns Truncated text
 */
export function truncateText(text: string | undefined | null, maxLength: number = 65535): string {
  if (!text) return '';
  return text.length > maxLength ? text.substring(0, maxLength) : text;
}
