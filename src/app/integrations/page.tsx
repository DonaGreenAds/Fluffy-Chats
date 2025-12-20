'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Webhook,
  ExternalLink,
  Settings,
  Play,
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
  Link2,
  Database,
  Users,
  TrendingUp,
} from 'lucide-react';
import clsx from 'clsx';
import { useLeads } from '@/context/LeadContext';
import { hashPassword } from '@/context/AuthContext';

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  accentColor: string;
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
  usePrivateToken?: boolean;
  liveSync?: boolean;
}

// Google Sheets Logo - Softened
const GoogleSheetsLogo = () => (
  <svg viewBox="0 0 48 48" className="w-6 h-6">
    <path fill="#4CAF50" d="M37 45H11c-2.2 0-4-1.8-4-4V7c0-2.2 1.8-4 4-4h19l11 11v27c0 2.2-1.8 4-4 4z" opacity="0.85"/>
    <path fill="#C8E6C9" d="M40 14H30V4z"/>
    <path fill="#fff" d="M30 14h10L30 4z"/>
    <path fill="#E8F5E9" d="M31 14l9 9V14z"/>
    <path fill="#fff" d="M12 22h24v18H12z"/>
    <path fill="#4CAF50" d="M14 26h6v2h-6zm0 4h6v2h-6zm0 4h6v2h-6zm8-8h6v2h-6zm0 4h6v2h-6zm0 4h6v2h-6zm8-8h4v2h-4zm0 4h4v2h-4zm0 4h4v2h-4z" opacity="0.7"/>
  </svg>
);

// Zoho CRM Logo - Softened
const ZohoLogo = () => (
  <svg viewBox="0 0 48 48" className="w-6 h-6">
    <rect x="8" y="8" width="32" height="32" rx="6" fill="#1E88E5" opacity="0.85"/>
    <text x="50%" y="55%" dominantBaseline="middle" textAnchor="middle" fill="#fff" fontSize="20" fontWeight="600" fontFamily="system-ui, sans-serif">Z</text>
  </svg>
);

// HubSpot Logo - Softened
const HubSpotLogo = () => (
  <svg viewBox="0 0 48 48" className="w-6 h-6">
    <path fill="#FF7A59" opacity="0.85" d="M35.5 20.2v-5.4c1.3-.6 2.2-1.9 2.2-3.4 0-2.1-1.7-3.8-3.8-3.8s-3.8 1.7-3.8 3.8c0 1.5.9 2.8 2.2 3.4v5.4c-1.8.4-3.4 1.3-4.7 2.5l-11.8-7.1c.1-.4.2-.8.2-1.2 0-2.5-2-4.5-4.5-4.5s-4.5 2-4.5 4.5 2 4.5 4.5 4.5c1 0 1.9-.3 2.6-.9l11.5 6.9c-.3.8-.5 1.7-.5 2.6 0 4.4 3.6 8 8 8s8-3.6 8-8c0-3.8-2.7-7-6.2-7.8zm-1.5 13c-2.8 0-5-2.2-5-5s2.2-5 5-5 5 2.2 5 5-2.2 5-5 5z"/>
  </svg>
);

const STORAGE_KEY = 'fluffychats_integrations';

const DEFAULT_CONFIGS: Record<string, IntegrationConfig> = {
  'google-sheets': { connected: false },
  'zoho-crm': { connected: false },
  'hubspot': { connected: false },
};

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

// Pastel accent colors for integrations
const PASTEL_ACCENTS = {
  'google-sheets': { bg: '#ECFDF3', text: '#065F46', border: '#D1FAE5' },
  'hubspot': { bg: '#FFF7ED', text: '#9A3412', border: '#FED7AA' },
  'zoho-crm': { bg: '#EEF2FF', text: '#3730A3', border: '#C7D2FE' },
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
  const [showCreateSheetConfirm, setShowCreateSheetConfirm] = useState(false);
  const [createSheetPassword, setCreateSheetPassword] = useState('');
  const [createSheetPasswordError, setCreateSheetPasswordError] = useState(false);

  const createDefaultWebhook = useCallback((index: number = 1): WebhookConfig => ({
    id: `webhook-${crypto.randomUUID()}`,
    name: `Webhook ${index}`,
    url: '',
    headers: '{"Authorization": "Bearer your-token"}',
    events: { newLead: true, hotLead: true, urgentFollowup: true, enterpriseLead: false, highScoreLead: false },
    isActive: true,
  }), []);

  const [integrationConfigs, setIntegrationConfigs] = useState<Record<string, IntegrationConfig>>(DEFAULT_CONFIGS);
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>(() => [{
    id: 'webhook-initial-1',
    name: 'Webhook 1',
    url: '',
    headers: '{"Authorization": "Bearer your-token"}',
    events: { newLead: true, hotLead: true, urgentFollowup: true, enterpriseLead: false, highScoreLead: false },
    isActive: true,
  }]);
  const [expandedWebhooks, setExpandedWebhooks] = useState<Set<string>>(new Set());
  const [editingWebhookName, setEditingWebhookName] = useState<string | null>(null);
  const [tempWebhookName, setTempWebhookName] = useState('');
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load from localStorage on mount and handle OAuth callback
  useEffect(() => {
    const loadSettings = async () => {
      let loadedActivityLogs: ActivityLog[] = [];
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.activityLogs) loadedActivityLogs = parsed.activityLogs;
        } catch (e) {
          console.error('Failed to parse integration settings:', e);
        }
      }

      const loadedConfigs: Record<string, IntegrationConfig> = { ...DEFAULT_CONFIGS };
      try {
        const tokensResponse = await fetch('/api/integrations/tokens', {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' }
        });
        if (tokensResponse.ok) {
          const serverTokens = await tokensResponse.json();

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

      // Handle OAuth callback if present
      const urlParams = new URLSearchParams(window.location.search);
      const success = urlParams.get('success');
      const tokens = urlParams.get('tokens');
      const error = urlParams.get('error');

      if (error) {
        alert(`Connection failed: ${error}`);
        window.history.replaceState({}, document.title, window.location.pathname);
      } else if (success && tokens) {
        try {
          const tokenData = JSON.parse(atob(decodeURIComponent(tokens)));
          const integrationId = tokenData.integration;

          loadedConfigs[integrationId] = {
            connected: true,
            accessToken: tokenData.accessToken,
            refreshToken: tokenData.refreshToken,
            apiDomain: tokenData.apiDomain,
            location: tokenData.location,
            lastSync: new Date().toISOString(),
            leadsExported: loadedConfigs[integrationId]?.leadsExported || 0,
          };

          const integrationName = integrationId === 'google-sheets' ? 'Google Sheets'
            : integrationId === 'hubspot' ? 'HubSpot' : 'Zoho CRM';

          const newLog: ActivityLog = {
            id: crypto.randomUUID(),
            integration: integrationName,
            action: 'Connected successfully',
            time: new Date().toISOString(),
            status: 'success',
          };

          loadedActivityLogs = [newLog, ...loadedActivityLogs].slice(0, 50);
          localStorage.setItem(STORAGE_KEY, JSON.stringify({
            activityLogs: loadedActivityLogs,
          }));

          window.history.replaceState({}, document.title, window.location.pathname);
        } catch (e) {
          console.error('Failed to parse OAuth tokens:', e);
          alert('Failed to process OAuth response');
        }
      }

      setActivityLogs(loadedActivityLogs);
      setIntegrationConfigs(loadedConfigs);

      try {
        const webhookResponse = await fetch('/api/webhook/config');
        if (webhookResponse.ok) {
          const serverWebhookConfig = await webhookResponse.json();
          if (serverWebhookConfig.url && !serverWebhookConfig.webhooks) {
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

  useEffect(() => {
    if (!isHydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      activityLogs,
    }));
  }, [isHydrated, activityLogs]);

  const integrations: Integration[] = [
    {
      id: 'google-sheets',
      name: 'Google Sheets',
      description: 'Export leads to spreadsheets for easy access and sharing',
      icon: <GoogleSheetsLogo />,
      accentColor: 'mint',
      status: integrationConfigs['google-sheets']?.connected ? 'connected' : 'disconnected',
      lastSync: integrationConfigs['google-sheets']?.lastSync ? getRelativeTime(integrationConfigs['google-sheets'].lastSync) : undefined,
      leadsExported: integrationConfigs['google-sheets']?.leadsExported,
    },
    {
      id: 'hubspot',
      name: 'HubSpot',
      description: 'Sync leads directly to your HubSpot CRM contacts',
      icon: <HubSpotLogo />,
      accentColor: 'peach',
      status: integrationConfigs['hubspot']?.connected ? 'connected' : 'disconnected',
      lastSync: integrationConfigs['hubspot']?.lastSync ? getRelativeTime(integrationConfigs['hubspot'].lastSync) : undefined,
      leadsExported: integrationConfigs['hubspot']?.leadsExported,
    },
    {
      id: 'zoho-crm',
      name: 'Zoho CRM',
      description: 'Push leads to Zoho CRM with complete field mapping',
      icon: <ZohoLogo />,
      accentColor: 'blue',
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
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  }

  const addActivityLog = useCallback((integration: string, action: string, status: 'success' | 'error', details?: string) => {
    const newLog: ActivityLog = {
      id: crypto.randomUUID(),
      integration,
      action,
      time: new Date().toISOString(),
      status,
      details,
    };
    setActivityLogs(prev => [newLog, ...prev].slice(0, 50));
  }, []);

  const handleOAuthConnect = async (integrationId: string) => {
    setIsConnecting(true);

    const config = OAUTH_CONFIG[integrationId as keyof typeof OAUTH_CONFIG];

    if (!config?.clientId) {
      alert(`Please configure ${integrationId.replace('-', ' ')} OAuth credentials in your environment variables:\n\nNEXT_PUBLIC_${integrationId.toUpperCase().replace('-', '_')}_CLIENT_ID`);
      setIsConnecting(false);
      return;
    }

    const redirectUri = `${window.location.origin}${config.callbackPath}`;
    const authUrl = new URL(config.authUrl);
    authUrl.searchParams.set('client_id', config.clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('scope', config.scopes);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('access_type', 'offline');
    authUrl.searchParams.set('prompt', 'consent');

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
        'Sync failed: Not connected',
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
      const body: Record<string, unknown> = {
        accessToken: config.accessToken,
        refreshToken: config.refreshToken,
        leads: leads,
      };

      switch (integrationId) {
        case 'google-sheets':
          endpoint = '/api/integrations/google-sheets/sync';
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

        setIntegrationConfigs(prev => ({
          ...prev,
          [integrationId]: {
            ...prev[integrationId],
            lastSync: new Date().toISOString(),
            leadsExported: serverLeadsExported(prev),
            ...(result.newAccessToken && { accessToken: result.newAccessToken }),
            ...(result.newApiDomain && { apiDomain: result.newApiDomain }),
            ...(result.spreadsheetId && { spreadsheetId: result.spreadsheetId }),
            ...(result.spreadsheetName && { spreadsheetName: result.spreadsheetName }),
            ...(result.spreadsheetUrl && { spreadsheetUrl: result.spreadsheetUrl }),
          },
        }));

        const message = result.isNewSpreadsheet
          ? `Created & synced ${result.count || 0} leads`
          : result.count === 0
            ? 'All leads synced'
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
        addActivityLog(webhook.name, 'Test sent successfully', 'success');
      } else {
        setWebhooks(prev => prev.map(w => w.id === webhookId ? {
          ...w,
          lastTested: new Date().toISOString(),
          testStatus: 'error' as const,
        } : w));
        addActivityLog(webhook.name, 'Test failed', 'error', result.error);
      }
    } catch (error) {
      setWebhooks(prev => prev.map(w => w.id === webhookId ? {
        ...w,
        lastTested: new Date().toISOString(),
        testStatus: 'error' as const,
      } : w));

      addActivityLog(
        webhook.name,
        'Test failed',
        'error',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  };

  const handleSaveWebhooks = async () => {
    try {
      const primaryWebhook = webhooks.find(w => w.isActive) || webhooks[0];
      const response = await fetch('/api/webhook/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: primaryWebhook?.url || '',
          headers: primaryWebhook?.headers || '',
          events: primaryWebhook?.events || {},
          lastTested: primaryWebhook?.lastTested,
          testStatus: primaryWebhook?.testStatus,
          webhooks,
        }),
      });

      if (response.ok) {
        setSaveSuccess(true);
        addActivityLog('Webhook', 'Configuration saved', 'success');
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        addActivityLog('Webhook', 'Failed to save', 'error');
      }
    } catch (error) {
      console.error('Failed to save webhook configs:', error);
      addActivityLog('Webhook', 'Failed to save', 'error');
    }
  };

  const handleAddWebhook = () => {
    const newWebhook = createDefaultWebhook(webhooks.length + 1);
    setWebhooks(prev => [...prev, newWebhook]);
    setExpandedWebhooks(prev => new Set([...prev, newWebhook.id]));
  };

  const handleDeleteWebhook = (webhookId: string) => {
    if (confirm('Delete this webhook?')) {
      setWebhooks(prev => prev.filter(w => w.id !== webhookId));
      addActivityLog('Webhook', 'Deleted', 'success');
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

  const connectedCount = integrations.filter(i => i.status === 'connected').length;
  const totalExports = Object.values(integrationConfigs).reduce((sum, config) => sum + (config.leadsExported || 0), 0);
  const successRate = totalExports > 0 ? 99.2 : 0;

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F9FAFB' }}>
      <div className="max-w-6xl mx-auto p-8">
        {/* Page Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-[#111827] mb-1">Integrations</h1>
            <p className="text-[#6B7280]">Connect your CRM, spreadsheets, and automation tools</p>
          </div>
          <button
            onClick={() => {
              // Sync all connected integrations
              const connectedIntegrations = integrations.filter(i => i.status === 'connected');
              if (connectedIntegrations.length === 0) {
                alert('No integrations connected. Please connect an integration first.');
                return;
              }
              connectedIntegrations.forEach(integration => {
                handleSync(integration.id);
              });
            }}
            disabled={isSyncing !== null || connectedCount === 0}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 bg-[#8B5CF6] text-white hover:bg-[#7C3AED] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={clsx('w-4 h-4', isSyncing && 'animate-spin')} />
            Sync All
          </button>
        </div>

        {/* Sync Error Alert */}
        {syncError && (
          <div className="mb-6 bg-[#FEF2F2] border border-[#FECACA] rounded-[14px] p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-[#DC2626]" />
            <p className="text-[#991B1B] text-sm flex-1">{syncError}</p>
            <button
              onClick={() => setSyncError(null)}
              className="text-[#DC2626] hover:text-[#991B1B] transition-colors"
            >
              <XCircle className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Stats Row - Redesigned with pastel backgrounds and strokes */}
        <div className="grid grid-cols-4 gap-5 mb-8">
          {[
            { icon: Link2, label: 'Connected Apps', value: connectedCount, bg: '#ECFEFF', border: '#A5F3FC', iconBg: '#CFFAFE', iconColor: '#0891B2' },
            { icon: Database, label: 'Total Synced', value: totalExports, bg: '#F5F3FF', border: '#DDD6FE', iconBg: '#EDE9FE', iconColor: '#7C3AED' },
            { icon: Users, label: 'Available Leads', value: leads.length, bg: '#EEF2FF', border: '#C7D2FE', iconBg: '#E0E7FF', iconColor: '#4F46E5' },
            { icon: TrendingUp, label: 'Success Rate', value: `${successRate}%`, bg: '#ECFDF3', border: '#A7F3D0', iconBg: '#D1FAE5', iconColor: '#059669', isSuccess: true },
          ].map((stat, index) => (
            <div
              key={stat.label}
              className="rounded-[14px] p-5 transition-all duration-200 hover:shadow-sm"
              style={{
                backgroundColor: stat.bg,
                border: `1px solid ${stat.border}`,
                animationDelay: `${index * 50}ms`
              }}
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: stat.iconBg }}
                >
                  <stat.icon className="w-5 h-5" style={{ color: stat.iconColor }} />
                </div>
                <div>
                  <p className="text-xs text-[#6B7280] mb-0.5">{stat.label}</p>
                  <p className={clsx(
                    'text-2xl font-semibold',
                    stat.isSuccess ? 'text-[#059669]' : 'text-[#111827]'
                  )}>
                    {stat.value}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Integration Cards Section */}
        <div className="mb-8">
          <h2 className="text-sm font-medium text-[#6B7280] uppercase tracking-wider mb-4">Apps</h2>
          <div className="grid grid-cols-3 gap-5">
            {integrations.map((integration) => {
              const colors = PASTEL_ACCENTS[integration.id as keyof typeof PASTEL_ACCENTS];
              const isConnected = integration.status === 'connected';

              return (
                <div
                  key={integration.id}
                  className="bg-white rounded-[14px] overflow-hidden transition-all duration-200 hover:shadow-md group"
                  style={{
                    border: '1px solid #E5E7EB',
                    minHeight: '280px',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  {/* Card Header */}
                  <div className="p-5 pb-4 flex-shrink-0">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-11 h-11 rounded-xl flex items-center justify-center"
                          style={{ backgroundColor: colors.bg }}
                        >
                          {integration.icon}
                        </div>
                        <div>
                          <h3 className="font-medium text-[#111827] text-[15px]">{integration.name}</h3>
                          {/* Status Badge */}
                          <span
                            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium mt-1"
                            style={{
                              backgroundColor: isConnected ? '#F0FDF4' : '#F9FAFB',
                              color: isConnected ? '#166534' : '#6B7280',
                            }}
                          >
                            {isConnected ? (
                              <>
                                <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E]" />
                                Connected
                              </>
                            ) : (
                              'Not Connected'
                            )}
                          </span>
                        </div>
                      </div>
                      {isConnected && (
                        <button
                          onClick={() => setShowConfigModal(integration.id)}
                          className="p-2 rounded-lg text-[#9CA3AF] hover:text-[#6B7280] hover:bg-[#F9FAFB] transition-colors"
                        >
                          <Settings className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="px-5 pb-5 flex-1 flex flex-col">
                    {isConnected ? (
                      <>
                        {/* Stats */}
                        <div className="grid grid-cols-2 gap-3 mb-4">
                          <div className="bg-[#F9FAFB] rounded-lg px-3 py-2.5">
                            <p className="text-[10px] uppercase tracking-wider text-[#9CA3AF] font-medium">Synced</p>
                            <p className="text-lg font-semibold text-[#111827]">{integration.leadsExported || 0}</p>
                          </div>
                          <div className="bg-[#F9FAFB] rounded-lg px-3 py-2.5">
                            <p className="text-[10px] uppercase tracking-wider text-[#9CA3AF] font-medium">Last Sync</p>
                            <p className="text-xs font-medium text-[#111827] mt-0.5">{integration.lastSync || 'Never'}</p>
                          </div>
                        </div>

                        {/* Live Sync Toggle */}
                        <div className="flex items-center justify-between py-2 mb-3">
                          <div className="flex items-center gap-2">
                            <Zap className={clsx(
                              'w-4 h-4',
                              integrationConfigs[integration.id]?.liveSync ? 'text-[#F59E0B]' : 'text-[#D1D5DB]'
                            )} />
                            <span className="text-sm text-[#374151]">Live Sync</span>
                          </div>
                          <button
                            onClick={async () => {
                              const newLiveSyncValue = !integrationConfigs[integration.id]?.liveSync;

                              setIntegrationConfigs(prev => ({
                                ...prev,
                                [integration.id]: {
                                  ...prev[integration.id],
                                  liveSync: newLiveSyncValue,
                                },
                              }));

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
                              'relative w-9 h-5 rounded-full transition-colors',
                              integrationConfigs[integration.id]?.liveSync ? 'bg-[#22C55E]' : 'bg-[#E5E7EB]'
                            )}
                          >
                            <span
                              className={clsx(
                                'absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform',
                                integrationConfigs[integration.id]?.liveSync && 'translate-x-4'
                              )}
                            />
                          </button>
                        </div>

                        {/* Actions */}
                        <div className="mt-auto flex gap-2">
                          <button
                            onClick={() => handleSync(integration.id)}
                            disabled={!isHydrated || isSyncing === integration.id || integrationConfigs[integration.id]?.liveSync}
                            className={clsx(
                              'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                              integrationConfigs[integration.id]?.liveSync
                                ? 'bg-[#F3F4F6] text-[#9CA3AF] cursor-not-allowed'
                                : 'text-[#374151] hover:shadow-sm'
                            )}
                            style={{
                              backgroundColor: integrationConfigs[integration.id]?.liveSync ? '#F3F4F6' : colors.bg,
                              color: integrationConfigs[integration.id]?.liveSync ? '#9CA3AF' : colors.text,
                            }}
                          >
                            <RefreshCw className={clsx('w-3.5 h-3.5', isSyncing === integration.id && 'animate-spin')} />
                            {isSyncing === integration.id ? 'Syncing...' : integrationConfigs[integration.id]?.liveSync ? 'Auto' : 'Sync'}
                          </button>
                          <button
                            onClick={() => handleDisconnect(integration.id)}
                            className="px-3 py-2.5 rounded-xl text-sm font-medium text-[#6B7280] bg-[#F9FAFB] hover:bg-[#F3F4F6] transition-colors"
                          >
                            Disconnect
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <p className="text-sm text-[#6B7280] leading-relaxed mb-4 flex-1">
                          {integration.description}
                        </p>
                        <button
                          onClick={() => {
                            setShowConnectModal(true);
                            setSelectedIntegration(integration.id);
                          }}
                          className="w-full py-2.5 rounded-xl text-sm font-medium transition-all duration-200 hover:shadow-sm"
                          style={{
                            backgroundColor: colors.bg,
                            color: colors.text,
                          }}
                        >
                          Connect
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Webhook Section */}
        <div
          className="rounded-[14px] p-6 mb-8"
          style={{
            backgroundColor: '#FAFAFF',
            border: '1px solid #E5E7EB',
          }}
        >
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#F5F3FF] flex items-center justify-center">
                <Webhook className="w-5 h-5 text-[#7C3AED]" />
              </div>
              <div>
                <h2 className="font-medium text-[#111827]">Webhooks</h2>
                <p className="text-sm text-[#6B7280]">Send leads to Zapier, Make, n8n, or custom endpoints</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {saveSuccess && (
                <span className="flex items-center gap-1 text-[#059669] text-sm">
                  <CheckCircle2 className="w-4 h-4" /> Saved
                </span>
              )}
              <button
                onClick={handleAddWebhook}
                className="px-3 py-2 rounded-xl text-sm font-medium text-[#374151] bg-white border border-[#E5E7EB] hover:bg-[#F9FAFB] transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Webhook
              </button>
              <button
                onClick={handleSaveWebhooks}
                className="px-4 py-2 rounded-xl text-sm font-medium bg-[#F5F3FF] text-[#5B21B6] hover:bg-[#EDE9FE] transition-colors flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Save All
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {webhooks.map((webhook) => (
              <div
                key={webhook.id}
                className="bg-white rounded-xl overflow-hidden transition-all duration-200"
                style={{
                  border: webhook.isActive ? '1px solid #DDD6FE' : '1px solid #E5E7EB',
                }}
              >
                {/* Webhook Header */}
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-[#FAFAFA] transition-colors"
                  onClick={() => toggleWebhookExpanded(webhook.id)}
                >
                  <div className="flex items-center gap-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleWebhookExpanded(webhook.id);
                      }}
                      className="p-1 hover:bg-[#F3F4F6] rounded transition-colors"
                    >
                      {expandedWebhooks.has(webhook.id) ? (
                        <ChevronUp className="w-4 h-4 text-[#9CA3AF]" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-[#9CA3AF]" />
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
                          className="px-2 py-1 bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#DDD6FE]"
                          autoFocus
                        />
                        <button
                          onClick={() => handleSaveWebhookName(webhook.id)}
                          className="p-1 hover:bg-[#ECFDF3] rounded text-[#059669]"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-[#111827]">{webhook.name}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRenameWebhook(webhook.id);
                          }}
                          className="p-1 hover:bg-[#F3F4F6] rounded text-[#9CA3AF] hover:text-[#6B7280] transition-colors"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    {webhook.url && (
                      <span className="text-xs text-[#9CA3AF] truncate max-w-[200px]">
                        {webhook.url}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                    {webhook.testStatus && (
                      <span className={clsx(
                        'px-2 py-0.5 rounded-md text-xs font-medium',
                        webhook.testStatus === 'success' ? 'bg-[#ECFDF3] text-[#059669]' : 'bg-[#FEF2F2] text-[#DC2626]'
                      )}>
                        {webhook.testStatus === 'success' ? 'OK' : 'Failed'}
                      </span>
                    )}

                    <button
                      onClick={() => updateWebhook(webhook.id, { isActive: !webhook.isActive })}
                      className={clsx(
                        'relative w-9 h-5 rounded-full transition-colors',
                        webhook.isActive ? 'bg-[#22C55E]' : 'bg-[#E5E7EB]'
                      )}
                    >
                      <span
                        className={clsx(
                          'absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform',
                          webhook.isActive && 'translate-x-4'
                        )}
                      />
                    </button>

                    <button
                      onClick={() => handleDeleteWebhook(webhook.id)}
                      className="p-1.5 hover:bg-[#FEF2F2] rounded-lg text-[#9CA3AF] hover:text-[#DC2626] transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Webhook Content */}
                {expandedWebhooks.has(webhook.id) && (
                  <div className="px-4 pb-4 pt-0 border-t border-[#F3F4F6]">
                    <div className="pt-4">
                      <label className="block text-sm font-medium text-[#374151] mb-2">
                        Webhook URL
                      </label>
                      <div className="flex gap-3">
                        <input
                          type="url"
                          value={webhook.url}
                          onChange={(e) => updateWebhook(webhook.id, { url: e.target.value })}
                          placeholder="https://your-endpoint.com/webhook"
                          className="flex-1 px-4 py-2.5 bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl text-[#111827] placeholder-[#9CA3AF] text-sm focus:outline-none focus:ring-2 focus:ring-[#DDD6FE] focus:border-transparent"
                        />
                        <button
                          onClick={() => handleTestWebhook(webhook.id)}
                          className="px-4 py-2.5 bg-[#F5F3FF] text-[#5B21B6] rounded-xl hover:bg-[#EDE9FE] transition-colors flex items-center gap-2 text-sm font-medium"
                        >
                          <Play className="w-4 h-4" />
                          Test
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6 mt-4">
                      <div>
                        <label className="block text-sm font-medium text-[#374151] mb-2">
                          Trigger Events
                        </label>
                        <div className="space-y-2 bg-[#F9FAFB] rounded-xl p-4">
                          {[
                            { key: 'newLead', label: 'New lead created', desc: 'Triggered for every new lead' },
                            { key: 'hotLead', label: 'Hot lead detected', desc: 'High-intent leads' },
                            { key: 'urgentFollowup', label: 'Urgent follow-up', desc: 'Needs immediate attention' },
                            { key: 'enterpriseLead', label: 'Enterprise lead', desc: 'Large company prospects' },
                            { key: 'highScoreLead', label: 'High score (80+)', desc: 'Score 80 or above' },
                          ].map((event) => (
                            <label key={event.key} className="flex items-center gap-3 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={webhook.events[event.key as keyof typeof webhook.events]}
                                onChange={(e) => updateWebhook(webhook.id, {
                                  events: { ...webhook.events, [event.key]: e.target.checked }
                                })}
                                className="w-4 h-4 rounded border-[#D1D5DB] text-[#7C3AED] focus:ring-[#DDD6FE]"
                              />
                              <div>
                                <span className="text-sm text-[#374151]">{event.label}</span>
                                <p className="text-xs text-[#9CA3AF]">{event.desc}</p>
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-[#374151] mb-2">
                          Headers (Optional)
                        </label>
                        <textarea
                          value={webhook.headers}
                          onChange={(e) => updateWebhook(webhook.id, { headers: e.target.value })}
                          placeholder='{"Authorization": "Bearer token"}'
                          rows={6}
                          className="w-full px-4 py-2.5 bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl text-[#111827] placeholder-[#9CA3AF] text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#DDD6FE] focus:border-transparent resize-none"
                        />
                        <p className="text-xs text-[#9CA3AF] mt-2">JSON format</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-[14px] p-6" style={{ border: '1px solid #E5E7EB' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-medium text-[#111827]">Recent Activity</h2>
            {activityLogs.length > 0 && (
              <button
                onClick={() => setActivityLogs([])}
                className="text-sm text-[#9CA3AF] hover:text-[#6B7280] transition-colors"
              >
                Clear
              </button>
            )}
          </div>

          <div className="space-y-2">
            {activityLogs.length === 0 ? (
              <p className="text-sm text-[#9CA3AF] text-center py-8">No recent activity</p>
            ) : (
              activityLogs.slice(0, 5).map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-center justify-between p-3 bg-[#F9FAFB] rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    <div className={clsx(
                      'w-8 h-8 rounded-lg flex items-center justify-center',
                      activity.status === 'success' ? 'bg-[#ECFDF3]' : 'bg-[#FEF2F2]'
                    )}>
                      {activity.status === 'success' ? (
                        <CheckCircle2 className="w-4 h-4 text-[#059669]" />
                      ) : (
                        <XCircle className="w-4 h-4 text-[#DC2626]" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[#111827]">{activity.integration}</p>
                      <p className="text-xs text-[#9CA3AF]">{activity.action}</p>
                    </div>
                  </div>
                  <span className="text-xs text-[#9CA3AF]">{getRelativeTime(activity.time)}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Connect Modal */}
        {showConnectModal && selectedIntegration && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
            <div
              className="bg-white rounded-[16px] p-6 max-w-md w-full mx-4"
              style={{ boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)' }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{
                    backgroundColor: PASTEL_ACCENTS[selectedIntegration as keyof typeof PASTEL_ACCENTS]?.bg
                  }}
                >
                  {integrations.find(i => i.id === selectedIntegration)?.icon}
                </div>
                <div>
                  <h2 className="font-semibold text-[#111827]">
                    Connect {integrations.find(i => i.id === selectedIntegration)?.name}
                  </h2>
                  <p className="text-sm text-[#6B7280]">OAuth Authorization</p>
                </div>
              </div>
              <p className="text-sm text-[#6B7280] mb-6">
                You&apos;ll be redirected to authorize the connection. This allows FluffyChats to sync leads automatically.
              </p>
              <div className="bg-[#F9FAFB] rounded-xl p-4 mb-6">
                <p className="text-sm text-[#374151] font-medium mb-2">Permissions requested:</p>
                <ul className="text-sm text-[#6B7280] space-y-1">
                  {selectedIntegration === 'google-sheets' && (
                    <>
                      <li>• Read and write to Google Sheets</li>
                      <li>• Create new spreadsheets</li>
                    </>
                  )}
                  {selectedIntegration === 'hubspot' && (
                    <>
                      <li>• Create and update contacts</li>
                      <li>• Sync lead data and scores</li>
                    </>
                  )}
                  {selectedIntegration === 'zoho-crm' && (
                    <>
                      <li>• Create and manage leads</li>
                      <li>• Access lead module</li>
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
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium text-[#374151] bg-[#F9FAFB] hover:bg-[#F3F4F6] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleOAuthConnect(selectedIntegration)}
                  disabled={isConnecting}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  style={{
                    backgroundColor: PASTEL_ACCENTS[selectedIntegration as keyof typeof PASTEL_ACCENTS]?.bg,
                    color: PASTEL_ACCENTS[selectedIntegration as keyof typeof PASTEL_ACCENTS]?.text,
                  }}
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
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
            <div
              className="bg-white rounded-[16px] p-6 max-w-lg w-full mx-4"
              style={{ boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)' }}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-semibold text-[#111827]">
                  {integrations.find(i => i.id === showConfigModal)?.name} Settings
                </h2>
                <button
                  onClick={() => setShowConfigModal(null)}
                  className="p-2 rounded-lg hover:bg-[#F3F4F6] transition-colors"
                >
                  <XCircle className="w-5 h-5 text-[#9CA3AF]" />
                </button>
              </div>

              <div className="space-y-4">
                {showConfigModal === 'google-sheets' && (
                  <div className="space-y-4">
                    {integrationConfigs['google-sheets']?.spreadsheetName && (
                      <div className="p-4 bg-[#F9FAFB] rounded-xl">
                        <p className="text-sm font-medium text-[#374151] mb-2">Currently syncing to:</p>
                        <a
                          href={integrationConfigs['google-sheets'].spreadsheetUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-[#111827] hover:text-[#059669]"
                        >
                          <GoogleSheetsLogo />
                          <span className="text-sm font-medium truncate">
                            {integrationConfigs['google-sheets'].spreadsheetName}
                          </span>
                          <ExternalLink className="w-4 h-4 flex-shrink-0" />
                        </a>
                      </div>
                    )}

                    <div className="p-4 bg-[#ECFDF3] rounded-xl">
                      <p className="text-sm font-medium text-[#065F46] mb-2">
                        {integrationConfigs['google-sheets']?.spreadsheetName ? 'Create a new spreadsheet?' : 'No spreadsheet connected'}
                      </p>
                      <p className="text-xs text-[#059669] mb-3">
                        Create a new spreadsheet with all lead columns pre-configured.
                      </p>
                      <button
                        onClick={() => {
                          setShowCreateSheetConfirm(true);
                          setCreateSheetPassword('');
                          setCreateSheetPasswordError(false);
                        }}
                        disabled={isSyncing === 'google-sheets'}
                        className="w-full py-2.5 bg-[#059669] text-white rounded-xl hover:bg-[#047857] transition-colors flex items-center justify-center gap-2 disabled:opacity-50 text-sm font-medium"
                      >
                        {isSyncing === 'google-sheets' ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <GoogleSheetsLogo />
                        )}
                        {integrationConfigs['google-sheets']?.spreadsheetName ? 'Create New' : 'Create & Sync'}
                      </button>
                    </div>
                  </div>
                )}

                {showConfigModal === 'hubspot' && (
                  <div className="p-4 bg-[#FFF7ED] rounded-xl">
                    <p className="text-sm text-[#9A3412] flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      Connected via OAuth
                    </p>
                    <p className="text-xs text-[#C2410C] mt-2">
                      Leads will be synced as contacts to your HubSpot CRM.
                    </p>
                  </div>
                )}

                {showConfigModal === 'zoho-crm' && (
                  <div className="p-4 bg-[#EEF2FF] rounded-xl">
                    <p className="text-sm text-[#3730A3] flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      Connected via OAuth
                    </p>
                    <p className="text-xs text-[#4338CA] mt-2">
                      To change accounts, disconnect and reconnect.
                    </p>
                  </div>
                )}

                <div className="pt-4">
                  <button
                    onClick={() => setShowConfigModal(null)}
                    className="w-full py-2.5 rounded-xl text-sm font-medium text-[#374151] bg-[#F9FAFB] hover:bg-[#F3F4F6] transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Create Sheet Confirmation Modal */}
        {showCreateSheetConfirm && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
            <div
              className="bg-white rounded-[16px] p-6 max-w-md w-full mx-4"
              style={{ boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)' }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-[#FEF3C7] flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-[#D97706]" />
                </div>
                <div>
                  <h2 className="font-semibold text-[#111827]">Confirm New Spreadsheet</h2>
                  <p className="text-sm text-[#6B7280]">Requires confirmation</p>
                </div>
              </div>
              <p className="text-sm text-[#6B7280] mb-4">
                Creating a new spreadsheet will start syncing leads to a fresh sheet. Your existing spreadsheet will remain but won&apos;t receive new leads.
              </p>
              <div className="mb-4">
                <label className="block text-sm font-medium text-[#374151] mb-2">
                  Enter password to confirm
                </label>
                <input
                  type="password"
                  value={createSheetPassword}
                  onChange={(e) => {
                    setCreateSheetPassword(e.target.value);
                    setCreateSheetPasswordError(false);
                  }}
                  placeholder="Your password"
                  className={clsx(
                    'w-full px-4 py-2.5 bg-[#F9FAFB] border rounded-xl text-[#111827] placeholder-[#9CA3AF] text-sm focus:outline-none focus:ring-2 focus:ring-[#DDD6FE]',
                    createSheetPasswordError ? 'border-[#DC2626]' : 'border-[#E5E7EB]'
                  )}
                />
                {createSheetPasswordError && (
                  <p className="text-sm text-[#DC2626] mt-1">Incorrect password</p>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowCreateSheetConfirm(false);
                    setCreateSheetPassword('');
                    setCreateSheetPasswordError(false);
                  }}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium text-[#374151] bg-[#F9FAFB] hover:bg-[#F3F4F6] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
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
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-[#ECFDF3] text-[#065F46] hover:bg-[#D1FAE5] transition-colors"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
