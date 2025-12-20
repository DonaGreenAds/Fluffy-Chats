/**
 * =============================================================================
 * LEAD DETAIL COMPONENT
 * =============================================================================
 *
 * Full lead analysis and action panel - displays all lead information
 * extracted from AI analysis along with the conversation transcript.
 *
 * LAYOUT: Split-screen
 * - Left panel: Lead details, scores, insights, and actions
 * - Right panel: Conversation transcript with translation support
 *
 * KEY FEATURES:
 * - View complete lead analysis with confidence metrics
 * - Read conversation transcript with timestamp parsing
 * - Translate conversation to 15+ languages (via Gemini/OpenAI)
 * - Send lead to connected CRM integrations (HubSpot, Zoho, Sheets)
 * - Send lead via configured webhooks
 * - Mark lead as contacted
 *
 * CONVERSATION FORMATS SUPPORTED:
 * - Format 1: "ASSISTANT @ 2024-01-01T12:00:00Z: message" (current)
 * - Format 2: "[timestamp] User/Assistant: message" (legacy)
 * - Format 3: Direct message text (fallback)
 *
 * SUPPORTED TRANSLATION LANGUAGES:
 * English, Hindi, Spanish, French, German, Portuguese, Arabic, Chinese,
 * Japanese, Korean, Tamil, Telugu, Bengali, Marathi, Gujarati
 *
 * =============================================================================
 */

'use client';

import { useState, useEffect } from 'react';
import { Lead } from '@/types/lead';
import { useLeads } from '@/context/LeadContext';

// Webhook configuration for custom integrations
interface WebhookOption {
  id: string;
  name: string;
  url: string;
  isActive: boolean;
}
import {
  X,
  Phone,
  Mail,
  Building2,
  MapPin,
  Calendar,
  Clock,
  MessageCircle,
  Target,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  User,
  Briefcase,
  IndianRupee,
  HelpCircle,
  XCircle,
  Zap,
  Heart,
  Shield,
  ArrowRight,
  ArrowLeft,
  FileText,
  Copy,
  Languages,
  Loader2,
  ExternalLink,
  UserCheck,
  Send,
  Plug,
  Webhook
} from 'lucide-react';
import clsx from 'clsx';

interface LeadDetailProps {
  lead: Lead;
  onClose: () => void;
}

// Translation is handled by server-side API route

interface IntegrationConfig {
  connected: boolean;
  accessToken?: string;
  refreshToken?: string;
  spreadsheetId?: string;
  apiDomain?: string;
  location?: string;
  liveSync?: boolean;
}

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'hi', name: 'Hindi' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ar', name: 'Arabic' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'ta', name: 'Tamil' },
  { code: 'te', name: 'Telugu' },
  { code: 'bn', name: 'Bengali' },
  { code: 'mr', name: 'Marathi' },
  { code: 'gu', name: 'Gujarati' },
];

export default function LeadDetail({ lead, onClose }: LeadDetailProps) {
  const { markAsContacted: markLeadAsContacted, getLeadById } = useLeads();
  const currentLead = getLeadById(lead.id) || lead;
  const isContacted = currentLead.status === 'contacted';

  const [translatedConversation, setTranslatedConversation] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('hi');
  const [showLanguageSelect, setShowLanguageSelect] = useState(false);

  // Send to CRM state
  const [showSendModal, setShowSendModal] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ success: boolean; message: string } | null>(null);
  const [selectedIntegrations, setSelectedIntegrations] = useState<string[]>([]);

  // Send to Webhook state
  const [showWebhookModal, setShowWebhookModal] = useState(false);
  const [isSendingWebhook, setIsSendingWebhook] = useState(false);
  const [webhookResult, setWebhookResult] = useState<{ success: boolean; message: string } | null>(null);
  const [availableWebhooks, setAvailableWebhooks] = useState<WebhookOption[]>([]);
  const [selectedWebhookIds, setSelectedWebhookIds] = useState<string[]>([]);

  // Available integrations loaded from server
  const [availableIntegrations, setAvailableIntegrations] = useState<{ id: string; name: string; config: IntegrationConfig }[]>([]);

  // Load available webhooks and integrations on mount
  useEffect(() => {
    const loadWebhooks = async () => {
      try {
        const response = await fetch('/api/webhook/config');
        if (response.ok) {
          const data = await response.json();
          if (data.webhooks && data.webhooks.length > 0) {
            setAvailableWebhooks(data.webhooks.filter((w: WebhookOption) => w.url && w.isActive));
            // Pre-select all active webhooks
            setSelectedWebhookIds(data.webhooks.filter((w: WebhookOption) => w.url && w.isActive).map((w: WebhookOption) => w.id));
          } else if (data.url) {
            // Old format - single webhook
            const webhook: WebhookOption = { id: 'default', name: 'Webhook', url: data.url, isActive: true };
            setAvailableWebhooks([webhook]);
            setSelectedWebhookIds(['default']);
          }
        }
      } catch (error) {
        console.error('Failed to load webhooks:', error);
      }
    };

    const loadIntegrations = async () => {
      try {
        const response = await fetch('/api/integrations/tokens');
        if (response.ok) {
          const tokens = await response.json();
          const integrationNames: Record<string, string> = {
            'google-sheets': 'Google Sheets',
            'hubspot': 'HubSpot',
            'zoho-crm': 'Zoho CRM',
          };

          const connected = Object.entries(tokens)
            .filter(([, config]) => (config as IntegrationConfig).connected)
            .map(([id, config]) => ({
              id,
              name: integrationNames[id] || id,
              config: config as IntegrationConfig,
            }));

          setAvailableIntegrations(connected);
        }
      } catch (error) {
        console.error('Failed to load integrations:', error);
      }
    };

    loadWebhooks();
    loadIntegrations();
  }, []);

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'very_positive': return { icon: Heart, color: 'text-green-500' };
      case 'positive': return { icon: TrendingUp, color: 'text-green-400' };
      case 'neutral': return { icon: Target, color: 'text-gray-400' };
      default: return { icon: AlertCircle, color: 'text-red-400' };
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const parseConversation = (text: string) => {
    const messages: { time: string; isUser: boolean; message: string; key: number }[] = [];

    // Split by message headers (USER: or ASSISTANT @)
    const parts = text.split(/(?=^USER:|^ASSISTANT\s*@)/m);

    let messageIndex = 0;
    for (const part of parts) {
      const trimmedPart = part.trim();
      if (!trimmedPart) continue;

      // Check for USER: format
      const userMatch = trimmedPart.match(/^USER:\s*([\s\S]*?)$/i);
      if (userMatch) {
        const message = userMatch[1].trim();
        if (message) {
          messages.push({ time: '', isUser: true, message, key: messageIndex++ });
        }
        continue;
      }

      // Check for ASSISTANT @ timestamp: format
      const assistantMatch = trimmedPart.match(/^ASSISTANT\s*@\s*(\d{4}-\d{2}-\d{2}T[\d:.]+Z?):\s*([\s\S]*?)$/i);
      if (assistantMatch) {
        const [, timestamp, message] = assistantMatch;
        // Convert UTC to IST manually to avoid timezone issues
        const utcDate = new Date(timestamp);
        const istDate = new Date(utcDate.getTime() + (5.5 * 60 * 60 * 1000));
        const hours = istDate.getUTCHours().toString().padStart(2, '0');
        const mins = istDate.getUTCMinutes().toString().padStart(2, '0');
        const time = `${hours}:${mins}`;
        if (message.trim()) {
          messages.push({ time, isUser: false, message: message.trim(), key: messageIndex++ });
        }
        continue;
      }

      // Fallback: check for old format [timestamp] User/Fluffy/Assistant: message
      const format1 = trimmedPart.match(/^\[([^\]]+)\]\s*(User|Fluffy|Assistant):\s*([\s\S]*?)$/i);
      if (format1) {
        const [, time, sender, message] = format1;
        const isUser = sender.toLowerCase() === 'user';
        if (message.trim()) {
          messages.push({ time, isUser, message: message.trim(), key: messageIndex++ });
        }
      }
    }

    return messages;
  };

  const translateConversation = async (langCode: string) => {
    setIsTranslating(true);
    setShowLanguageSelect(false);
    setSelectedLanguage(langCode);

    const targetLang = LANGUAGES.find(l => l.code === langCode)?.name || 'Hindi';

    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversation: lead.conversation,
          targetLanguage: targetLang,
        }),
      });

      const data = await response.json();
      if (data.translatedText) {
        setTranslatedConversation(data.translatedText);
      } else if (data.error) {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Translation failed:', error);
      alert('Translation failed. Please try again.');
    } finally {
      setIsTranslating(false);
    }
  };

  const markAsContacted = () => {
    markLeadAsContacted(lead.id);
  };

  const openWhatsApp = () => {
    if (lead.has_phone) {
      // Remove spaces, dashes, and + from phone number
      const cleanPhone = lead.phone.replace(/[\s\-\+]/g, '');
      // If starts with 91, use as is, otherwise add 91
      const phoneNumber = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`;
      window.open(`https://wa.me/${phoneNumber}`, '_blank');
    }
  };

  const handleSendClick = () => {
    if (availableIntegrations.length === 0) {
      alert('No integrations configured. Please go to Settings > Integrations to connect your CRM or Google Sheets.');
      return;
    }
    // Pre-select all connected integrations
    setSelectedIntegrations(availableIntegrations.map(i => i.id));
    setSendResult(null);
    setShowSendModal(true);
  };

  const handleSendToIntegrations = async () => {
    if (selectedIntegrations.length === 0) {
      alert('Please select at least one integration');
      return;
    }

    setIsSending(true);
    setSendResult(null);

    try {
      // Build tokens object from loaded integrations
      const tokens: Record<string, { accessToken: string; refreshToken?: string; apiDomain?: string; location?: string; spreadsheetId?: string }> = {};
      for (const integrationId of selectedIntegrations) {
        const integration = availableIntegrations.find(i => i.id === integrationId);
        if (integration?.config?.accessToken) {
          tokens[integrationId] = {
            accessToken: integration.config.accessToken,
            refreshToken: integration.config.refreshToken,
            apiDomain: integration.config.apiDomain,
            location: integration.config.location,
            spreadsheetId: integration.config.spreadsheetId,
          };
        }
      }

      const response = await fetch('/api/integrations/sync-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead,
          integrations: selectedIntegrations,
          tokens,
        }),
      });

      const result = await response.json();
      setSendResult({
        success: result.success,
        message: result.message || (result.success ? 'Lead sent successfully!' : 'Failed to send lead'),
      });
    } catch (error) {
      setSendResult({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to send lead',
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleSendToWebhook = async () => {
    if (selectedWebhookIds.length === 0) {
      setWebhookResult({ success: false, message: 'Please select at least one webhook' });
      return;
    }

    setIsSendingWebhook(true);
    setWebhookResult(null);

    try {
      const response = await fetch('/api/webhook/send-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead, webhookIds: selectedWebhookIds }),
      });

      const result = await response.json();
      setWebhookResult({
        success: result.success,
        message: result.message || (result.success ? 'Lead sent to webhook successfully!' : 'Failed to send lead'),
      });
    } catch (error) {
      setWebhookResult({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to send lead to webhook',
      });
    } finally {
      setIsSendingWebhook(false);
    }
  };

  const conversationToDisplay = translatedConversation || lead.conversation;
  const messages = parseConversation(conversationToDisplay);
  const sentimentInfo = getSentimentIcon(lead.sentiment_overall);

  return (
    <div className="flex h-full">
      {/* Left Panel - Lead Details */}
      <div className="w-1/2 border-r border-[var(--border)] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-[var(--border)] bg-[var(--card)]">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-4">
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-[var(--accent)] transition-colors"
                title="Back to Leads"
              >
                <ArrowLeft className="w-5 h-5 text-[var(--muted-foreground)]" />
              </button>
              <div
                className="flex items-center justify-center font-semibold text-base"
                style={{
                  width: '48px',
                  height: '48px',
                  minWidth: '48px',
                  minHeight: '48px',
                  borderRadius: '9999px',
                  flexShrink: 0,
                  aspectRatio: '1 / 1',
                  backgroundColor: ['#FEF3C7', '#EDE9FE', '#D1FAE5', '#FCE7F3', '#DBEAFE', '#FFE4E6'][lead.prospect_name.charCodeAt(0) % 6],
                  color: ['#92400E', '#5B21B6', '#065F46', '#9D174D', '#1E40AF', '#9F1239'][lead.prospect_name.charCodeAt(0) % 6]
                }}
              >
                {lead.prospect_name === 'unknown' || lead.prospect_name === 'Unknown Lead'
                  ? (lead.company_name && lead.company_name !== 'unknown' ? lead.company_name.charAt(0).toUpperCase() : 'L')
                  : lead.prospect_name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold text-[var(--foreground)]">
                    {lead.prospect_name === 'unknown' || lead.prospect_name === 'Unknown Lead'
                      ? (lead.company_name && lead.company_name !== 'unknown' && lead.company_name !== 'Unknown'
                          ? `Lead from ${lead.company_name}`
                          : lead.phone && lead.phone !== 'unknown'
                            ? `Lead ${lead.phone.slice(-4)}`
                            : 'New Lead')
                      : lead.prospect_name}
                  </h2>
                  {isContacted && (
                    <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Contacted
                    </span>
                  )}
                </div>
                <p className="text-[var(--muted-foreground)]">{lead.company_name && lead.company_name !== 'unknown' ? lead.company_name : 'Company not provided'}</p>
                {/* Action Container */}
                <div className="mt-4 p-4 bg-[#F9FAFB] rounded-[14px]">
                  <div className="flex items-center gap-2.5">
                    {/* Primary Action - Mark as Contacted */}
                    <button
                      onClick={markAsContacted}
                      disabled={isContacted}
                      title={isContacted ? 'Already contacted' : 'Mark this lead as contacted'}
                      className={clsx(
                        'inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                        isContacted
                          ? 'bg-[#D1FAE5] text-[#065F46] cursor-default opacity-80'
                          : 'bg-[#ECFDF3] text-[#065F46] hover:bg-[#D1FAE5] hover:shadow-sm active:scale-[0.98] cursor-pointer'
                      )}
                    >
                      <UserCheck className="w-4 h-4" />
                      <span>{isContacted ? 'Contacted' : 'Mark as Contacted'}</span>
                      {isContacted && <CheckCircle2 className="w-3.5 h-3.5" />}
                    </button>

                    {/* Secondary Action - Send to CRM */}
                    <button
                      onClick={handleSendClick}
                      title="Push lead to CRM"
                      className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 bg-[#F5F3FF] text-[#3730A3] hover:bg-[#EDE9FE] hover:shadow-sm active:scale-[0.98] cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Send to CRM</span>
                    </button>

                    {/* Secondary Action - Send to Webhook */}
                    <button
                      onClick={() => {
                        setWebhookResult(null);
                        setShowWebhookModal(true);
                      }}
                      title="Trigger automation"
                      className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 bg-[#ECFEFF] text-[#0F766E] hover:bg-[#CFFAFE] hover:shadow-sm active:scale-[0.98] cursor-pointer"
                    >
                      <Plug className="w-3.5 h-3.5" />
                      <span>Send to Webhook</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Stats - No scoring info */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 bg-[var(--secondary)] rounded-lg">
              <div className="text-lg font-semibold text-[var(--foreground)]">
                {lead.primary_topic}
              </div>
              <div className="text-xs text-[var(--muted-foreground)]">Topic</div>
            </div>
            <div className="text-center p-3 bg-[var(--secondary)] rounded-lg">
              <div className="text-lg font-semibold text-[var(--foreground)]">
                {lead.use_case_category}
              </div>
              <div className="text-xs text-[var(--muted-foreground)]">Use Case</div>
            </div>
            <div className="text-center p-3 bg-[var(--secondary)] rounded-lg">
              <div className="text-lg font-semibold text-[var(--foreground)]">
                {lead.region && lead.region !== 'Unknown' && lead.region !== 'unknown' ? lead.region : '-'}
              </div>
              <div className="text-xs text-[var(--muted-foreground)]">Region</div>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Contact Information */}
          <section>
            <h3 className="text-sm font-semibold text-[var(--muted-foreground)] uppercase tracking-wide mb-3 flex items-center gap-2">
              <User className="w-4 h-4" /> Contact Information
            </h3>
            <div className="bg-[var(--secondary)] rounded-lg p-4 space-y-3">
              {lead.has_phone && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4 text-[var(--muted-foreground)]" />
                    <span>{lead.phone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => copyToClipboard(lead.phone)} className="p-1 hover:bg-[var(--accent)] rounded" title="Copy">
                      <Copy className="w-4 h-4 text-[var(--muted-foreground)]" />
                    </button>
                    <button onClick={openWhatsApp} className="p-1 hover:bg-[var(--accent)] rounded" title="Open WhatsApp">
                      <ExternalLink className="w-4 h-4 text-green-500" />
                    </button>
                  </div>
                </div>
              )}
              {lead.has_email && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Mail className="w-4 h-4 text-[var(--muted-foreground)]" />
                    <span>{lead.email}</span>
                  </div>
                  <button onClick={() => copyToClipboard(lead.email)} className="p-1 hover:bg-[var(--accent)] rounded">
                    <Copy className="w-4 h-4 text-[var(--muted-foreground)]" />
                  </button>
                </div>
              )}
              {lead.has_company && lead.company_name && lead.company_name !== 'unknown' && (
                <div className="flex items-center gap-3">
                  <Building2 className="w-4 h-4 text-[var(--muted-foreground)]" />
                  <span>{lead.company_name}</span>
                </div>
              )}
              {lead.region && lead.region !== 'Unknown' && lead.region !== 'unknown' && (
                <div className="flex items-center gap-3">
                  <MapPin className="w-4 h-4 text-[var(--muted-foreground)]" />
                  <span>{lead.region}</span>
                </div>
              )}
            </div>
          </section>

          {/* Conversation Summary */}
          <section>
            <h3 className="text-sm font-semibold text-[var(--muted-foreground)] uppercase tracking-wide mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4" /> Conversation Summary
            </h3>
            <div className="bg-[var(--secondary)] rounded-lg p-4">
              <p className="text-[var(--foreground)] leading-relaxed">{lead.conversation_summary}</p>
            </div>
          </section>

          {/* Timeline Points */}
          {lead.conversation_timeline_points && lead.conversation_timeline_points.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold text-[var(--muted-foreground)] uppercase tracking-wide mb-3 flex items-center gap-2">
                <Zap className="w-4 h-4" /> Key Timeline Points
              </h3>
              <div className="bg-[var(--secondary)] rounded-lg p-4">
                <ol className="space-y-2">
                  {lead.conversation_timeline_points.map((point, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full bg-[var(--primary)] text-white text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                        {index + 1}
                      </span>
                      <span className="text-[var(--foreground)]">{point}</span>
                    </li>
                  ))}
                </ol>
                {lead.timeline_notes && (
                  <div className="mt-3 pt-3 border-t border-[var(--border)]">
                    <label className="text-xs text-[var(--muted-foreground)]">Timeline Notes</label>
                    <p className="text-[var(--foreground)] text-sm mt-1">{lead.timeline_notes}</p>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Lead Intelligence */}
          <section>
            <h3 className="text-sm font-semibold text-[var(--muted-foreground)] uppercase tracking-wide mb-3 flex items-center gap-2">
              <Target className="w-4 h-4" /> Lead Intelligence
            </h3>
            <div className="bg-[var(--secondary)] rounded-lg p-4 space-y-4">
              {lead.secondary_topics.length > 0 && (
                <div>
                  <label className="text-xs text-[var(--muted-foreground)]">Topics Discussed</label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className="inline-flex items-center px-3 py-1.5 bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-full border border-indigo-200">
                      {lead.primary_topic}
                    </span>
                    {lead.secondary_topics.map((topic, index) => (
                      <span key={index} className="inline-flex items-center px-3 py-1.5 bg-violet-50 text-violet-700 text-xs font-semibold rounded-full border border-violet-200">
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <label className="text-xs text-[var(--muted-foreground)]">Need Summary</label>
                <p className="text-[var(--foreground)]">{lead.need_summary}</p>
              </div>
            </div>
          </section>

          {/* Psychological Analysis */}
          <section>
            <h3 className="text-sm font-semibold text-[var(--muted-foreground)] uppercase tracking-wide mb-3 flex items-center gap-2">
              <Heart className="w-4 h-4" /> Conversation Insights
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[var(--secondary)] rounded-lg p-4">
                <div className="flex items-center gap-2 mb-1">
                  <sentimentInfo.icon className={clsx('w-4 h-4', sentimentInfo.color)} />
                  <label className="text-xs text-[var(--muted-foreground)]">Sentiment</label>
                </div>
                <p className="font-medium capitalize">{lead.sentiment_overall.replace('_', ' ')}</p>
              </div>
              <div className="bg-[var(--secondary)] rounded-lg p-4">
                <label className="text-xs text-[var(--muted-foreground)]">Emotional Intensity</label>
                <p className="font-medium capitalize">{lead.emotional_intensity}</p>
              </div>
              <div className="bg-[var(--secondary)] rounded-lg p-4">
                <label className="text-xs text-[var(--muted-foreground)]">Motivation</label>
                <p className="font-medium">{lead.motivation_type && lead.motivation_type !== 'Unknown' && lead.motivation_type !== 'unknown' ? lead.motivation_type.replace(/_/g, ' ') : '-'}</p>
              </div>
              <div className="bg-[var(--secondary)] rounded-lg p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Shield className="w-4 h-4 text-[var(--muted-foreground)]" />
                  <label className="text-xs text-[var(--muted-foreground)]">Trust Level</label>
                </div>
                <p className="font-medium capitalize">{lead.trust_level}</p>
              </div>
            </div>
          </section>

          {/* Sales Actions */}
          <section>
            <h3 className="text-sm font-semibold text-[var(--muted-foreground)] uppercase tracking-wide mb-3 flex items-center gap-2">
              <ArrowRight className="w-4 h-4" /> Recommended Actions
            </h3>
            <div className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-lg p-4 space-y-3">
              <div>
                <label className="text-xs text-[var(--muted-foreground)]">Next Action</label>
                <p className="font-medium text-[var(--foreground)]">{lead.next_action}</p>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-xs text-[var(--muted-foreground)]">Route To</label>
                  <p className="font-medium text-[var(--foreground)]">{lead.recommended_routing}</p>
                </div>
                {lead.needs_immediate_followup && (
                  <span className="px-3 py-1.5 bg-red-100 text-red-700 text-xs font-semibold rounded-full flex items-center gap-1.5 border border-red-200 shadow-sm">
                    <AlertCircle className="w-3.5 h-3.5" /> Immediate Follow-up
                  </span>
                )}
              </div>
            </div>
          </section>

          {/* Questions & Objections */}
          {(lead.key_questions.length > 0 || lead.main_objections.length > 0) && (
            <section>
              <h3 className="text-sm font-semibold text-[var(--muted-foreground)] uppercase tracking-wide mb-3 flex items-center gap-2">
                <HelpCircle className="w-4 h-4" /> Questions & Objections
              </h3>
              <div className="space-y-3">
                {lead.key_questions.length > 0 && (
                  <div className="bg-[var(--secondary)] rounded-lg p-4">
                    <label className="text-xs text-[var(--muted-foreground)] flex items-center gap-1 mb-2">
                      <HelpCircle className="w-3 h-3" /> Key Questions Asked
                    </label>
                    <ul className="space-y-1">
                      {lead.key_questions.map((q, i) => (
                        <li key={i} className="text-[var(--foreground)]">• {q}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {lead.main_objections.length > 0 && (
                  <div className="bg-red-50 border border-red-300 rounded-lg p-4">
                    <label className="text-xs text-red-600 flex items-center gap-1 mb-2">
                      <XCircle className="w-3 h-3" /> Objections Raised
                    </label>
                    <ul className="space-y-2">
                      {lead.main_objections.map((o, i) => (
                        <li key={i} className="text-gray-800 flex items-start gap-2">
                          <span className="text-red-600 mt-0.5">•</span>
                          <span>{o}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Info Shared by Assistant */}
          {lead.info_shared_by_assistant && lead.info_shared_by_assistant.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold text-[var(--muted-foreground)] uppercase tracking-wide mb-3 flex items-center gap-2">
                <MessageCircle className="w-4 h-4" /> Info Shared by Fluffy
              </h3>
              <div className="bg-[var(--secondary)] rounded-lg p-4">
                <ul className="space-y-1">
                  {lead.info_shared_by_assistant.map((info, i) => (
                    <li key={i} className="text-[var(--foreground)]">• {info}</li>
                  ))}
                </ul>
              </div>
            </section>
          )}

          {/* Open Loops / Commitments */}
          {lead.open_loops_or_commitments && lead.open_loops_or_commitments.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold text-[var(--muted-foreground)] uppercase tracking-wide mb-3 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" /> Open Loops & Commitments
              </h3>
              <div className="bg-orange-50 border border-orange-300 rounded-lg p-4">
                <ul className="space-y-2">
                  {lead.open_loops_or_commitments.map((item, i) => (
                    <li key={i} className="text-gray-800 flex items-start gap-2">
                      <span className="text-orange-600 mt-0.5">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )}

          {/* Business Details */}
          <section>
            <h3 className="text-sm font-semibold text-[var(--muted-foreground)] uppercase tracking-wide mb-3 flex items-center gap-2">
              <Briefcase className="w-4 h-4" /> Business Details
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[var(--secondary)] rounded-lg p-4">
                <div className="flex items-center gap-2 mb-1">
                  <IndianRupee className="w-4 h-4 text-[var(--muted-foreground)]" />
                  <label className="text-xs text-[var(--muted-foreground)]">Budget</label>
                </div>
                <p className="font-medium">{lead.budget_bucket_inr && lead.budget_bucket_inr !== 'unknown' && lead.budget_bucket_inr !== 'Unknown' ? lead.budget_bucket_inr : 'Not specified'}</p>
              </div>
              <div className="bg-[var(--secondary)] rounded-lg p-4">
                <label className="text-xs text-[var(--muted-foreground)]">Estimated Scale</label>
                <p className="font-medium">{lead.estimated_scale && lead.estimated_scale !== 'unknown' && lead.estimated_scale !== 'Unknown' ? lead.estimated_scale : 'Not specified'}</p>
              </div>
              <div className="bg-[var(--secondary)] rounded-lg p-4">
                <label className="text-xs text-[var(--muted-foreground)]">Account Type</label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {lead.is_enterprise && (
                    <span className="inline-flex items-center px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-semibold rounded-full border border-blue-200">
                      Enterprise
                    </span>
                  )}
                  {lead.is_partner && (
                    <span className="inline-flex items-center px-3 py-1.5 bg-purple-50 text-purple-700 text-xs font-semibold rounded-full border border-purple-200">
                      Partner
                    </span>
                  )}
                  {!lead.is_enterprise && !lead.is_partner && (
                    <span className="inline-flex items-center px-3 py-1.5 bg-slate-50 text-slate-700 text-xs font-semibold rounded-full border border-slate-200">
                      SMB
                    </span>
                  )}
                </div>
              </div>
              {lead.competitors_mentioned.length > 0 && (
                <div className="bg-[var(--secondary)] rounded-lg p-4">
                  <label className="text-xs text-[var(--muted-foreground)]">Competitors Mentioned</label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {lead.competitors_mentioned.map((comp, i) => (
                      <span key={i} className="inline-flex items-center px-3 py-1.5 bg-orange-50 text-orange-700 text-xs font-semibold rounded-full border border-orange-200">
                        {comp}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Conversation Metadata */}
          <section>
            <h3 className="text-sm font-semibold text-[var(--muted-foreground)] uppercase tracking-wide mb-3 flex items-center gap-2">
              <MessageCircle className="w-4 h-4" /> Conversation Metadata
            </h3>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-[var(--secondary)] rounded-lg p-4 text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Calendar className="w-4 h-4 text-[var(--muted-foreground)]" />
                </div>
                <p className="font-medium">
                  {(() => {
                    // Handle YYYY-MM-DD format without timezone conversion
                    const dateStr = lead.conversation_date;
                    if (!dateStr) return 'Unknown';

                    // If it's YYYY-MM-DD format, parse manually to avoid timezone issues
                    const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
                    if (match) {
                      const [, year, month, day] = match;
                      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                      return `${day} ${monthNames[parseInt(month, 10) - 1]} ${year}`;
                    }

                    // Fallback for other formats
                    return dateStr;
                  })()}
                </p>
                <p className="text-xs text-[var(--muted-foreground)]">{lead.start_time_ist} - {lead.end_time_ist}</p>
              </div>
              <div className="bg-[var(--secondary)] rounded-lg p-4 text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Clock className="w-4 h-4 text-[var(--muted-foreground)]" />
                </div>
                <p className="font-medium">
                  {lead.duration_minutes > 0
                    ? `${lead.duration_minutes} min ${lead.duration_seconds ? `${lead.duration_seconds}s` : ''}`
                    : (lead.duration_seconds ?? 0) > 0
                      ? `${lead.duration_seconds}s`
                      : '< 1 min'}
                </p>
                <p className="text-xs text-[var(--muted-foreground)]">Duration</p>
              </div>
              <div className="bg-[var(--secondary)] rounded-lg p-4 text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <MessageCircle className="w-4 h-4 text-[var(--muted-foreground)]" />
                </div>
                <p className="font-medium">{lead.total_messages}</p>
                <p className="text-xs text-[var(--muted-foreground)]">{lead.user_messages} user / {lead.assistant_messages} assistant</p>
              </div>
            </div>
            {/* Additional Metadata Row */}
            <div className="grid grid-cols-2 gap-3 mt-3">
              {lead.engagement_rate !== undefined && lead.engagement_rate > 0 && (
                <div className="bg-[var(--secondary)] rounded-lg p-4 text-center">
                  <p className="font-medium">{lead.engagement_rate}%</p>
                  <p className="text-xs text-[var(--muted-foreground)]">Engagement Rate</p>
                </div>
              )}
              {lead.session_id && (
                <div className="bg-[var(--secondary)] rounded-lg p-4 text-center">
                  <p className="font-medium text-xs truncate" title={lead.session_id}>{lead.session_id}</p>
                  <p className="text-xs text-[var(--muted-foreground)]">Session ID</p>
                </div>
              )}
            </div>
          </section>

          {/* Data Quality */}
          <section>
            <h3 className="text-sm font-semibold text-[var(--muted-foreground)] uppercase tracking-wide mb-3 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> Data Quality
            </h3>
            <div className="bg-[var(--secondary)] rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm">Completeness</span>
                <span className={clsx('font-medium', lead.completeness >= 80 ? 'text-green-500' : lead.completeness >= 50 ? 'text-amber-500' : 'text-red-500')}>
                  {lead.completeness}%
                </span>
              </div>
              <div className="w-full h-2 bg-[var(--muted)] rounded-full overflow-hidden">
                <div
                  className={clsx(
                    'h-full rounded-full',
                    lead.completeness >= 80 ? 'bg-green-500' : lead.completeness >= 50 ? 'bg-amber-500' : 'bg-red-500'
                  )}
                  style={{ width: `${lead.completeness}%` }}
                />
              </div>
              {lead.missingFields.length > 0 && (
                <div className="mt-3">
                  <label className="text-xs text-[var(--muted-foreground)]">Missing Fields</label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {lead.missingFields.map((field, i) => (
                      <span key={i} className="inline-flex items-center px-3 py-1.5 bg-red-50 text-red-700 text-xs font-semibold rounded-full border border-red-200">
                        {field}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      {/* Right Panel - Conversation Transcript */}
      <div className="w-1/2 flex flex-col overflow-hidden bg-[var(--secondary)]">
        {/* Header with Translate and WhatsApp buttons */}
        <div className="p-4 border-b border-[var(--border)] bg-[var(--card)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#25D366] flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-[var(--foreground)]">WhatsApp Conversation</h3>
                <p className="text-sm text-[var(--muted-foreground)]">
                  {lead.total_messages} messages • {lead.duration_minutes > 0
                    ? `${lead.duration_minutes} min`
                    : (lead.duration_seconds ?? 0) > 0
                      ? `${lead.duration_seconds}s`
                      : '< 1 min'}
                  {translatedConversation && ' • Translated'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Translate Button */}
              <div className="relative">
                <button
                  onClick={() => setShowLanguageSelect(!showLanguageSelect)}
                  disabled={isTranslating}
                  className="flex items-center gap-2 px-3 py-2 bg-[var(--secondary)] border border-[var(--border)] rounded-lg text-sm hover:bg-[var(--accent)] transition-colors disabled:opacity-50"
                >
                  {isTranslating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Languages className="w-4 h-4" />
                  )}
                  <span>Translate</span>
                </button>

                {showLanguageSelect && (
                  <div className="absolute right-0 top-full mt-2 w-48 bg-[var(--card)] border border-[var(--border)] rounded-lg shadow-lg z-10 max-h-64 overflow-y-auto">
                    {LANGUAGES.map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => translateConversation(lang.code)}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-[var(--accent)] transition-colors first:rounded-t-lg last:rounded-b-lg"
                      >
                        {lang.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Reset Translation */}
              {translatedConversation && (
                <button
                  onClick={() => setTranslatedConversation(null)}
                  className="px-3 py-2 bg-[var(--secondary)] border border-[var(--border)] rounded-lg text-sm hover:bg-[var(--accent)] transition-colors"
                >
                  Original
                </button>
              )}

              {/* WhatsApp Button */}
              {lead.has_phone && (
                <button
                  onClick={openWhatsApp}
                  className="flex items-center gap-2 px-3 py-2 bg-[#25D366] text-white rounded-lg text-sm hover:bg-[#1da851] transition-colors"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Chat on WhatsApp</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {isTranslating ? (
            <div className="flex flex-col items-center justify-center h-full text-[var(--muted-foreground)]">
              <Loader2 className="w-8 h-8 animate-spin mb-4" />
              <p>Translating conversation...</p>
            </div>
          ) : (
            messages.map((msg) => msg && (
              <div
                key={msg.key}
                className={clsx(
                  'flex flex-col',
                  msg.isUser ? 'items-start' : 'items-end'
                )}
              >
                <div
                  className={clsx(
                    'max-w-[80%] px-4 py-2 rounded-2xl',
                    msg.isUser
                      ? 'bg-white border border-[var(--border)] rounded-bl-sm'
                      : 'bg-[#dcf8c6] rounded-br-sm'
                  )}
                >
                  <p className={clsx(
                    'text-sm',
                    msg.isUser ? 'text-[var(--foreground)]' : 'text-gray-800'
                  )}>
                    {msg.message}
                  </p>
                </div>
                <span className="text-xs text-[var(--muted-foreground)] mt-1 px-1">
                  {msg.time} • {msg.isUser ? 'Customer' : 'Fluffy'}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Send to CRM Modal */}
      {showSendModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[var(--card)] rounded-xl p-6 max-w-md w-full mx-4 border border-[var(--border)] shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <Send className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="font-semibold text-[var(--foreground)]">Send Lead to CRM</h2>
                <p className="text-sm text-[var(--muted-foreground)]">
                  Select integrations to sync this lead
                </p>
              </div>
            </div>

            {/* Integration Selection */}
            <div className="space-y-2 mb-6">
              {availableIntegrations.map((integration) => (
                <label
                  key={integration.id}
                  className={clsx(
                    'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                    selectedIntegrations.includes(integration.id)
                      ? 'bg-indigo-50 border-indigo-300'
                      : 'bg-[var(--secondary)] border-[var(--border)] hover:border-indigo-300'
                  )}
                >
                  <input
                    type="checkbox"
                    checked={selectedIntegrations.includes(integration.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedIntegrations(prev => [...prev, integration.id]);
                      } else {
                        setSelectedIntegrations(prev => prev.filter(id => id !== integration.id));
                      }
                    }}
                    className="w-4 h-4 rounded border-[var(--border)] text-indigo-600 focus:ring-indigo-500"
                  />
                  <div className="flex items-center gap-2">
                    <Plug className="w-4 h-4 text-[var(--muted-foreground)]" />
                    <span className="font-medium text-[var(--foreground)]">{integration.name}</span>
                  </div>
                  {integration.config.liveSync && (
                    <span className="ml-auto px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full">
                      Live Sync On
                    </span>
                  )}
                </label>
              ))}
            </div>

            {/* Result Message */}
            {sendResult && (
              <div className={clsx(
                'p-3 rounded-lg mb-4 flex items-center gap-2',
                sendResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
              )}>
                {sendResult.success ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <XCircle className="w-4 h-4" />
                )}
                <span className="text-sm">{sendResult.message}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowSendModal(false);
                  setSendResult(null);
                }}
                className="flex-1 py-2.5 border border-[var(--border)] text-[var(--foreground)] rounded-lg hover:bg-[var(--accent)] transition-colors"
              >
                {sendResult ? 'Close' : 'Cancel'}
              </button>
              {!sendResult && (
                <button
                  onClick={handleSendToIntegrations}
                  disabled={isSending || selectedIntegrations.length === 0}
                  className="flex-1 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Send Now
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Send to Webhook Modal */}
      {showWebhookModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[var(--card)] rounded-xl p-6 max-w-md w-full mx-4 border border-[var(--border)] shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                <Webhook className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="font-semibold text-[var(--foreground)]">Send Lead to Webhook</h2>
                <p className="text-sm text-[var(--muted-foreground)]">
                  Select webhooks to send this lead to
                </p>
              </div>
            </div>

            <div className="mb-4 p-3 bg-[var(--secondary)] rounded-lg">
              <p className="text-sm text-[var(--foreground)]">
                <strong>Lead:</strong> {lead.prospect_name !== 'unknown' ? lead.prospect_name : lead.company_name || 'Unknown'}
              </p>
            </div>

            {/* Webhook Selection */}
            {!webhookResult && (
              <div className="mb-4">
                {availableWebhooks.length > 0 ? (
                  <div className="space-y-2">
                    {availableWebhooks.map((webhook) => (
                      <label
                        key={webhook.id}
                        className={clsx(
                          'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all',
                          selectedWebhookIds.includes(webhook.id)
                            ? 'border-purple-500 bg-purple-50'
                            : 'border-[var(--border)] hover:border-purple-300'
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={selectedWebhookIds.includes(webhook.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedWebhookIds(prev => [...prev, webhook.id]);
                            } else {
                              setSelectedWebhookIds(prev => prev.filter(id => id !== webhook.id));
                            }
                          }}
                          className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-[var(--foreground)]">{webhook.name}</p>
                          <p className="text-xs text-[var(--muted-foreground)] truncate">{webhook.url}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-center text-[var(--muted-foreground)]">
                    <p className="text-sm">No active webhooks configured.</p>
                    <p className="text-xs mt-1">Configure webhooks in the Integrations page.</p>
                  </div>
                )}
              </div>
            )}

            {/* Result Message */}
            {webhookResult && (
              <div className={clsx(
                'p-3 rounded-lg mb-4 flex items-center gap-2',
                webhookResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
              )}>
                {webhookResult.success ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <XCircle className="w-4 h-4" />
                )}
                <span className="text-sm">{webhookResult.message}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowWebhookModal(false);
                  setWebhookResult(null);
                }}
                className="flex-1 py-2.5 border border-[var(--border)] text-[var(--foreground)] rounded-lg hover:bg-[var(--accent)] transition-colors"
              >
                {webhookResult ? 'Close' : 'Cancel'}
              </button>
              {!webhookResult && (
                <button
                  onClick={handleSendToWebhook}
                  disabled={isSendingWebhook || selectedWebhookIds.length === 0}
                  className="flex-1 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSendingWebhook ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Webhook className="w-4 h-4" />
                      Send to {selectedWebhookIds.length} Webhook{selectedWebhookIds.length !== 1 ? 's' : ''}
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
