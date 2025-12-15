// Server-side storage for integration tokens
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const TOKENS_FILE = path.join(DATA_DIR, 'integration-tokens.json');

export interface IntegrationTokens {
  'google-sheets'?: {
    accessToken: string;
    refreshToken: string;
    spreadsheetId?: string;
    spreadsheetName?: string;
    spreadsheetUrl?: string;
    liveSync?: boolean;
    lastSync?: string;
    leadsExported?: number;
    updatedAt: string;
  };
  'hubspot'?: {
    accessToken: string;
    refreshToken: string;
    liveSync?: boolean;
    lastSync?: string;
    leadsExported?: number;
    updatedAt: string;
  };
  'zoho-crm'?: {
    accessToken: string;
    refreshToken: string;
    apiDomain?: string;
    location?: string;
    liveSync?: boolean;
    lastSync?: string;
    leadsExported?: number;
    updatedAt: string;
  };
}

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function getIntegrationTokens(): IntegrationTokens {
  try {
    ensureDataDir();
    if (fs.existsSync(TOKENS_FILE)) {
      const data = fs.readFileSync(TOKENS_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('[IntegrationTokens] Error reading tokens:', error);
  }
  return {};
}

export function saveIntegrationTokens(tokens: IntegrationTokens): void {
  try {
    ensureDataDir();
    fs.writeFileSync(TOKENS_FILE, JSON.stringify(tokens, null, 2));
  } catch (error) {
    console.error('[IntegrationTokens] Error saving tokens:', error);
  }
}

export function updateIntegrationToken(
  integration: keyof IntegrationTokens,
  data: Partial<IntegrationTokens[typeof integration]>
): void {
  const tokens = getIntegrationTokens();
  tokens[integration] = {
    ...tokens[integration],
    ...data,
    updatedAt: new Date().toISOString(),
  } as IntegrationTokens[typeof integration];
  saveIntegrationTokens(tokens);
}

export function getGoogleSheetsTokens() {
  const tokens = getIntegrationTokens();
  return tokens['google-sheets'];
}

export function getHubSpotTokens() {
  const tokens = getIntegrationTokens();
  return tokens['hubspot'];
}

export function getZohoTokens() {
  const tokens = getIntegrationTokens();
  return tokens['zoho-crm'];
}
