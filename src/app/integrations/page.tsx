'use client';

import { useState, useEffect } from 'react';
import {
  Webhook,
  ExternalLink,
  Settings,
  Play,
  Plug,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Trash2,
  Save,
  Zap,
  Plus,
  Edit3,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import clsx from 'clsx';
import { useLeads } from '@/context/LeadContext';
import { hashPassword } from '@/context/AuthContext';

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  status: 'connected' | 'disconnected' | 'error';
  lastSync?: string;
  leadsExported?: number;
}

interface WebhookConfig {
  id: string;
  name: string;
  url: string;
  headers: string;
  events: {
    newLead: boolean;
    hotLead: boolean;
    urgentFollowup: boolean;
    enterpriseLead: boolean;
    highScoreLead: boolean;
  };
  lastTested?: string;
  testStatus?: 'success' | 'error' | null;
  isActive: boolean;
}

interface ActivityLog {
  id: string;
  integration: string;
  action: string;
  time: string;
  status: 'success' | 'error';
  details?: string;
}

interface IntegrationConfig {
  connected: boolean;
  accessToken?: string;
  refreshToken?: string;
  spreadsheetId?: string;
  spreadsheetName?: string;
  spreadsheetUrl?: string;
  apiDomain?: string;
  location?: string;
  lastSync?: string;
  leadsExported?: number;
  usePrivateToken?: boolean; // HubSpot Private App Token
  liveSync?: boolean; // Enable automatic sync when new leads are processed
}

// Google Sheets Logo
const GoogleSheetsLogo = () => (
  <svg viewBox="0 0 48 48" className="w-7 h-7">
    <path fill="#43a047" d="M37 45H11c-2.2 0-4-1.8-4-4V7c0-2.2 1.8-4 4-4h19l11 11v27c0 2.2-1.8 4-4 4z"/>
    <path fill="#c8e6c9" d="M40 14H30V4z"/>
    <path fill="#fff" d="M30 14h10L30 4z"/>
    <path fill="#e8f5e9" d="M31 14l9 9V14z"/>
    <path fill="#fff" d="M12 22h24v18H12z"/>
    <path fill="#43a047" d="M14 26h6v2h-6zm0 4h6v2h-6zm0 4h6v2h-6zm8-8h6v2h-6zm0 4h6v2h-6zm0 4h6v2h-6zm8-8h4v2h-4zm0 4h4v2h-4zm0 4h4v2h-4z"/>
  </svg>
);

// Zoho CRM Logo
const ZohoLogo = () => (
  <svg viewBox="0 0 48 48" className="w-7 h-7">
    <path fill="#1976d2" d="M8 8h32v32H8z" rx="4"/>
    <text x="50%" y="55%" dominantBaseline="middle" textAnchor="middle" fill="#fff" fontSize="22" fontWeight="bold" fontFamily="Arial, sans-serif">Z</text>
    <circle cx="36" cy="12" r="4" fill="#f44336"/>
  </svg>
);

// HubSpot Logo
const HubSpotLogo = () => (
  <svg viewBox="0 0 48 48" className="w-7 h-7">
    <path fill="#ff7a59" d="M35.5 20.2v-5.4c1.3-.6 2.2-1.9 2.2-3.4 0-2.1-1.7-3.8-3.8-3.8s-3.8 1.7-3.8 3.8c0 1.5.9 2.8 2.2 3.4v5.4c-1.8.4-3.4 1.3-4.7 2.5l-11.8-7.1c.1-.4.2-.8.2-1.2 0-2.5-2-4.5-4.5-4.5s-4.5 2-4.5 4.5 2 4.5 4.5 4.5c1 0 1.9-.3 2.6-.9l11.5 6.9c-.3.8-.5 1.7-.5 2.6 0 4.4 3.6 8 8 8s8-3.6 8-8c0-3.8-2.7-7-6.2-7.8zm-1.5 13c-2.8 0-5-2.2-5-5s2.2-5 5-5 5 2.2 5 5-2.2 5-5 5z"/>
  </svg>
);

const STORAGE_KEY = 'fluffychats_integrations';

// Default state values - defined outside component to avoid recreation on each render
const DEFAULT_CONFIGS: Record<string, IntegrationConfig> = {
  'google-sheets': { connected: false },
  'zoho-crm': { connected: false },
  'hubspot': { connected: false },
};

// OAuth configuration for each service
const OAUTH_CONFIG = {
  'google-sheets': {
    clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '',
    scopes: 'https://www.googleapis.com/auth/spreadsheets',
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    callbackPath: '/api/auth/callback/google',
  },
  'hubspot': {
    clientId: process.env.NEXT_PUBLIC_HUBSPOT_CLIENT_ID || '',
    scopes: 'crm.objects.contacts.write crm.objects.contacts.read',
    authUrl: 'https://app.hubspot.com/oauth/authorize',
    callbackPath: '/api/auth/callback/hubspot',
  },
  'zoho-crm': {
    clientId: process.env.NEXT_PUBLIC_ZOHO_CLIENT_ID || '',
    scopes: 'ZohoCRM.modules.leads.ALL',
    authUrl: 'https://accounts.zoho.com/oauth/v2/auth',
    callbackPath: '/api/auth/callback/zoho',
  },
};

export default function IntegrationsPage() {
  const { leads } = useLeads();
  const [selectedIntegration, setSelectedIntegration] = useState<string | null>(null);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [oauthProcessed, setOauthProcessed] = useState(false);
  const [showCreateSheetConfirm, setShowCreateSheetConfirm] = useState(false);
  const [createSheetPassword, setCreateSheetPassword] = useState('');
  const [createSheetPasswordError, setCreateSheetPasswordError] = useState(false);

  const createDefaultWebhook = (index: number = 1): WebhookConfig => ({
    id: `webhook-${Date.now()}-${index}`,
    name: `Webhook ${index}`,
    url: '',
    headers: '{"Authorization": "Bearer your-token"}',
    events: { newLead: true, hotLead: true, urgentFollowup: true, enterpriseLead: false, highScoreLead: false },
    isActive: true,
  });

  // Integration configurations stored in localStorage
  const [integrationConfigs, setIntegrationConfigs] = useState<Record<string, IntegrationConfig>>(DEFAULT_CONFIGS);

  // Multiple webhooks configuration
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([createDefaultWebhook(1)]);
  const [activeWebhookId, setActiveWebhookId] = useState<string | null>(null);
  const [editingWebhookName, setEditingWebhookName] = useState<string | null>(null);
  const [tempWebhookName, setTempWebhookName] = useState('');
  const [expandedWebhooks, setExpandedWebhooks] = useState<Set<string>>(new Set());

  // Activity logs
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);

  // Track if we've loaded from localStorage
  const [isHydrated, setIsHydrated] = useState(false);

  // Load from localStorage on mount (client-side only) - runs BEFORE OAuth callback
  useEffect(() => {
    const loadSettings = async () => {
      // Load activity logs from localStorage
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.activityLogs) setActivityLogs(parsed.activityLogs);
        } catch (e) {
          console.error('Failed to parse integration settings:', e);
        }
      }

      // Load integration tokens from server (source of truth for connection status)
      let loadedConfigs: Record<string, IntegrationConfig> = { ...DEFAULT_CONFIGS };
      try {
        const tokensResponse = await fetch('/api/integrations/tokens', {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' }
        });
        if (tokensResponse.ok) {
          const serverTokens = await tokensResponse.json();

          // Map server tokens to our config format
          if (serverTokens['google-sheets']?.connected) {
            loadedConfigs['google-sheets'] = {
              connected: true,
              accessToken: serverTokens['google-sheets'].accessToken,
              refreshToken: serverTokens['google-sheets'].refreshToken,
              spreadsheetId: serverTokens['google-sheets'].spreadsheetId,
              spreadsheetName: serverTokens['google-sheets'].spreadsheetName,
              spreadsheetUrl: serverTokens['google-sheets'].spreadsheetUrl,
              liveSync: serverTokens['google-sheets'].liveSync || false,
              lastSync: serverTokens['google-sheets'].lastSync,
              leadsExported: serverTokens['google-sheets'].leadsExported || 0,
            };
          }
          if (serverTokens['hubspot']?.connected) {
            loadedConfigs['hubspot'] = {
              connected: true,
              accessToken: serverTokens['hubspot'].accessToken,
              refreshToken: serverTokens['hubspot'].refreshToken,
              liveSync: serverTokens['hubspot'].liveSync || false,
              lastSync: serverTokens['hubspot'].lastSync,
              leadsExported: serverTokens['hubspot'].leadsExported || 0,
            };
          }
          if (serverTokens['zoho-crm']?.connected) {
            loadedConfigs['zoho-crm'] = {
              connected: true,
              accessToken: serverTokens['zoho-crm'].accessToken,
              refreshToken: serverTokens['zoho-crm'].refreshToken,
              apiDomain: serverTokens['zoho-crm'].apiDomain,
              location: serverTokens['zoho-crm'].location,
              liveSync: serverTokens['zoho-crm'].liveSync || false,
              lastSync: serverTokens['zoho-crm'].lastSync,
              leadsExported: serverTokens['zoho-crm'].leadsExported || 0,
            };
          }
        }
      } catch (e) {
        console.error('Failed to load tokens from server:', e);
      }

      setIntegrationConfigs(loadedConfigs);

      // Load webhook configs from server (so cron.ts can access it)
      try {
        const webhookResponse = await fetch('/api/webhook/config');
        if (webhookResponse.ok) {
          const serverWebhookConfig = await webhookResponse.json();
          // Handle migration from single webhook to multiple webhooks
          if (serverWebhookConfig.url && !serverWebhookConfig.webhooks) {
            // Old format - single webhook, migrate to new format
            const migratedWebhook: WebhookConfig = {
              id: 'webhook-default',
              name: serverWebhookConfig.name || 'Webhook 1',
              url: serverWebhookConfig.url,
              headers: serverWebhookConfig.headers || '{"Authorization": "Bearer your-token"}',
              events: serverWebhookConfig.events || { newLead: true, hotLead: true, urgentFollowup: true, enterpriseLead: false, highScoreLead: false },
              lastTested: serverWebhookConfig.lastTested,
              testStatus: serverWebhookConfig.testStatus,
              isActive: true,
            };
            setWebhooks([migratedWebhook]);
            setExpandedWebhooks(new Set([migratedWebhook.id]));
          } else if (serverWebhookConfig.webhooks && serverWebhookConfig.webhooks.length > 0) {
            // New format - multiple webhooks
            setWebhooks(serverWebhookConfig.webhooks);
            setExpandedWebhooks(new Set([serverWebhookConfig.webhooks[0].id]));
          }
        }
      } catch (e) {
        console.error('Failed to load webhook config from server:', e);
      }

      setIsHydrated(true);
    };

    loadSettings();
  }, []);

  // Handle OAuth callback from URL params - runs AFTER hydration
  useEffect(() => {
    // Wait for hydration before processing OAuth callback
    if (!isHydrated || oauthProcessed) return;

    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('success');
    const tokens = urlParams.get('tokens');
    const error = urlParams.get('error');

    // No OAuth params in URL, skip
    if (!success && !tokens && !error) return;

    setOauthProcessed(true);

    if (error) {
      alert(`Connection failed: ${error}`);
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    if (success && tokens) {
      try {
        const tokenData = JSON.parse(atob(decodeURIComponent(tokens)));
        const integrationId = tokenData.integration;

        console.log('[OAuth] Received tokens for:', integrationId);
        console.log('[OAuth] Access token exists:', !!tokenData.accessToken);
        console.log('[OAuth] Refresh token exists:', !!tokenData.refreshToken);
        console.log('[OAuth] Current configs (hydrated):', integrationConfigs);

        // Create new config with the OAuth data, merging with current state (already hydrated from localStorage)
        const newConfig = {
          ...integrationConfigs,
          [integrationId]: {
            connected: true,
            accessToken: tokenData.accessToken,
            refreshToken: tokenData.refreshToken,
            apiDomain: tokenData.apiDomain,
            location: tokenData.location,
            lastSync: new Date().toISOString(),
            leadsExported: integrationConfigs[integrationId]?.leadsExported || 0,
          },
        };

        // Add activity log
        const integrationName = integrationId === 'google-sheets' ? 'Google Sheets'
          : integrationId === 'hubspot' ? 'HubSpot' : 'Zoho CRM';

        const newLog: ActivityLog = {
          id: Date.now().toString(),
          integration: integrationName,
          action: 'Connected successfully',
          time: new Date().toISOString(),
          status: 'success',
        };
        const newLogs = [newLog, ...activityLogs].slice(0, 50);

        // Update state first
        setIntegrationConfigs(newConfig);
        setActivityLogs(newLogs);

        // Save activity logs to localStorage (tokens already saved server-side by OAuth callback)
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          activityLogs: newLogs,
        }));

        console.log('[OAuth] Config updated from server tokens');

        // Clear URL params
        window.history.replaceState({}, document.title, window.location.pathname);
      } catch (e) {
        console.error('Failed to parse OAuth tokens:', e);
        alert('Failed to process OAuth response');
      }
    }
  }, [isHydrated, oauthProcessed, integrationConfigs, activityLogs]);

  // Save activity logs to localStorage whenever they change (only after hydration)
  // Note: Integration configs are now stored server-side
  useEffect(() => {
    if (!isHydrated) return; // Don't save until we've loaded initial state
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      activityLogs,
    }));
  }, [isHydrated, activityLogs]);

  const integrations: Integration[] = [
    {
      id: 'google-sheets',
      name: 'Google Sheets',
      description: 'Automatically sync new leads to your Google Sheets',
      icon: <GoogleSheetsLogo />,
      color: 'text-[var(--foreground)]',
      bgColor: 'bg-[var(--secondary)]',
      status: integrationConfigs['google-sheets']?.connected ? 'connected' : 'disconnected',
      lastSync: integrationConfigs['google-sheets']?.lastSync ? getRelativeTime(integrationConfigs['google-sheets'].lastSync) : undefined,
      leadsExported: integrationConfigs['google-sheets']?.leadsExported,
    },
    {
      id: 'hubspot',
      name: 'HubSpot',
      description: 'Push leads directly to HubSpot CRM as contacts',
      icon: <HubSpotLogo />,
      color: 'text-[var(--foreground)]',
      bgColor: 'bg-[var(--secondary)]',
      status: integrationConfigs['hubspot']?.connected ? 'connected' : 'disconnected',
      lastSync: integrationConfigs['hubspot']?.lastSync ? getRelativeTime(integrationConfigs['hubspot'].lastSync) : undefined,
      leadsExported: integrationConfigs['hubspot']?.leadsExported,
    },
    {
      id: 'zoho-crm',
      name: 'Zoho CRM',
      description: 'Sync leads to Zoho CRM with full field mapping',
      icon: <ZohoLogo />,
      color: 'text-[var(--foreground)]',
      bgColor: 'bg-[var(--secondary)]',
      status: integrationConfigs['zoho-crm']?.connected ? 'connected' : 'disconnected',
      lastSync: integrationConfigs['zoho-crm']?.lastSync ? getRelativeTime(integrationConfigs['zoho-crm'].lastSync) : undefined,
      leadsExported: integrationConfigs['zoho-crm']?.leadsExported,
    },
  ];

  function getRelativeTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  }

  const addActivityLog = (integration: string, action: string, status: 'success' | 'error', details?: string) => {
    const newLog: ActivityLog = {
      id: Date.now().toString(),
      integration,
      action,
      time: new Date().toISOString(),
      status,
      details,
    };
    setActivityLogs(prev => [newLog, ...prev].slice(0, 50));
  };

  const handleOAuthConnect = async (integrationId: string) => {
    setIsConnecting(true);

    const config = OAUTH_CONFIG[integrationId as keyof typeof OAUTH_CONFIG];

    if (!config?.clientId) {
      alert(`Please configure ${integrationId.replace('-', ' ')} OAuth credentials in your environment variables:\n\nNEXT_PUBLIC_${integrationId.toUpperCase().replace('-', '_')}_CLIENT_ID`);
      setIsConnecting(false);
      return;
    }

    // Build OAuth URL
    const redirectUri = `${window.location.origin}${config.callbackPath}`;
    const authUrl = new URL(config.authUrl);
    authUrl.searchParams.set('client_id', config.clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('scope', config.scopes);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('access_type', 'offline');
    authUrl.searchParams.set('prompt', 'consent');

    // Redirect to OAuth provider
    window.location.href = authUrl.toString();
  };

  const handleSync = async (integrationId: string, createNew?: boolean) => {
    setIsSyncing(integrationId);
    setSyncError(null);
    const integration = integrations.find(i => i.id === integrationId);
    const config = integrationConfigs[integrationId];

    if (!config?.connected || !config.accessToken) {
      setSyncError('Not connected');
      addActivityLog(
        integration?.name || integrationId,
        'Sync failed: Not connected or missing access token',
        'error'
      );
      setIsSyncing(null);
      return;
    }

    try {
      if (leads.length === 0) {
        addActivityLog(
          integration?.name || integrationId,
          'No leads to sync',
          'success'
        );
        setIsSyncing(null);
        return;
      }

      let endpoint = '';
      let body: Record<string, unknown> = {
        accessToken: config.accessToken,
        refreshToken: config.refreshToken,
        leads: leads,
      };

      switch (integrationId) {
        case 'google-sheets':
          endpoint = '/api/integrations/google-sheets/sync';
          // If no spreadsheet exists, create new one. Otherwise sync to existing.
          if (config.spreadsheetId && !createNew) {
            body.spreadsheetId = config.spreadsheetId;
          } else {
            body.createNew = true;
          }
          break;
        case 'hubspot':
          endpoint = '/api/integrations/hubspot/sync';
          break;
        case 'zoho-crm':
          endpoint = '/api/integrations/zoho/sync';
          body.apiDomain = config.apiDomain;
          body.location = config.location;
          break;
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const result = await response.json();

      if (result.success) {
        // Reload tokens from server to get accurate leadsExported count
        // The server already updated the count, don't double-count in UI
        const tokensResponse = await fetch('/api/integrations/tokens', {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' }
        });
        let serverLeadsExported = (prev: Record<string, IntegrationConfig>) => prev[integrationId]?.leadsExported || 0;
        if (tokensResponse.ok) {
          const serverTokens = await tokensResponse.json();
          const serverData = serverTokens[integrationId];
          if (serverData) {
            serverLeadsExported = () => serverData.leadsExported || 0;
          }
        }

        // Update config with new sync time, spreadsheet info, and token if refreshed
        setIntegrationConfigs(prev => ({
          ...prev,
          [integrationId]: {
            ...prev[integrationId],
            lastSync: new Date().toISOString(),
            leadsExported: serverLeadsExported(prev),
            ...(result.newAccessToken && { accessToken: result.newAccessToken }),
            ...(result.newApiDomain && { apiDomain: result.newApiDomain }),
            // Google Sheets specific
            ...(result.spreadsheetId && { spreadsheetId: result.spreadsheetId }),
            ...(result.spreadsheetName && { spreadsheetName: result.spreadsheetName }),
            ...(result.spreadsheetUrl && { spreadsheetUrl: result.spreadsheetUrl }),
          },
        }));

        const message = result.isNewSpreadsheet
          ? `Created spreadsheet & synced ${result.count || 0} leads`
          : result.count === 0
            ? 'All leads already synced (0 new)'
            : `Synced ${result.count || 0} new leads`;

        addActivityLog(
          integration?.name || integrationId,
          message,
          'success'
        );
      } else {
        setSyncError(result.error || 'Sync failed');
        addActivityLog(
          integration?.name || integrationId,
          'Sync failed',
          'error',
          result.error
        );
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      setSyncError(errorMsg);
      addActivityLog(
        integration?.name || integrationId,
        'Sync failed',
        'error',
        errorMsg
      );
    }

    setIsSyncing(null);
  };

  const handleSyncAll = async () => {
    for (const integration of integrations) {
      if (integration.status === 'connected') {
        await handleSync(integration.id);
      }
    }
  };

  const handleDisconnect = (integrationId: string) => {
    if (confirm('Are you sure you want to disconnect this integration?')) {
      setIntegrationConfigs(prev => ({
        ...prev,
        [integrationId]: { connected: false },
      }));

      const integration = integrations.find(i => i.id === integrationId);
      addActivityLog(
        integration?.name || integrationId,
        'Disconnected',
        'success'
      );
    }
  };

  const handleTestWebhook = async (webhookId: string) => {
    const webhook = webhooks.find(w => w.id === webhookId);
    if (!webhook?.url) {
      alert('Please enter a webhook URL first');
      return;
    }

    setWebhooks(prev => prev.map(w => w.id === webhookId ? { ...w, testStatus: null } : w));

    try {
      const testPayload = {
        event: 'test',
        timestamp: new Date().toISOString(),
        data: {
          message: 'This is a test webhook from FluffyChats',
        },
      };

      // Use server-side API to test webhook (avoids CORS issues)
      const response = await fetch('/api/webhook/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: webhook.url,
          headers: webhook.headers,
          payload: testPayload,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setWebhooks(prev => prev.map(w => w.id === webhookId ? {
          ...w,
          lastTested: new Date().toISOString(),
          testStatus: 'success' as const,
        } : w));
        addActivityLog(webhook.name, 'Test webhook sent successfully', 'success');
      } else {
        setWebhooks(prev => prev.map(w => w.id === webhookId ? {
          ...w,
          lastTested: new Date().toISOString(),
          testStatus: 'error' as const,
        } : w));
        addActivityLog(webhook.name, 'Test webhook failed', 'error', result.error);
      }
    } catch (error) {
      setWebhooks(prev => prev.map(w => w.id === webhookId ? {
        ...w,
        lastTested: new Date().toISOString(),
        testStatus: 'error' as const,
      } : w));

      addActivityLog(
        webhook.name,
        'Test webhook failed',
        'error',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  };

  const handleSaveWebhooks = async () => {
    try {
      // Save all webhooks - the primary one (first active) is used by cron
      const primaryWebhook = webhooks.find(w => w.isActive) || webhooks[0];
      const response = await fetch('/api/webhook/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Include primary webhook fields for backward compatibility with cron
          url: primaryWebhook?.url || '',
          headers: primaryWebhook?.headers || '',
          events: primaryWebhook?.events || {},
          lastTested: primaryWebhook?.lastTested,
          testStatus: primaryWebhook?.testStatus,
          // New format: all webhooks
          webhooks,
        }),
      });

      if (response.ok) {
        setSaveSuccess(true);
        addActivityLog('Webhook', 'All configurations saved', 'success');
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        addActivityLog('Webhook', 'Failed to save configurations', 'error');
      }
    } catch (error) {
      console.error('Failed to save webhook configs:', error);
      addActivityLog('Webhook', 'Failed to save configurations', 'error');
    }
  };

  const handleAddWebhook = () => {
    const newWebhook = createDefaultWebhook(webhooks.length + 1);
    setWebhooks(prev => [...prev, newWebhook]);
    setExpandedWebhooks(prev => new Set([...prev, newWebhook.id]));
  };

  const handleDeleteWebhook = (webhookId: string) => {
    if (confirm('Are you sure you want to delete this webhook?')) {
      setWebhooks(prev => prev.filter(w => w.id !== webhookId));
      addActivityLog('Webhook', 'Webhook deleted', 'success');
    }
  };

  const handleRenameWebhook = (webhookId: string) => {
    const webhook = webhooks.find(w => w.id === webhookId);
    if (webhook) {
      setEditingWebhookName(webhookId);
      setTempWebhookName(webhook.name);
    }
  };

  const handleSaveWebhookName = (webhookId: string) => {
    if (tempWebhookName.trim()) {
      setWebhooks(prev => prev.map(w => w.id === webhookId ? { ...w, name: tempWebhookName.trim() } : w));
    }
    setEditingWebhookName(null);
    setTempWebhookName('');
  };

  const toggleWebhookExpanded = (webhookId: string) => {
    setExpandedWebhooks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(webhookId)) {
        newSet.delete(webhookId);
      } else {
        newSet.add(webhookId);
      }
      return newSet;
    });
  };

  const updateWebhook = (webhookId: string, updates: Partial<WebhookConfig>) => {
    setWebhooks(prev => prev.map(w => w.id === webhookId ? { ...w, ...updates } : w));
  };

  const getStatusBadge = (status: Integration['status']) => {
    switch (status) {
      case 'connected':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            Connected
          </span>
        );
      case 'error':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
            <XCircle className="w-3 h-3" /> Error
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-50 text-gray-600 border border-gray-200">
            <AlertCircle className="w-3 h-3" /> Not Connected
          </span>
        );
    }
  };

  const connectedCount = integrations.filter(i => i.status === 'connected').length;
  const totalExports = Object.values(integrationConfigs).reduce((sum, config) => sum + (config.leadsExported || 0), 0);

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between animate-fade-in">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[var(--accent-soft)] flex items-center justify-center">
            <Plug className="w-6 h-6 text-[var(--accent-solid)]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--foreground)]">Integrations</h1>
            <p className="text-[var(--muted-foreground)]">
              Connect your CRM and tools to sync leads automatically
            </p>
          </div>
        </div>
        <button
          onClick={handleSyncAll}
          disabled={!isHydrated || isSyncing !== null || connectedCount === 0}
          className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg hover:opacity-90 transition-colors flex items-center gap-2 disabled:opacity-50"
        >
          <RefreshCw className={clsx('w-4 h-4', isSyncing && 'animate-spin')} />
          {!isHydrated ? 'Loading...' : 'Sync All'}
        </button>
      </div>

      {/* Sync Error Alert */}
      {syncError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <XCircle className="w-5 h-5 text-red-500" />
          <p className="text-red-700 text-sm">{syncError}</p>
          <button
            onClick={() => setSyncError(null)}
            className="ml-auto text-red-500 hover:text-red-700"
          >
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5 animate-slide-up">
          <p className="text-sm text-[var(--muted-foreground)] mb-1">Connected Apps</p>
          <p className="text-2xl font-bold text-[var(--foreground)]">{connectedCount}</p>
        </div>
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5 animate-slide-up animation-delay-100">
          <p className="text-sm text-[var(--muted-foreground)] mb-1">Total Synced</p>
          <p className="text-2xl font-bold text-[var(--foreground)]">{totalExports}</p>
        </div>
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5 animate-slide-up animation-delay-200">
          <p className="text-sm text-[var(--muted-foreground)] mb-1">Available Leads</p>
          <p className="text-2xl font-bold text-[var(--foreground)]">{leads.length}</p>
        </div>
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5 animate-slide-up animation-delay-300">
          <p className="text-sm text-[var(--muted-foreground)] mb-1">Success Rate</p>
          <p className="text-2xl font-bold text-green-600">99.2%</p>
        </div>
      </div>

      {/* Integration Cards - Clean Modern Design */}
      <div className="grid grid-cols-3 gap-5">
        {integrations.map((integration, index) => (
          <div
            key={integration.id}
            className={clsx(
              'bg-[var(--card)] border rounded-xl overflow-hidden transition-all duration-200 animate-slide-up group',
              integration.status === 'connected'
                ? 'border-[var(--border)] hover:shadow-lg'
                : 'border-dashed border-[var(--border)] hover:border-[var(--primary)]/40',
              index === 0 && 'animation-delay-100',
              index === 1 && 'animation-delay-200',
              index === 2 && 'animation-delay-300'
            )}
          >
            {/* Card Header */}
            <div className="p-5 pb-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={clsx(
                    'w-12 h-12 rounded-xl flex items-center justify-center',
                    integration.status === 'connected' ? integration.bgColor : 'bg-gray-100'
                  )}>
                    {integration.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold text-[var(--foreground)]">{integration.name}</h3>
                    {getStatusBadge(integration.status)}
                  </div>
                </div>
                {integration.status === 'connected' && (
                  <div className="flex gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowConfigModal(integration.id);
                      }}
                      className="p-1.5 rounded-md text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--accent)] transition-colors"
                      title="Settings"
                    >
                      <Settings className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Card Content */}
            <div className="px-5 pb-5">
              {integration.status === 'connected' ? (
                <div className="space-y-4">
                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-[var(--secondary)] rounded-lg px-3 py-2.5">
                      <p className="text-[10px] uppercase tracking-wider text-[var(--muted-foreground)] font-medium">Synced</p>
                      <p className="text-lg font-bold text-[var(--foreground)]">{integration.leadsExported || 0}</p>
                    </div>
                    <div className="bg-[var(--secondary)] rounded-lg px-3 py-2.5">
                      <p className="text-[10px] uppercase tracking-wider text-[var(--muted-foreground)] font-medium">Last Sync</p>
                      <p className="text-xs font-medium text-[var(--foreground)] mt-0.5">{integration.lastSync || 'Never'}</p>
                    </div>
                  </div>

                  {/* Live Sync Toggle */}
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center justify-between py-2"
                  >
                    <div className="flex items-center gap-2">
                      <Zap className={clsx(
                        'w-4 h-4',
                        integrationConfigs[integration.id]?.liveSync ? 'text-amber-500' : 'text-[var(--muted-foreground)]'
                      )} />
                      <span className="text-sm text-[var(--foreground)]">Live Sync</span>
                    </div>
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        const newLiveSyncValue = !integrationConfigs[integration.id]?.liveSync;

                        // Update local state
                        setIntegrationConfigs(prev => ({
                          ...prev,
                          [integration.id]: {
                            ...prev[integration.id],
                            liveSync: newLiveSyncValue,
                          },
                        }));

                        // Save to server for cron job access
                        try {
                          await fetch('/api/integrations/live-sync', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              integration: integration.id,
                              liveSync: newLiveSyncValue,
                            }),
                          });
                        } catch (error) {
                          console.error('Failed to save live sync setting:', error);
                        }

                        addActivityLog(
                          integration.name,
                          newLiveSyncValue ? 'Live sync enabled' : 'Live sync disabled',
                          'success'
                        );
                      }}
                      className={clsx(
                        'relative w-10 h-5 rounded-full transition-colors',
                        integrationConfigs[integration.id]?.liveSync ? 'bg-green-500' : 'bg-gray-300'
                      )}
                    >
                      <span
                        className={clsx(
                          'absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform',
                          integrationConfigs[integration.id]?.liveSync && 'translate-x-5'
                        )}
                      />
                    </button>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSync(integration.id);
                      }}
                      disabled={!isHydrated || isSyncing === integration.id || integrationConfigs[integration.id]?.liveSync}
                      title={integrationConfigs[integration.id]?.liveSync ? 'Manual sync disabled when Live Sync is on' : (!isHydrated ? 'Loading...' : undefined)}
                      className={clsx(
                        'flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50',
                        integrationConfigs[integration.id]?.liveSync
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : 'bg-[var(--primary)] hover:opacity-90 text-white'
                      )}
                    >
                      <RefreshCw className={clsx('w-3.5 h-3.5', isSyncing === integration.id && 'animate-spin')} />
                      {!isHydrated ? 'Loading...' : isSyncing === integration.id ? 'Syncing...' : integrationConfigs[integration.id]?.liveSync ? 'Live Sync On' : 'Sync Now'}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDisconnect(integration.id);
                      }}
                      className="px-3 py-2 rounded-lg border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--accent)] transition-colors text-sm"
                    >
                      Disconnect
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-[var(--muted-foreground)] leading-relaxed">
                    {integration.description}
                  </p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowConnectModal(true);
                      setSelectedIntegration(integration.id);
                    }}
                    className="w-full py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm font-medium bg-[var(--primary)] hover:opacity-90 text-white"
                  >
                    <Plug className="w-4 h-4" />
                    Connect
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Webhook Configuration */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6 animate-slide-up animation-delay-500">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[var(--accent-soft)] flex items-center justify-center">
              <Webhook className="w-5 h-5 text-[var(--accent-solid)]" />
            </div>
            <div>
              <h2 className="font-semibold text-[var(--foreground)]">Webhooks</h2>
              <p className="text-sm text-[var(--muted-foreground)]">Send new leads to any URL (Zapier, Make, n8n, custom endpoints)</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {saveSuccess && (
              <span className="flex items-center gap-1 text-green-600 text-sm">
                <CheckCircle2 className="w-4 h-4" /> Saved!
              </span>
            )}
            <button
              onClick={handleAddWebhook}
              className="px-3 py-2 border border-[var(--border)] text-[var(--foreground)] rounded-lg hover:bg-[var(--accent)] transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Webhook
            </button>
            <button
              onClick={handleSaveWebhooks}
              className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg hover:opacity-90 transition-colors flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Save All
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {webhooks.map((webhook, index) => (
            <div
              key={webhook.id}
              className={clsx(
                'border rounded-lg overflow-hidden transition-all',
                webhook.isActive ? 'border-[var(--primary)]/50 bg-[var(--primary)]/5' : 'border-[var(--border)]'
              )}
            >
              {/* Webhook Header - Collapsible */}
              <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-[var(--accent)]/50 transition-colors"
                onClick={() => toggleWebhookExpanded(webhook.id)}
              >
                <div className="flex items-center gap-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleWebhookExpanded(webhook.id);
                    }}
                    className="p-1 hover:bg-[var(--accent)] rounded transition-colors"
                  >
                    {expandedWebhooks.has(webhook.id) ? (
                      <ChevronUp className="w-4 h-4 text-[var(--muted-foreground)]" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-[var(--muted-foreground)]" />
                    )}
                  </button>

                  {editingWebhookName === webhook.id ? (
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="text"
                        value={tempWebhookName}
                        onChange={(e) => setTempWebhookName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveWebhookName(webhook.id);
                          if (e.key === 'Escape') {
                            setEditingWebhookName(null);
                            setTempWebhookName('');
                          }
                        }}
                        className="px-2 py-1 bg-[var(--background)] border border-[var(--border)] rounded text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50"
                        autoFocus
                      />
                      <button
                        onClick={() => handleSaveWebhookName(webhook.id)}
                        className="p-1 hover:bg-green-100 rounded text-green-600"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setEditingWebhookName(null);
                          setTempWebhookName('');
                        }}
                        className="p-1 hover:bg-red-100 rounded text-red-600"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-[var(--foreground)]">{webhook.name}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRenameWebhook(webhook.id);
                        }}
                        className="p-1 hover:bg-[var(--accent)] rounded text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                        title="Rename"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {webhook.url && (
                    <span className="text-xs text-[var(--muted-foreground)] truncate max-w-[200px]">
                      {webhook.url}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  {/* Active toggle */}
                  <button
                    onClick={() => updateWebhook(webhook.id, { isActive: !webhook.isActive })}
                    className={clsx(
                      'relative w-10 h-5 rounded-full transition-colors',
                      webhook.isActive ? 'bg-green-500' : 'bg-gray-300'
                    )}
                    title={webhook.isActive ? 'Active' : 'Inactive'}
                  >
                    <span
                      className={clsx(
                        'absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform',
                        webhook.isActive && 'translate-x-5'
                      )}
                    />
                  </button>

                  {/* Test status */}
                  {webhook.testStatus && (
                    <span className={clsx(
                      'px-2 py-0.5 rounded text-xs font-medium',
                      webhook.testStatus === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    )}>
                      {webhook.testStatus === 'success' ? 'OK' : 'Failed'}
                    </span>
                  )}

                  {/* Delete button */}
                  <button
                    onClick={() => handleDeleteWebhook(webhook.id)}
                    className="p-1.5 hover:bg-red-100 rounded text-[var(--muted-foreground)] hover:text-red-600 transition-colors"
                    title="Delete webhook"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Webhook Content - Expandable */}
              {expandedWebhooks.has(webhook.id) && (
                <div className="p-4 pt-0 border-t border-[var(--border)] space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                      Webhook URL
                    </label>
                    <div className="flex gap-3">
                      <input
                        type="url"
                        value={webhook.url}
                        onChange={(e) => updateWebhook(webhook.id, { url: e.target.value })}
                        placeholder="https://your-webhook-endpoint.com/leads"
                        className="flex-1 px-4 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)] placeholder-[var(--muted-foreground)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50 focus:border-[var(--primary)]"
                      />
                      <button
                        onClick={() => handleTestWebhook(webhook.id)}
                        className="px-4 py-2.5 bg-[var(--primary)] text-white rounded-lg hover:opacity-90 transition-colors flex items-center gap-2"
                      >
                        <Play className="w-4 h-4" />
                        Test
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                        Trigger Events
                      </label>
                      <div className="space-y-2 bg-[var(--background)] rounded-lg p-4 border border-[var(--border)]">
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={webhook.events.newLead}
                            onChange={(e) => updateWebhook(webhook.id, {
                              events: { ...webhook.events, newLead: e.target.checked }
                            })}
                            className="w-4 h-4 rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)]"
                          />
                          <div>
                            <span className="text-sm text-[var(--foreground)]">New lead created</span>
                            <p className="text-xs text-[var(--muted-foreground)]">Triggered for every new lead</p>
                          </div>
                        </label>
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={webhook.events.hotLead}
                            onChange={(e) => updateWebhook(webhook.id, {
                              events: { ...webhook.events, hotLead: e.target.checked }
                            })}
                            className="w-4 h-4 rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)]"
                          />
                          <div>
                            <span className="text-sm text-[var(--foreground)]">Hot lead detected</span>
                            <p className="text-xs text-[var(--muted-foreground)]">High-intent leads ready to convert</p>
                          </div>
                        </label>
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={webhook.events.urgentFollowup}
                            onChange={(e) => updateWebhook(webhook.id, {
                              events: { ...webhook.events, urgentFollowup: e.target.checked }
                            })}
                            className="w-4 h-4 rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)]"
                          />
                          <div>
                            <span className="text-sm text-[var(--foreground)]">Urgent follow-up needed</span>
                            <p className="text-xs text-[var(--muted-foreground)]">Leads requiring immediate attention</p>
                          </div>
                        </label>
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={webhook.events.enterpriseLead}
                            onChange={(e) => updateWebhook(webhook.id, {
                              events: { ...webhook.events, enterpriseLead: e.target.checked }
                            })}
                            className="w-4 h-4 rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)]"
                          />
                          <div>
                            <span className="text-sm text-[var(--foreground)]">Enterprise lead</span>
                            <p className="text-xs text-[var(--muted-foreground)]">Large company/enterprise prospects</p>
                          </div>
                        </label>
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={webhook.events.highScoreLead}
                            onChange={(e) => updateWebhook(webhook.id, {
                              events: { ...webhook.events, highScoreLead: e.target.checked }
                            })}
                            className="w-4 h-4 rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)]"
                          />
                          <div>
                            <span className="text-sm text-[var(--foreground)]">High score lead (80+)</span>
                            <p className="text-xs text-[var(--muted-foreground)]">Leads with score 80 or above</p>
                          </div>
                        </label>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                        Headers (Optional)
                      </label>
                      <textarea
                        value={webhook.headers}
                        onChange={(e) => updateWebhook(webhook.id, { headers: e.target.value })}
                        placeholder='{"Authorization": "Bearer your-token"}'
                        rows={6}
                        className="w-full px-4 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)] placeholder-[var(--muted-foreground)] text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50 focus:border-[var(--primary)] resize-none"
                      />
                      <p className="text-xs text-[var(--muted-foreground)] mt-2">JSON format. Common headers: Authorization, X-API-Key</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6 animate-slide-up animation-delay-600">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-[var(--foreground)]">Recent Activity</h2>
          {activityLogs.length > 0 && (
            <button
              onClick={() => setActivityLogs([])}
              className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
            >
              Clear All
            </button>
          )}
        </div>

        <div className="space-y-3">
          {activityLogs.length === 0 ? (
            <p className="text-sm text-[var(--muted-foreground)] text-center py-8">No recent activity</p>
          ) : (
            activityLogs.slice(0, 5).map((activity) => (
              <div
                key={activity.id}
                className="flex items-center justify-between p-3 bg-[var(--background)] rounded-lg border border-[var(--border)]"
              >
                <div className="flex items-center gap-3">
                  <div className={clsx(
                    'w-8 h-8 rounded-lg flex items-center justify-center',
                    activity.status === 'success' ? 'bg-green-50' : 'bg-red-50'
                  )}>
                    {activity.status === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-600" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[var(--foreground)]">{activity.integration}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">{activity.action}</p>
                  </div>
                </div>
                <span className="text-xs text-[var(--muted-foreground)]">{getRelativeTime(activity.time)}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Connect Modal */}
      {showConnectModal && selectedIntegration && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-[var(--card)] rounded-xl p-6 max-w-md w-full mx-4 border border-[var(--border)] shadow-xl animate-scale-in">
            <div className="flex items-center gap-3 mb-4">
              <div className={clsx(
                'w-12 h-12 rounded-xl flex items-center justify-center',
                integrations.find(i => i.id === selectedIntegration)?.bgColor
              )}>
                {integrations.find(i => i.id === selectedIntegration)?.icon}
              </div>
              <div>
                <h2 className="font-semibold text-[var(--foreground)]">
                  Connect to {integrations.find(i => i.id === selectedIntegration)?.name}
                </h2>
                <p className="text-sm text-[var(--muted-foreground)]">OAuth Authorization</p>
              </div>
            </div>
            <p className="text-sm text-[var(--muted-foreground)] mb-6">
              You&apos;ll be redirected to {integrations.find(i => i.id === selectedIntegration)?.name} to authorize the connection. This allows FluffyChats to automatically sync new leads to your account.
            </p>
            <div className="bg-[var(--background)] rounded-lg p-4 mb-6 border border-[var(--border)]">
              <p className="text-sm text-[var(--foreground)] font-medium mb-2">Permissions requested:</p>
              <ul className="text-sm text-[var(--muted-foreground)] space-y-1">
                {selectedIntegration === 'google-sheets' && (
                  <>
                    <li>• Read and write to your Google Sheets</li>
                    <li>• Create new spreadsheets for lead data</li>
                  </>
                )}
                {selectedIntegration === 'hubspot' && (
                  <>
                    <li>• Create and update contacts in HubSpot</li>
                    <li>• Sync lead data including score, intent, and summary</li>
                    <li>• Mark hot leads with HOT status</li>
                  </>
                )}
                {selectedIntegration === 'zoho-crm' && (
                  <>
                    <li>• Create and manage leads in Zoho CRM</li>
                    <li>• Access lead module data</li>
                  </>
                )}
              </ul>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowConnectModal(false);
                  setSelectedIntegration(null);
                }}
                className="flex-1 py-2.5 border border-[var(--border)] text-[var(--foreground)] rounded-lg hover:bg-[var(--accent)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  handleOAuthConnect(selectedIntegration);
                }}
                disabled={isConnecting}
                className="flex-1 py-2.5 bg-[var(--primary)] text-white rounded-lg hover:opacity-90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isConnecting ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <ExternalLink className="w-4 h-4" />
                )}
                Authorize
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Config Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-[var(--card)] rounded-xl p-6 max-w-lg w-full mx-4 border border-[var(--border)] shadow-xl animate-scale-in">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-semibold text-[var(--foreground)]">
                {integrations.find(i => i.id === showConfigModal)?.name} Settings
              </h2>
              <button
                onClick={() => setShowConfigModal(null)}
                className="p-2 rounded-lg hover:bg-[var(--accent)] transition-colors"
              >
                <XCircle className="w-5 h-5 text-[var(--muted-foreground)]" />
              </button>
            </div>

            <div className="space-y-4">
              {showConfigModal === 'google-sheets' && (
                <div className="space-y-4">
                  {/* Show current connected spreadsheet */}
                  {integrationConfigs['google-sheets']?.spreadsheetName && (
                    <div className="p-4 bg-[var(--secondary)] border border-[var(--border)] rounded-lg">
                      <p className="text-sm font-medium text-[var(--foreground)] mb-2">Currently syncing to:</p>
                      <a
                        href={integrationConfigs['google-sheets'].spreadsheetUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-[var(--foreground)] hover:text-[var(--primary)]"
                      >
                        <GoogleSheetsLogo />
                        <span className="text-sm font-medium truncate">
                          {integrationConfigs['google-sheets'].spreadsheetName}
                        </span>
                        <ExternalLink className="w-4 h-4 flex-shrink-0" />
                      </a>
                    </div>
                  )}

                  {/* Option to create new spreadsheet */}
                  <div className="p-4 bg-[var(--background)] border border-[var(--border)] rounded-lg">
                    <p className="text-sm font-medium text-[var(--foreground)] mb-2">
                      {integrationConfigs['google-sheets']?.spreadsheetName ? 'Create a new spreadsheet?' : 'No spreadsheet connected yet'}
                    </p>
                    <p className="text-xs text-[var(--muted-foreground)] mb-3">
                      Click below to create a new FluffyChats spreadsheet with all lead columns pre-configured.
                    </p>
                    <button
                      onClick={() => {
                        setShowCreateSheetConfirm(true);
                        setCreateSheetPassword('');
                        setCreateSheetPasswordError(false);
                      }}
                      disabled={isSyncing === 'google-sheets'}
                      className="w-full py-2.5 bg-[var(--primary)] text-white rounded-lg hover:opacity-90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isSyncing === 'google-sheets' ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <GoogleSheetsLogo />
                      )}
                      {integrationConfigs['google-sheets']?.spreadsheetName ? 'Create New Spreadsheet' : 'Create Spreadsheet & Sync'}
                    </button>
                  </div>
                </div>
              )}

              {showConfigModal === 'hubspot' && (
                <div className="space-y-4">
                  <div className="p-4 bg-[var(--secondary)] border border-[var(--border)] rounded-lg">
                    <p className="text-sm text-[var(--foreground)] flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[var(--primary)]" />
                      Connected via OAuth
                    </p>
                  </div>
                  <p className="text-sm text-[var(--muted-foreground)]">
                    HubSpot is connected. Leads will be synced as contacts to your HubSpot CRM.
                  </p>
                </div>
              )}

              {showConfigModal === 'zoho-crm' && (
                <div className="space-y-4">
                  <div className="p-4 bg-[var(--secondary)] border border-[var(--border)] rounded-lg">
                    <p className="text-sm text-[var(--foreground)] flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[var(--primary)]" />
                      Connected via OAuth
                    </p>
                  </div>
                  <p className="text-sm text-[var(--muted-foreground)]">
                    Your connection is managed securely through OAuth. To change accounts, disconnect and reconnect with a different account.
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowConfigModal(null)}
                  className="flex-1 py-2.5 border border-[var(--border)] text-[var(--foreground)] rounded-lg hover:bg-[var(--accent)] transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create New Spreadsheet Confirmation Modal */}
      {showCreateSheetConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-[var(--card)] rounded-xl p-6 max-w-md w-full mx-4 border border-[var(--border)] shadow-xl animate-scale-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-[var(--secondary)] flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-[var(--foreground)]" />
              </div>
              <div>
                <h2 className="font-semibold text-[var(--foreground)]">Confirm New Spreadsheet</h2>
                <p className="text-sm text-[var(--muted-foreground)]">This action requires confirmation</p>
              </div>
            </div>
            <p className="text-sm text-[var(--muted-foreground)] mb-4">
              Creating a new spreadsheet will start syncing leads to a fresh sheet. Your existing spreadsheet will remain unchanged but will no longer receive new leads.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                Enter password to confirm
              </label>
              <input
                type="password"
                value={createSheetPassword}
                onChange={(e) => {
                  setCreateSheetPassword(e.target.value);
                  setCreateSheetPasswordError(false);
                }}
                placeholder="Enter password"
                className={clsx(
                  'w-full px-4 py-2.5 bg-[var(--background)] border rounded-lg text-[var(--foreground)] placeholder-[var(--muted-foreground)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50 focus:border-[var(--primary)]',
                  createSheetPasswordError ? 'border-red-500' : 'border-[var(--border)]'
                )}
              />
              {createSheetPasswordError && (
                <p className="text-sm text-red-500 mt-1">Incorrect password</p>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowCreateSheetConfirm(false);
                  setCreateSheetPassword('');
                  setCreateSheetPasswordError(false);
                }}
                className="flex-1 py-2.5 border border-[var(--border)] text-[var(--foreground)] rounded-lg hover:bg-[var(--accent)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  // Get current user's password hash from localStorage
                  const session = localStorage.getItem('fluffychats_session');
                  const storedUsers = localStorage.getItem('fluffychats_users');

                  if (session && storedUsers) {
                    const sessionData = JSON.parse(session);
                    const users = JSON.parse(storedUsers);
                    const currentUser = users.find((u: { id: string }) => u.id === sessionData.user.id);

                    if (currentUser) {
                      const inputHash = await hashPassword(createSheetPassword);
                      if (inputHash === currentUser.passwordHash) {
                        setShowCreateSheetConfirm(false);
                        setShowConfigModal(null);
                        setCreateSheetPassword('');
                        handleSync('google-sheets', true);
                      } else {
                        setCreateSheetPasswordError(true);
                      }
                    } else {
                      setCreateSheetPasswordError(true);
                    }
                  } else {
                    setCreateSheetPasswordError(true);
                  }
                }}
                className="flex-1 py-2.5 bg-[var(--primary)] text-white rounded-lg hover:opacity-90 transition-colors"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
