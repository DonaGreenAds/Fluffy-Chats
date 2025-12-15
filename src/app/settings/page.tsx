'use client';

import { useState, useEffect } from 'react';
import {
  User,
  Building2,
  Download,
  Shield,
  Users,
  AlertTriangle,
  Save,
  RotateCcw,
  CheckCircle2,
  Mail,
  Smartphone,
  Globe,
  Eye,
  EyeOff,
  Key,
  Monitor,
  LogOut,
  Trash2,
  Copy,
  RefreshCw,
  UserPlus,
  Clock,
  ChevronRight,
  ArrowRightLeft,
  XCircle,
  X,
  Loader2,
  Lock,
} from 'lucide-react';
import { useAuth, hashPassword } from '@/context/AuthContext';
import { useLeads } from '@/context/LeadContext';
import { UserRole, UserPreferences, DEFAULT_USER_PREFERENCES, Session as SessionType } from '@/types/auth';
import { hasPermission, getAccessibleSettingsTabs, SettingsTab, ROLE_DISPLAY } from '@/lib/permissions';
import RoleBadge, { RoleSelector, RoleCard } from '@/components/RoleBadge';
import PermissionGate, { usePermission, useIsOwner } from '@/components/PermissionGate';

const SETTINGS_STORAGE_KEY = 'fluffychats_settings';
const SESSIONS_STORAGE_KEY = 'fluffychats_sessions';
const TEAM_STORAGE_KEY = 'fluffychats_team_members';
const INVITES_STORAGE_KEY = 'fluffychats_invitations';

// Tab configuration
const TAB_CONFIG: {
  id: SettingsTab;
  label: string;
  icon: React.ElementType;
  description: string;
}[] = [
  { id: 'profile', label: 'Profile', icon: User, description: 'Personal information' },
  { id: 'organization', label: 'Organization', icon: Building2, description: 'Company settings and branding' },
  { id: 'export', label: 'Export', icon: Download, description: 'Data export options' },
  { id: 'security', label: 'Security', icon: Shield, description: 'Password and 2FA settings' },
  { id: 'team', label: 'Team', icon: Users, description: 'Manage team members' },
  { id: 'danger', label: 'Danger Zone', icon: AlertTriangle, description: 'Destructive actions' },
];

interface ProfileSettings {
  name: string;
  email: string;
  phone: string;
  title: string;
}

interface OrganizationSettings {
  name: string;
  industry: string;
  size: string;
  timezone: string;
}


interface ExportSettings {
  // Filters
  leadFilter: 'all' | 'hot' | 'warm' | 'cold';
  intentFilter: 'all' | 'high' | 'medium' | 'low';
  stageFilter: 'all' | 'awareness' | 'consideration' | 'decision';
  dateRange: 'all' | 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom';
  customDateFrom?: string;
  customDateTo?: string;
  // Include options
  includeContactInfo: boolean;
  includeConversations: boolean;
  includeScores: boolean;
  includeTimeline: boolean;
  includeNotes: boolean;
  includeAssignee: boolean;
  includeTags: boolean;
  includeCustomFields: boolean;
  // Format
  exportFormat: 'csv' | 'json' | 'excel';
}

interface SecuritySettings {
  twoFactorEnabled: boolean;
  sessionTimeout: string;
  apiKeyLastRotated: string;
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: 'active' | 'invited' | 'suspended';
  joinedAt: string;
  lastActive?: string;
}

interface PendingInvite {
  id: string;
  email: string;
  role: UserRole;
  sentAt: string;
  expiresAt: string;
}

export default function SettingsPage() {
  const { user, updateUser } = useAuth();
  const { leads } = useLeads();
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');

  // Get accessible tabs for current user
  const accessibleTabs = user ? getAccessibleSettingsTabs(user.role) : [];
  const visibleTabs = TAB_CONFIG.filter(tab => accessibleTabs.includes(tab.id));

  // Profile Settings
  const [profile, setProfile] = useState<ProfileSettings>({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    title: user?.title || '',
  });

  // Organization Settings
  const [organization, setOrganization] = useState<OrganizationSettings>({
    name: 'Telinfy',
    industry: 'Technology',
    size: 'small',
    timezone: 'Asia/Kolkata',
  });

  // Export Settings
  const [exportSettings, setExportSettings] = useState<ExportSettings>({
    leadFilter: 'all',
    intentFilter: 'all',
    stageFilter: 'all',
    dateRange: 'all',
    includeContactInfo: true,
    includeConversations: true,
    includeScores: true,
    includeTimeline: false,
    includeNotes: true,
    includeAssignee: true,
    includeTags: true,
    includeCustomFields: false,
    exportFormat: 'csv',
  });

  // Security Settings
  const [security, setSecurity] = useState<SecuritySettings>({
    twoFactorEnabled: false,
    sessionTimeout: '30',
    apiKeyLastRotated: new Date().toISOString(),
  });
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [sessions, setSessions] = useState<SessionType[]>([]);

  // Team Settings
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('viewer');

  // Danger Zone
  const [showDeleteDataModal, setShowDeleteDataModal] = useState(false);
  const [showDeleteOrgModal, setShowDeleteOrgModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [transferEmail, setTransferEmail] = useState('');
  const [showDangerPasswordModal, setShowDangerPasswordModal] = useState(false);
  const [dangerPassword, setDangerPassword] = useState('');
  const [dangerPasswordError, setDangerPasswordError] = useState('');
  const [pendingDangerAction, setPendingDangerAction] = useState<'deleteData' | 'deleteOrg' | 'transfer' | null>(null);
  const [dangerZoneUnlocked, setDangerZoneUnlocked] = useState(false);

  // Modals
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '' });
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpError, setOtpError] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');

  // Permission hooks
  const isOwner = useIsOwner();
  const canEditOrg = usePermission('settings:organization:edit');
  const canManageTeam = usePermission('settings:team:invite');
  const canAccessDanger = usePermission('settings:danger:view');

  // Load settings from localStorage
  useEffect(() => {
    const loadSettings = () => {
      const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.profile) setProfile(p => ({ ...p, ...parsed.profile }));
          if (parsed.organization) setOrganization(parsed.organization);
          if (parsed.exportSettings) setExportSettings(parsed.exportSettings);
          if (parsed.security) setSecurity(parsed.security);
          if (parsed.apiKey) setApiKey(parsed.apiKey);
        } catch (e) {
          console.error('Failed to parse settings:', e);
        }
      }

      // Generate API key if not exists
      if (!apiKey) {
        setApiKey(generateApiKey());
      }

      // Load mock team data
      loadTeamData();

      // Load sessions
      loadSessions();
    };

    loadSettings();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadTeamData = () => {
    // Load team members from localStorage
    const storedTeam = localStorage.getItem(TEAM_STORAGE_KEY);
    if (storedTeam) {
      try {
        setTeamMembers(JSON.parse(storedTeam));
      } catch {
        initializeTeamData();
      }
    } else {
      initializeTeamData();
    }

    // Load pending invites from localStorage
    const storedInvites = localStorage.getItem(INVITES_STORAGE_KEY);
    if (storedInvites) {
      try {
        const invites = JSON.parse(storedInvites);
        // Filter out expired invitations
        const validInvites = invites.filter((inv: PendingInvite) =>
          new Date(inv.expiresAt) > new Date()
        );
        setPendingInvites(validInvites);
        // Update storage with valid invites only
        if (validInvites.length !== invites.length) {
          localStorage.setItem(INVITES_STORAGE_KEY, JSON.stringify(validInvites));
        }
      } catch {
        setPendingInvites([]);
      }
    } else {
      setPendingInvites([]);
    }
  };

  const initializeTeamData = () => {
    // Initialize with current user as owner
    const initialTeam = [
      {
        id: user?.id || 'owner-1',
        name: user?.name || 'Owner User',
        email: user?.email || 'owner@telinfy.com',
        role: user?.role || 'owner' as UserRole,
        status: 'active' as const,
        joinedAt: new Date().toISOString(),
        lastActive: new Date().toISOString(),
      },
    ];
    setTeamMembers(initialTeam);
    localStorage.setItem(TEAM_STORAGE_KEY, JSON.stringify(initialTeam));
  };

  const loadSessions = () => {
    const savedSessions = localStorage.getItem(SESSIONS_STORAGE_KEY);
    if (savedSessions) {
      try {
        setSessions(JSON.parse(savedSessions));
      } catch {
        initializeSessions();
      }
    } else {
      initializeSessions();
    }
  };

  const initializeSessions = () => {
    const currentSession: SessionType = {
      id: crypto.randomUUID(),
      userId: user?.id || '',
      device: getDeviceType(),
      browser: getBrowserName(),
      os: getOSName(),
      location: 'Detecting...',
      ip: '',
      lastActive: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      current: true,
    };

    fetch('https://ipapi.co/json/')
      .then(res => res.json())
      .then(data => {
        currentSession.location = `${data.city}, ${data.country_name}`;
        currentSession.ip = data.ip;
        setSessions([currentSession]);
        localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify([currentSession]));
      })
      .catch(() => {
        currentSession.location = 'Unknown Location';
        setSessions([currentSession]);
        localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify([currentSession]));
      });
  };

  const getDeviceType = (): string => {
    const ua = navigator.userAgent;
    if (/tablet|ipad|playbook|silk/i.test(ua)) return 'Tablet';
    if (/Mobile|iP(hone|od)|Android|BlackBerry|IEMobile/i.test(ua)) return 'Mobile';
    return 'Desktop';
  };

  const getBrowserName = (): string => {
    const ua = navigator.userAgent;
    if (ua.includes('Chrome') && !ua.includes('Edg')) return 'Chrome';
    if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Edg')) return 'Edge';
    return 'Unknown';
  };

  const getOSName = (): string => {
    const ua = navigator.userAgent;
    if (ua.includes('Mac OS')) return 'macOS';
    if (ua.includes('Windows')) return 'Windows';
    if (ua.includes('Linux')) return 'Linux';
    if (ua.includes('Android')) return 'Android';
    if (ua.includes('iOS') || ua.includes('iPhone')) return 'iOS';
    return 'Unknown';
  };

  const generateApiKey = (): string => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    const key = Array.from({ length: 32 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    return `fck_live_${key}`;
  };

  // Save all settings
  const handleSave = async () => {
    setSaving(true);
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API call

    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({
      profile,
      organization,
      exportSettings,
      security,
      apiKey,
    }));

    // Update user name/email in auth context if changed
    if (profile.name !== user?.name || profile.email !== user?.email) {
      updateUser({
        name: profile.name,
        email: profile.email,
      });
    }

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  // Reset to defaults
  const handleReset = () => {
    if (confirm('Are you sure you want to reset all settings to defaults?')) {
      setProfile({
        name: user?.name || '',
        email: user?.email || '',
        phone: '',
        title: '',
      });
      handleSave();
    }
  };

  // Get filtered leads count for export
  const getFilteredLeads = () => {
    let filteredLeads = [...leads];

    // Apply lead filter (hot/warm/cold)
    if (exportSettings.leadFilter !== 'all') {
      if (exportSettings.leadFilter === 'hot') {
        filteredLeads = filteredLeads.filter(l => l.urgency === 'critical' || l.urgency === 'high');
      } else if (exportSettings.leadFilter === 'warm') {
        filteredLeads = filteredLeads.filter(l => l.urgency === 'medium');
      } else if (exportSettings.leadFilter === 'cold') {
        filteredLeads = filteredLeads.filter(l => l.urgency === 'low' || !l.urgency);
      }
    }

    // Apply intent filter
    if (exportSettings.intentFilter !== 'all') {
      filteredLeads = filteredLeads.filter(l => l.intent_level === exportSettings.intentFilter);
    }

    // Apply stage filter
    if (exportSettings.stageFilter !== 'all') {
      filteredLeads = filteredLeads.filter(l => l.buyer_stage === exportSettings.stageFilter);
    }

    // Apply date range filter
    if (exportSettings.dateRange !== 'all') {
      const now = new Date();
      let startDate: Date | null = null;

      switch (exportSettings.dateRange) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'quarter':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        case 'custom':
          if (exportSettings.customDateFrom) {
            startDate = new Date(exportSettings.customDateFrom);
          }
          break;
      }

      if (startDate) {
        filteredLeads = filteredLeads.filter(l => {
          const leadDate = new Date(l.conversation_date || l.created_at || '');
          return leadDate >= startDate!;
        });
      }

      if (exportSettings.dateRange === 'custom' && exportSettings.customDateTo) {
        const endDate = new Date(exportSettings.customDateTo);
        endDate.setHours(23, 59, 59, 999);
        filteredLeads = filteredLeads.filter(l => {
          const leadDate = new Date(l.conversation_date || l.created_at || '');
          return leadDate <= endDate;
        });
      }
    }

    return filteredLeads;
  };

  const filteredLeadsCount = getFilteredLeads().length;

  // Export leads
  const handleExport = () => {
    const filteredLeads = getFilteredLeads();

    if (filteredLeads.length === 0) {
      alert('No leads match your filter criteria');
      return;
    }

    const exportData = filteredLeads.map(lead => {
      const base: Record<string, unknown> = {
        name: lead.prospect_name || '',
        company: lead.company_name || '',
        topic: lead.primary_topic || '',
        useCase: lead.use_case_category || '',
        region: lead.region || '',
        status: lead.status || '',
        date: lead.conversation_date || '',
      };

      if (exportSettings.includeContactInfo) {
        base.phone = lead.phone || '';
        base.email = lead.email || '';
      }

      if (exportSettings.includeConversations) {
        base.totalMessages = lead.total_messages || 0;
        base.duration = lead.duration_minutes || 0;
        base.userMessages = lead.user_messages || 0;
        base.assistantMessages = lead.assistant_messages || 0;
      }

      if (exportSettings.includeScores) {
        base.leadScore = lead.lead_score || 0;
        base.intentLevel = lead.intent_level || '';
        base.urgency = lead.urgency || '';
        base.buyerStage = lead.buyer_stage || '';
        base.isHotLead = lead.is_hot_lead || false;
        base.sentiment = lead.sentiment_overall || '';
      }

      if (exportSettings.includeTimeline) {
        base.conversationDate = lead.conversation_date || '';
        base.startTime = lead.start_time_ist || '';
        base.endTime = lead.end_time_ist || '';
        base.createdAt = lead.created_at || '';
        base.updatedAt = lead.updated_at || '';
      }

      if (exportSettings.includeNotes) {
        base.conversationSummary = lead.conversation_summary || '';
        base.needSummary = lead.need_summary || '';
        base.nextAction = lead.next_action || '';
      }

      if (exportSettings.includeAssignee) {
        base.assignedTo = lead.assigned_to || '';
        base.recommendedRouting = lead.recommended_routing || '';
      }

      if (exportSettings.includeTags) {
        base.primaryTopic = lead.primary_topic || '';
        base.secondaryTopics = (lead.secondary_topics || []).join(', ');
        base.keyQuestions = (lead.key_questions || []).join(', ');
        base.mainObjections = (lead.main_objections || []).join(', ');
      }

      if (exportSettings.includeCustomFields) {
        base.source = lead.source || '';
        base.channel = lead.channel || '';
        base.syncedTo = (lead.synced_to || []).join(', ');
        base.completeness = lead.completeness || 0;
      }

      return base;
    });

    let content: string;
    let filename: string;
    let mimeType: string;

    if (exportSettings.exportFormat === 'csv') {
      const headers = Object.keys(exportData[0]).join(',');
      const rows = exportData.map(row =>
        Object.values(row).map(v => {
          const str = String(v);
          if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        }).join(',')
      );
      content = [headers, ...rows].join('\n');
      filename = `fluffychats_leads_${new Date().toISOString().split('T')[0]}.csv`;
      mimeType = 'text/csv;charset=utf-8;';
    } else if (exportSettings.exportFormat === 'json') {
      content = JSON.stringify(exportData, null, 2);
      filename = `fluffychats_leads_${new Date().toISOString().split('T')[0]}.json`;
      mimeType = 'application/json;charset=utf-8;';
    } else {
      const headers = Object.keys(exportData[0]).join('\t');
      const rows = exportData.map(row => Object.values(row).map(v => String(v)).join('\t'));
      content = [headers, ...rows].join('\n');
      filename = `fluffychats_leads_${new Date().toISOString().split('T')[0]}.xls`;
      mimeType = 'application/vnd.ms-excel;charset=utf-8;';
    }

    const BOM = '\uFEFF';
    const blob = new Blob([BOM + content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // API Key functions
  const handleRotateApiKey = () => {
    if (confirm('Are you sure you want to rotate your API key? The old key will stop working immediately.')) {
      const newKey = generateApiKey();
      setApiKey(newKey);
      setSecurity(prev => ({ ...prev, apiKeyLastRotated: new Date().toISOString() }));
      handleSave();
    }
  };

  const handleCopyApiKey = () => {
    navigator.clipboard.writeText(apiKey);
    alert('API key copied to clipboard');
  };

  // 2FA functions
  const handle2FAToggle = (enabled: boolean) => {
    if (enabled) {
      setShow2FAModal(true);
      setOtpSent(false);
      setOtpCode('');
      setOtpError('');
    } else {
      if (confirm('Are you sure you want to disable two-factor authentication?')) {
        setSecurity(prev => ({ ...prev, twoFactorEnabled: false }));
      }
    }
  };

  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);

  const handleSendOTP = async () => {
    if (!user?.email) {
      setOtpError('No email address found');
      return;
    }

    setSendingOtp(true);
    setOtpError('');

    try {
      const response = await fetch('/api/auth/2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          userName: user.name,
          action: 'enable_2fa',
        }),
      });

      const data = await response.json();

      if (data.success) {
        setOtpSent(true);
        alert(`Verification code sent to ${user.email}`);
      } else {
        setOtpError(data.error || 'Failed to send verification code');
      }
    } catch (error) {
      console.error('Failed to send OTP:', error);
      setOtpError('Failed to send verification code. Please try again.');
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!user?.email || !otpCode) {
      setOtpError('Please enter the verification code');
      return;
    }

    setVerifyingOtp(true);
    setOtpError('');

    try {
      const response = await fetch('/api/auth/2fa', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          otp: otpCode,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSecurity(prev => ({ ...prev, twoFactorEnabled: true }));
        setShow2FAModal(false);
        setOtpCode('');
        setOtpSent(false);
        alert('Two-factor authentication has been enabled successfully!');
      } else {
        setOtpError(data.error || 'Invalid verification code');
      }
    } catch (error) {
      console.error('Failed to verify OTP:', error);
      setOtpError('Verification failed. Please try again.');
    } finally {
      setVerifyingOtp(false);
    }
  };

  // Password change
  const handleChangePassword = () => {
    if (passwordForm.new !== passwordForm.confirm) {
      alert('New passwords do not match');
      return;
    }
    if (passwordForm.new.length < 8) {
      alert('Password must be at least 8 characters');
      return;
    }
    setShowPasswordModal(false);
    setPasswordForm({ current: '', new: '', confirm: '' });
    alert('Password changed successfully');
  };

  // Session management
  const handleRevokeSession = (sessionId: string) => {
    if (confirm('Are you sure you want to end this session?')) {
      const updated = sessions.filter(s => s.id !== sessionId);
      setSessions(updated);
      localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(updated));
    }
  };

  // Team functions
  const [sendingInvite, setSendingInvite] = useState(false);

  const handleInvite = async () => {
    if (!inviteEmail || !inviteEmail.includes('@')) {
      alert('Please enter a valid email address');
      return;
    }

    // Check if user already exists in team
    if (teamMembers.some(m => m.email.toLowerCase() === inviteEmail.toLowerCase())) {
      alert('This user is already a team member');
      return;
    }

    // Check if invite already exists
    if (pendingInvites.some(i => i.email.toLowerCase() === inviteEmail.toLowerCase())) {
      alert('An invitation has already been sent to this email');
      return;
    }

    setSendingInvite(true);

    try {
      // Send invitation email via API
      const response = await fetch('/api/team/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail,
          inviterName: user?.name || 'Team Admin',
          organizationName: organization.name,
          role: inviteRole,
        }),
      });

      const data = await response.json();

      const newInvite: PendingInvite = {
        id: data.inviteToken || crypto.randomUUID(),
        email: inviteEmail,
        role: inviteRole,
        sentAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      };

      const updatedInvites = [...pendingInvites, newInvite];
      setPendingInvites(updatedInvites);
      localStorage.setItem(INVITES_STORAGE_KEY, JSON.stringify(updatedInvites));
      setShowInviteModal(false);
      setInviteEmail('');
      setInviteRole('viewer');

      if (data.success) {
        alert(`Invitation email sent to ${inviteEmail}`);
      } else {
        alert(`Invitation created but email delivery may have failed: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to send invitation:', error);
      // Still create the invitation locally even if email fails
      const newInvite: PendingInvite = {
        id: crypto.randomUUID(),
        email: inviteEmail,
        role: inviteRole,
        sentAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      };

      const updatedInvites = [...pendingInvites, newInvite];
      setPendingInvites(updatedInvites);
      localStorage.setItem(INVITES_STORAGE_KEY, JSON.stringify(updatedInvites));
      setShowInviteModal(false);
      setInviteEmail('');
      setInviteRole('viewer');
      alert(`Invitation created for ${inviteEmail} (email service unavailable)`);
    } finally {
      setSendingInvite(false);
    }
  };

  const handleRevokeInvite = (id: string) => {
    if (confirm('Are you sure you want to revoke this invitation?')) {
      const updatedInvites = pendingInvites.filter(i => i.id !== id);
      setPendingInvites(updatedInvites);
      localStorage.setItem(INVITES_STORAGE_KEY, JSON.stringify(updatedInvites));
    }
  };

  const handleRemoveMember = (id: string) => {
    const member = teamMembers.find(m => m.id === id);
    if (member?.role === 'owner') {
      alert('Cannot remove the organization owner');
      return;
    }
    if (confirm('Are you sure you want to remove this team member?')) {
      const updatedMembers = teamMembers.filter(m => m.id !== id);
      setTeamMembers(updatedMembers);
      localStorage.setItem(TEAM_STORAGE_KEY, JSON.stringify(updatedMembers));
    }
  };

  const handleChangeRole = (id: string, newRole: UserRole) => {
    const member = teamMembers.find(m => m.id === id);
    if (member?.role === 'owner' && newRole !== 'owner') {
      alert('Cannot change owner role. Use Transfer Ownership instead.');
      return;
    }
    const updatedMembers = teamMembers.map(m =>
      m.id === id ? { ...m, role: newRole } : m
    );
    setTeamMembers(updatedMembers);
    localStorage.setItem(TEAM_STORAGE_KEY, JSON.stringify(updatedMembers));
  };

  // Password verification for danger zone
  const handleDangerAction = (action: 'deleteData' | 'deleteOrg' | 'transfer') => {
    if (!dangerZoneUnlocked) {
      setPendingDangerAction(action);
      setShowDangerPasswordModal(true);
      setDangerPassword('');
      setDangerPasswordError('');
    } else {
      executeDangerAction(action);
    }
  };

  const verifyDangerPassword = async () => {
    try {
      const storedUsers = localStorage.getItem('fluffychats_users');
      if (!storedUsers || !user) {
        setDangerPasswordError('Unable to verify password');
        return;
      }

      const users = JSON.parse(storedUsers);
      const currentUser = users.find((u: { id: string }) => u.id === user.id);
      if (!currentUser) {
        setDangerPasswordError('User not found');
        return;
      }

      const inputHash = await hashPassword(dangerPassword);
      if (inputHash !== currentUser.passwordHash) {
        setDangerPasswordError('Incorrect password');
        return;
      }

      // Password verified - unlock danger zone for this session
      setDangerZoneUnlocked(true);
      setShowDangerPasswordModal(false);
      setDangerPassword('');
      setDangerPasswordError('');

      // Execute the pending action
      if (pendingDangerAction) {
        executeDangerAction(pendingDangerAction);
        setPendingDangerAction(null);
      }
    } catch {
      setDangerPasswordError('Verification failed. Please try again.');
    }
  };

  const executeDangerAction = (action: 'deleteData' | 'deleteOrg' | 'transfer') => {
    switch (action) {
      case 'deleteData':
        setShowDeleteDataModal(true);
        break;
      case 'deleteOrg':
        setShowDeleteOrgModal(true);
        break;
      case 'transfer':
        setShowTransferModal(true);
        break;
    }
  };

  // Danger zone functions
  const handleDeleteAllData = () => {
    if (deleteConfirmText !== 'DELETE ALL DATA') {
      alert('Please type "DELETE ALL DATA" to confirm');
      return;
    }
    localStorage.removeItem('fluffychats_leads');
    localStorage.removeItem(SETTINGS_STORAGE_KEY);
    setShowDeleteDataModal(false);
    setDeleteConfirmText('');
    alert('All data has been deleted');
    window.location.reload();
  };

  const handleDeleteOrganization = () => {
    if (deleteConfirmText !== organization.name) {
      alert(`Please type "${organization.name}" to confirm`);
      return;
    }
    localStorage.clear();
    setShowDeleteOrgModal(false);
    setDeleteConfirmText('');
    alert('Organization has been deleted');
    window.location.href = '/auth/login';
  };

  const handleTransferOwnership = () => {
    const targetMember = teamMembers.find(m => m.email.toLowerCase() === transferEmail.toLowerCase());
    if (!targetMember) {
      alert('User not found in team');
      return;
    }
    if (confirm(`Are you sure you want to transfer ownership to ${targetMember.name}? This action cannot be undone.`)) {
      const updatedMembers = teamMembers.map(m => {
        if (m.email.toLowerCase() === transferEmail.toLowerCase()) {
          return { ...m, role: 'owner' as UserRole };
        }
        if (m.id === user?.id) {
          return { ...m, role: 'admin' as UserRole };
        }
        return m;
      });
      setTeamMembers(updatedMembers);
      localStorage.setItem(TEAM_STORAGE_KEY, JSON.stringify(updatedMembers));
      setShowTransferModal(false);
      setTransferEmail('');
      alert('Ownership has been transferred successfully');
    }
  };

  // Utility functions
  const getRelativeTime = (dateString: string): string => {
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
  };

  // Render tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return <ProfileTab
          profile={profile}
          setProfile={setProfile}
          user={user}
        />;
      case 'organization':
        return <OrganizationTab
          organization={organization}
          setOrganization={setOrganization}
          canEdit={canEditOrg}
        />;
      case 'export':
        return <ExportTab
          exportSettings={exportSettings}
          setExportSettings={setExportSettings}
          totalLeadsCount={leads.length}
          filteredLeadsCount={filteredLeadsCount}
          onExport={handleExport}
        />;
      case 'security':
        return <SecurityTab
          security={security}
          setSecurity={setSecurity}
          showApiKey={showApiKey}
          setShowApiKey={setShowApiKey}
          apiKey={apiKey}
          sessions={sessions}
          onRotateApiKey={handleRotateApiKey}
          onCopyApiKey={handleCopyApiKey}
          onChangePassword={() => setShowPasswordModal(true)}
          on2FAToggle={handle2FAToggle}
          onRevokeSession={handleRevokeSession}
          getRelativeTime={getRelativeTime}
        />;
      case 'team':
        return <TeamTab
          teamMembers={teamMembers}
          pendingInvites={pendingInvites}
          canManage={canManageTeam}
          onInvite={() => setShowInviteModal(true)}
          onRemoveMember={handleRemoveMember}
          onChangeRole={handleChangeRole}
          onRevokeInvite={handleRevokeInvite}
          getRelativeTime={getRelativeTime}
          currentUserId={user?.id}
        />;
      case 'danger':
        return <DangerTab
          organizationName={organization.name}
          isOwner={isOwner}
          isUnlocked={dangerZoneUnlocked}
          onDeleteData={() => handleDangerAction('deleteData')}
          onDeleteOrg={() => handleDangerAction('deleteOrg')}
          onTransfer={() => handleDangerAction('transfer')}
        />;
      default:
        return null;
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Page Header */}
      <div className="flex items-center justify-between animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Settings</h1>
          <p className="text-[var(--muted-foreground)]">
            Manage your account, team, and preferences
          </p>
        </div>
        <div className="flex items-center gap-3">
          {saved && (
            <span className="flex items-center gap-2 text-green-600 text-sm animate-fade-in">
              <CheckCircle2 className="w-4 h-4" /> Saved!
            </span>
          )}
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 border border-[var(--border)] rounded-lg hover:bg-[var(--accent)] transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save Changes
          </button>
        </div>
      </div>

      {/* Tab Navigation + Content */}
      <div className="flex gap-6">
        {/* Sidebar Navigation */}
        <nav className="w-56 shrink-0 space-y-1">
          {visibleTabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const isDanger = tab.id === 'danger';

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                  isActive
                    ? isDanger
                      ? 'bg-red-50 text-red-700 border border-red-200'
                      : 'bg-[var(--primary)] text-white'
                    : isDanger
                    ? 'text-red-600 hover:bg-red-50'
                    : 'text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-[var(--foreground)]'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{tab.label}</p>
                </div>
              </button>
            );
          })}
        </nav>

        {/* Content Area */}
        <div className="flex-1 min-w-0">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6 animate-slide-up">
            {renderTabContent()}
          </div>
        </div>
      </div>

      {/* Modals */}
      {/* Password Change Modal */}
      {showPasswordModal && (
        <Modal title="Change Password" onClose={() => setShowPasswordModal(false)}>
          <div className="space-y-4">
            <Input
              label="Current Password"
              type="password"
              value={passwordForm.current}
              onChange={(e) => setPasswordForm(p => ({ ...p, current: e.target.value }))}
            />
            <Input
              label="New Password"
              type="password"
              value={passwordForm.new}
              onChange={(e) => setPasswordForm(p => ({ ...p, new: e.target.value }))}
            />
            <Input
              label="Confirm New Password"
              type="password"
              value={passwordForm.confirm}
              onChange={(e) => setPasswordForm(p => ({ ...p, confirm: e.target.value }))}
            />
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowPasswordModal(false)}
                className="flex-1 py-2.5 border border-[var(--border)] rounded-lg hover:bg-[var(--accent)]"
              >
                Cancel
              </button>
              <button
                onClick={handleChangePassword}
                className="flex-1 py-2.5 bg-[var(--primary)] text-white rounded-lg hover:opacity-90"
              >
                Update Password
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* 2FA Modal */}
      {show2FAModal && (
        <Modal title="Enable Two-Factor Authentication" onClose={() => setShow2FAModal(false)}>
          {!otpSent ? (
            <>
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-4">
                <p className="text-sm text-blue-800">
                  Two-factor authentication adds an extra layer of security to your account by requiring a verification code when signing in.
                </p>
              </div>
              <p className="text-sm text-[var(--muted-foreground)] mb-6">
                We&apos;ll send a 6-digit verification code to your email: <strong>{profile.email}</strong>
              </p>
              {otpError && <p className="text-sm text-red-600 mb-4">{otpError}</p>}
              <div className="flex gap-3">
                <button
                  onClick={() => setShow2FAModal(false)}
                  className="flex-1 py-2.5 border border-[var(--border)] rounded-lg hover:bg-[var(--accent)]"
                  disabled={sendingOtp}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendOTP}
                  disabled={sendingOtp}
                  className="flex-1 py-2.5 bg-[var(--primary)] text-white rounded-lg hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {sendingOtp ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4" />
                      Send Code
                    </>
                  )}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg mb-4">
                <p className="text-sm text-green-800">
                  Verification code sent to <strong>{profile.email}</strong>
                </p>
              </div>
              <p className="text-sm text-[var(--muted-foreground)] mb-4">
                Enter the 6-digit code sent to your email. The code expires in 10 minutes.
              </p>
              <input
                type="text"
                maxLength={6}
                value={otpCode}
                onChange={(e) => {
                  setOtpCode(e.target.value.replace(/\D/g, ''));
                  setOtpError('');
                }}
                placeholder="Enter 6-digit code"
                className="w-full px-4 py-3 bg-[var(--secondary)] border border-[var(--border)] rounded-lg text-lg text-center tracking-widest font-mono"
                autoFocus
              />
              {otpError && <p className="text-sm text-red-600 mt-2">{otpError}</p>}
              <button
                onClick={handleSendOTP}
                disabled={sendingOtp}
                className="text-sm text-[var(--primary)] hover:underline mt-2 flex items-center gap-1"
              >
                {sendingOtp ? 'Sending...' : 'Resend code'}
              </button>
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => {
                    setShow2FAModal(false);
                    setOtpSent(false);
                    setOtpCode('');
                    setOtpError('');
                  }}
                  className="flex-1 py-2.5 border border-[var(--border)] rounded-lg hover:bg-[var(--accent)]"
                  disabled={verifyingOtp}
                >
                  Cancel
                </button>
                <button
                  onClick={handleVerifyOTP}
                  disabled={otpCode.length !== 6 || verifyingOtp}
                  className="flex-1 py-2.5 bg-[var(--primary)] text-white rounded-lg hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {verifyingOtp ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    'Verify & Enable'
                  )}
                </button>
              </div>
            </>
          )}
        </Modal>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <Modal title="Invite Team Member" onClose={() => setShowInviteModal(false)}>
          <div className="space-y-4">
            <p className="text-sm text-[var(--muted-foreground)]">
              Send an invitation email to add a new team member to {organization.name}.
            </p>
            <Input
              label="Email Address"
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="colleague@example.com"
              disabled={sendingInvite}
            />
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                Role
              </label>
              <RoleSelector
                value={inviteRole}
                onChange={setInviteRole}
                excludeRoles={['owner']}
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowInviteModal(false)}
                className="flex-1 py-2.5 border border-[var(--border)] rounded-lg hover:bg-[var(--accent)]"
                disabled={sendingInvite}
              >
                Cancel
              </button>
              <button
                onClick={handleInvite}
                disabled={sendingInvite || !inviteEmail}
                className="flex-1 py-2.5 bg-[var(--primary)] text-white rounded-lg hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {sendingInvite ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4" />
                    Send Invitation
                  </>
                )}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Data Modal */}
      {showDeleteDataModal && (
        <DangerModal
          title="Delete All Lead Data"
          description="This will permanently delete all your leads and conversation data. This action cannot be undone."
          confirmText="DELETE ALL DATA"
          inputValue={deleteConfirmText}
          onInputChange={setDeleteConfirmText}
          onConfirm={handleDeleteAllData}
          onCancel={() => {
            setShowDeleteDataModal(false);
            setDeleteConfirmText('');
          }}
        />
      )}

      {/* Delete Organization Modal */}
      {showDeleteOrgModal && (
        <DangerModal
          title="Delete Organization"
          description={`This will permanently delete your organization "${organization.name}" and all associated data, including team members and leads. This action cannot be undone.`}
          confirmText={organization.name}
          inputValue={deleteConfirmText}
          onInputChange={setDeleteConfirmText}
          onConfirm={handleDeleteOrganization}
          onCancel={() => {
            setShowDeleteOrgModal(false);
            setDeleteConfirmText('');
          }}
        />
      )}

      {/* Transfer Ownership Modal */}
      {showTransferModal && (
        <Modal title="Transfer Ownership" onClose={() => setShowTransferModal(false)}>
          <div className="space-y-4">
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800">
                <strong>Warning:</strong> This will transfer full ownership of this organization to another team member. You will become an Admin. This action cannot be undone.
              </p>
            </div>
            <Input
              label="New Owner's Email"
              type="email"
              value={transferEmail}
              onChange={(e) => setTransferEmail(e.target.value)}
              placeholder="Enter team member's email"
            />
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {
                  setShowTransferModal(false);
                  setTransferEmail('');
                }}
                className="flex-1 py-2.5 border border-[var(--border)] rounded-lg hover:bg-[var(--accent)]"
              >
                Cancel
              </button>
              <button
                onClick={handleTransferOwnership}
                className="flex-1 py-2.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
              >
                Transfer Ownership
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Danger Zone Password Verification Modal */}
      {showDangerPasswordModal && (
        <Modal title="Verify Your Identity" onClose={() => {
          setShowDangerPasswordModal(false);
          setDangerPassword('');
          setDangerPasswordError('');
          setPendingDangerAction(null);
        }}>
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
              <Lock className="w-5 h-5 text-red-600 shrink-0" />
              <p className="text-sm text-red-800">
                For your security, please enter your account password to access Danger Zone actions.
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                Account Password
              </label>
              <input
                type="password"
                value={dangerPassword}
                onChange={(e) => {
                  setDangerPassword(e.target.value);
                  setDangerPasswordError('');
                }}
                placeholder="Enter your password"
                className="w-full px-4 py-2 bg-[var(--secondary)] border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    verifyDangerPassword();
                  }
                }}
                autoFocus
              />
              {dangerPasswordError && (
                <p className="text-sm text-red-600 mt-2">{dangerPasswordError}</p>
              )}
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {
                  setShowDangerPasswordModal(false);
                  setDangerPassword('');
                  setDangerPasswordError('');
                  setPendingDangerAction(null);
                }}
                className="flex-1 py-2.5 border border-[var(--border)] rounded-lg hover:bg-[var(--accent)]"
              >
                Cancel
              </button>
              <button
                onClick={verifyDangerPassword}
                disabled={!dangerPassword}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                Verify & Continue
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// Reusable Components

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-[var(--card)] rounded-xl p-6 max-w-md w-full mx-4 border border-[var(--border)] shadow-xl animate-scale-in">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-lg text-[var(--foreground)]">{title}</h2>
          <button onClick={onClose} className="p-1 hover:bg-[var(--accent)] rounded">
            <X className="w-5 h-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function DangerModal({
  title,
  description,
  confirmText,
  inputValue,
  onInputChange,
  onConfirm,
  onCancel,
}: {
  title: string;
  description: string;
  confirmText: string;
  inputValue: string;
  onInputChange: (value: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-[var(--card)] rounded-xl p-6 max-w-md w-full mx-4 border border-red-200 shadow-xl animate-scale-in">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <h2 className="font-semibold text-lg text-[var(--foreground)]">{title}</h2>
          </div>
        </div>
        <p className="text-sm text-[var(--muted-foreground)] mb-4">{description}</p>
        <div className="mb-4">
          <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
            Type <span className="font-mono bg-red-100 text-red-700 px-1 rounded">{confirmText}</span> to confirm
          </label>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => onInputChange(e.target.value)}
            className="w-full px-4 py-2 bg-[var(--secondary)] border border-[var(--border)] rounded-lg text-sm"
            placeholder={confirmText}
          />
        </div>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 border border-[var(--border)] rounded-lg hover:bg-[var(--accent)]"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={inputValue !== confirmText}
            className="flex-1 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Delete Permanently
          </button>
        </div>
      </div>
    </div>
  );
}

function Input({
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  disabled,
  icon: Icon,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  disabled?: boolean;
  icon?: React.ElementType;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-[var(--foreground)] mb-2">{label}</label>
      <div className="relative">
        {Icon && (
          <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]" />
        )}
        <input
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          className={`w-full ${Icon ? 'pl-10' : 'px-4'} pr-4 py-2 bg-[var(--secondary)] border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] disabled:opacity-50 disabled:cursor-not-allowed`}
        />
      </div>
    </div>
  );
}

// Tab Components

function ProfileTab({
  profile,
  setProfile,
  user,
}: {
  profile: ProfileSettings;
  setProfile: React.Dispatch<React.SetStateAction<ProfileSettings>>;
  user: { role: UserRole; name?: string; email?: string } | null;
}) {
  return (
    <div className="space-y-8">
      {/* Personal Information */}
      <section>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
            <User className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-semibold text-[var(--foreground)]">Personal Information</h2>
            <p className="text-sm text-[var(--muted-foreground)]">Update your profile details</p>
          </div>
          {user && (
            <div className="ml-auto">
              <RoleBadge role={user.role} size="md" />
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Full Name"
            value={profile.name}
            onChange={(e) => setProfile(p => ({ ...p, name: e.target.value }))}
          />
          <Input
            label="Email Address"
            type="email"
            value={profile.email}
            onChange={(e) => setProfile(p => ({ ...p, email: e.target.value }))}
            icon={Mail}
          />
          <Input
            label="Phone Number"
            value={profile.phone}
            onChange={(e) => setProfile(p => ({ ...p, phone: e.target.value }))}
            placeholder="+91 98765 43210"
            icon={Smartphone}
          />
          <Input
            label="Job Title"
            value={profile.title}
            onChange={(e) => setProfile(p => ({ ...p, title: e.target.value }))}
            placeholder="Sales Manager"
          />
        </div>
      </section>
    </div>
  );
}

function OrganizationTab({
  organization,
  setOrganization,
  canEdit,
}: {
  organization: OrganizationSettings;
  setOrganization: React.Dispatch<React.SetStateAction<OrganizationSettings>>;
  canEdit: boolean;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
          <Building2 className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="font-semibold text-[var(--foreground)]">Organization Settings</h2>
          <p className="text-sm text-[var(--muted-foreground)]">
            {canEdit ? 'Manage your company settings' : 'View-only access'}
          </p>
        </div>
      </div>

      {!canEdit && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg mb-6">
          <p className="text-sm text-amber-800">
            Only organization owners can edit these settings.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Organization Name"
          value={organization.name}
          onChange={(e) => setOrganization(o => ({ ...o, name: e.target.value }))}
          disabled={!canEdit}
          icon={Building2}
        />
        <div>
          <label className="block text-sm font-medium text-[var(--foreground)] mb-2">Industry</label>
          <select
            value={organization.industry}
            onChange={(e) => setOrganization(o => ({ ...o, industry: e.target.value }))}
            disabled={!canEdit}
            className="w-full px-4 py-2 bg-[var(--secondary)] border border-[var(--border)] rounded-lg text-sm disabled:opacity-50"
          >
            <option value="Technology">Technology</option>
            <option value="Healthcare">Healthcare</option>
            <option value="Finance">Finance</option>
            <option value="Retail">Retail</option>
            <option value="Manufacturing">Manufacturing</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--foreground)] mb-2">Company Size</label>
          <select
            value={organization.size}
            onChange={(e) => setOrganization(o => ({ ...o, size: e.target.value }))}
            disabled={!canEdit}
            className="w-full px-4 py-2 bg-[var(--secondary)] border border-[var(--border)] rounded-lg text-sm disabled:opacity-50"
          >
            <option value="startup">Startup (1-10)</option>
            <option value="small">Small (11-50)</option>
            <option value="medium">Medium (51-200)</option>
            <option value="enterprise">Enterprise (200+)</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--foreground)] mb-2">Timezone</label>
          <div className="relative">
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]" />
            <select
              value={organization.timezone}
              onChange={(e) => setOrganization(o => ({ ...o, timezone: e.target.value }))}
              disabled={!canEdit}
              className="w-full pl-10 pr-4 py-2 bg-[var(--secondary)] border border-[var(--border)] rounded-lg text-sm disabled:opacity-50"
            >
              <option value="Asia/Kolkata">India (IST)</option>
              <option value="America/New_York">Eastern Time (ET)</option>
              <option value="America/Los_Angeles">Pacific Time (PT)</option>
              <option value="Europe/London">London (GMT)</option>
              <option value="Asia/Dubai">Dubai (GST)</option>
              <option value="Asia/Singapore">Singapore (SGT)</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}

function ExportTab({
  exportSettings,
  setExportSettings,
  totalLeadsCount,
  filteredLeadsCount,
  onExport,
}: {
  exportSettings: ExportSettings;
  setExportSettings: React.Dispatch<React.SetStateAction<ExportSettings>>;
  totalLeadsCount: number;
  filteredLeadsCount: number;
  onExport: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
          <Download className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="font-semibold text-[var(--foreground)]">Export Settings</h2>
          <p className="text-sm text-[var(--muted-foreground)]">Configure lead export preferences</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Left Column - Filters */}
        <div className="space-y-5">
          <div>
            <h3 className="font-medium text-[var(--foreground)] mb-3">Lead Filter</h3>
            <select
              value={exportSettings.leadFilter}
              onChange={(e) => setExportSettings(s => ({ ...s, leadFilter: e.target.value as ExportSettings['leadFilter'] }))}
              className="w-full px-4 py-2 bg-[var(--secondary)] border border-[var(--border)] rounded-lg text-sm"
            >
              <option value="all">All Leads</option>
              <option value="hot">Hot Leads Only</option>
              <option value="warm">Warm Leads Only</option>
              <option value="cold">Cold Leads Only</option>
            </select>
          </div>

          <div>
            <h3 className="font-medium text-[var(--foreground)] mb-3">Intent Level</h3>
            <select
              value={exportSettings.intentFilter}
              onChange={(e) => setExportSettings(s => ({ ...s, intentFilter: e.target.value as ExportSettings['intentFilter'] }))}
              className="w-full px-4 py-2 bg-[var(--secondary)] border border-[var(--border)] rounded-lg text-sm"
            >
              <option value="all">All Intent Levels</option>
              <option value="high">High Intent</option>
              <option value="medium">Medium Intent</option>
              <option value="low">Low Intent</option>
            </select>
          </div>

          <div>
            <h3 className="font-medium text-[var(--foreground)] mb-3">Buying Stage</h3>
            <select
              value={exportSettings.stageFilter}
              onChange={(e) => setExportSettings(s => ({ ...s, stageFilter: e.target.value as ExportSettings['stageFilter'] }))}
              className="w-full px-4 py-2 bg-[var(--secondary)] border border-[var(--border)] rounded-lg text-sm"
            >
              <option value="all">All Stages</option>
              <option value="awareness">Awareness</option>
              <option value="consideration">Consideration</option>
              <option value="decision">Decision</option>
            </select>
          </div>

          <div>
            <h3 className="font-medium text-[var(--foreground)] mb-3">Date Range</h3>
            <select
              value={exportSettings.dateRange}
              onChange={(e) => setExportSettings(s => ({ ...s, dateRange: e.target.value as ExportSettings['dateRange'] }))}
              className="w-full px-4 py-2 bg-[var(--secondary)] border border-[var(--border)] rounded-lg text-sm"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">Last 7 Days</option>
              <option value="month">This Month</option>
              <option value="quarter">Last 90 Days</option>
              <option value="year">This Year</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          {exportSettings.dateRange === 'custom' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-[var(--muted-foreground)] mb-1">From</label>
                <input
                  type="date"
                  value={exportSettings.customDateFrom || ''}
                  onChange={(e) => setExportSettings(s => ({ ...s, customDateFrom: e.target.value }))}
                  className="w-full px-3 py-2 bg-[var(--secondary)] border border-[var(--border)] rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-[var(--muted-foreground)] mb-1">To</label>
                <input
                  type="date"
                  value={exportSettings.customDateTo || ''}
                  onChange={(e) => setExportSettings(s => ({ ...s, customDateTo: e.target.value }))}
                  className="w-full px-3 py-2 bg-[var(--secondary)] border border-[var(--border)] rounded-lg text-sm"
                />
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Include Options & Format */}
        <div className="space-y-5">
          <div>
            <h3 className="font-medium text-[var(--foreground)] mb-3">Include in Export</h3>
            <div className="space-y-2 bg-[var(--secondary)] rounded-lg p-4">
              {[
                { key: 'includeContactInfo', label: 'Contact Info', desc: 'Phone, email' },
                { key: 'includeConversations', label: 'Conversation Data', desc: 'Messages, duration' },
                { key: 'includeScores', label: 'Lead Scores', desc: 'Score, intent, urgency, stage' },
                { key: 'includeTimeline', label: 'Timeline', desc: 'First contact, last contact, dates' },
                { key: 'includeNotes', label: 'Notes & Summary', desc: 'Notes, AI summary' },
                { key: 'includeAssignee', label: 'Assignee', desc: 'Assigned team member' },
                { key: 'includeTags', label: 'Tags & Keywords', desc: 'Tags, requirements' },
                { key: 'includeCustomFields', label: 'Custom Fields', desc: 'Source, channel, sync status' },
              ].map((item) => (
                <label key={item.key} className="flex items-center justify-between py-2 cursor-pointer hover:bg-[var(--accent)] px-2 rounded">
                  <div>
                    <span className="text-sm font-medium text-[var(--foreground)]">{item.label}</span>
                    <p className="text-xs text-[var(--muted-foreground)]">{item.desc}</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={exportSettings[item.key as keyof ExportSettings] as boolean}
                    onChange={(e) => setExportSettings(s => ({ ...s, [item.key]: e.target.checked }))}
                    className="w-4 h-4 rounded border-[var(--border)] text-[var(--primary)]"
                  />
                </label>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-medium text-[var(--foreground)] mb-3">Export Format</h3>
            <div className="grid grid-cols-3 gap-2">
              {(['csv', 'json', 'excel'] as const).map((format) => (
                <button
                  key={format}
                  onClick={() => setExportSettings(s => ({ ...s, exportFormat: format }))}
                  className={`py-2.5 px-4 rounded-lg text-sm font-medium transition-colors ${
                    exportSettings.exportFormat === format
                      ? 'bg-[var(--primary)] text-white'
                      : 'bg-[var(--secondary)] border border-[var(--border)] hover:bg-[var(--accent)]'
                  }`}
                >
                  {format.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Export Summary */}
          <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-green-800">Leads matching filters</span>
              <span className="text-lg font-bold text-green-700">{filteredLeadsCount}</span>
            </div>
            <p className="text-xs text-green-600">
              {filteredLeadsCount === totalLeadsCount
                ? 'Exporting all leads'
                : `Filtered from ${totalLeadsCount} total leads`}
            </p>
          </div>

          <button
            onClick={onExport}
            disabled={filteredLeadsCount === 0}
            className="w-full py-3 bg-[var(--primary)] text-white rounded-lg hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2 font-medium"
          >
            <Download className="w-4 h-4" />
            Export {filteredLeadsCount} Lead{filteredLeadsCount !== 1 ? 's' : ''}
          </button>
        </div>
      </div>
    </div>
  );
}

function SecurityTab({
  security,
  setSecurity,
  showApiKey,
  setShowApiKey,
  apiKey,
  sessions,
  onRotateApiKey,
  onCopyApiKey,
  onChangePassword,
  on2FAToggle,
  onRevokeSession,
  getRelativeTime,
}: {
  security: SecuritySettings;
  setSecurity: React.Dispatch<React.SetStateAction<SecuritySettings>>;
  showApiKey: boolean;
  setShowApiKey: (show: boolean) => void;
  apiKey: string;
  sessions: SessionType[];
  onRotateApiKey: () => void;
  onCopyApiKey: () => void;
  onChangePassword: () => void;
  on2FAToggle: (enabled: boolean) => void;
  onRevokeSession: (id: string) => void;
  getRelativeTime: (date: string) => string;
}) {
  return (
    <div className="space-y-8">
      {/* Account Security */}
      <section>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-500 to-pink-600 flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-semibold text-[var(--foreground)]">Account Security</h2>
            <p className="text-sm text-[var(--muted-foreground)]">Protect your account</p>
          </div>
        </div>
        <div className="space-y-3">
          <button
            onClick={onChangePassword}
            className="w-full text-left p-4 bg-[var(--secondary)] rounded-lg hover:bg-[var(--accent)] transition-colors flex items-center justify-between"
          >
            <div>
              <span className="text-sm font-medium text-[var(--foreground)]">Change Password</span>
              <p className="text-xs text-[var(--muted-foreground)]">Update your account password</p>
            </div>
            <ChevronRight className="w-5 h-5 text-[var(--muted-foreground)]" />
          </button>
          <label className="flex items-center justify-between p-4 bg-[var(--secondary)] rounded-lg cursor-pointer">
            <div>
              <span className="text-sm font-medium text-[var(--foreground)]">Two-Factor Authentication</span>
              <p className="text-xs text-[var(--muted-foreground)]">
                {security.twoFactorEnabled ? 'Enabled - OTP sent on login' : 'Add extra security with 6-digit OTP'}
              </p>
            </div>
            <input
              type="checkbox"
              checked={security.twoFactorEnabled}
              onChange={(e) => on2FAToggle(e.target.checked)}
              className="w-5 h-5 rounded border-[var(--border)] text-[var(--primary)]"
            />
          </label>
          <div className="p-4 bg-[var(--secondary)] rounded-lg">
            <label className="block text-sm font-medium text-[var(--foreground)] mb-2">Session Timeout</label>
            <select
              value={security.sessionTimeout}
              onChange={(e) => setSecurity(s => ({ ...s, sessionTimeout: e.target.value }))}
              className="w-full px-4 py-2 bg-[var(--card)] border border-[var(--border)] rounded-lg text-sm"
            >
              <option value="15">15 minutes</option>
              <option value="30">30 minutes</option>
              <option value="60">1 hour</option>
              <option value="240">4 hours</option>
              <option value="never">Never</option>
            </select>
          </div>
        </div>
      </section>

      {/* API Key */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <Key className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-semibold text-[var(--foreground)]">API Key</h2>
            <p className="text-sm text-[var(--muted-foreground)]">Manage API access</p>
          </div>
        </div>
        <div className="space-y-3">
          <div className="relative">
            <input
              type={showApiKey ? 'text' : 'password'}
              value={apiKey}
              readOnly
              className="w-full px-4 py-2 pr-24 bg-[var(--secondary)] border border-[var(--border)] rounded-lg text-sm font-mono"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
              <button onClick={() => setShowApiKey(!showApiKey)} className="p-1.5 hover:bg-[var(--accent)] rounded">
                {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
              <button onClick={onCopyApiKey} className="p-1.5 hover:bg-[var(--accent)] rounded">
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </div>
          <p className="text-xs text-[var(--muted-foreground)]">
            Last rotated: {new Date(security.apiKeyLastRotated).toLocaleDateString()}
          </p>
          <button
            onClick={onRotateApiKey}
            className="w-full py-2 border border-[var(--border)] rounded-lg text-sm hover:bg-[var(--accent)] flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" /> Rotate API Key
          </button>
        </div>
      </section>

      {/* Active Sessions */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center">
            <Monitor className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-semibold text-[var(--foreground)]">Active Sessions</h2>
            <p className="text-sm text-[var(--muted-foreground)]">Manage logged-in devices</p>
          </div>
        </div>
        <div className="space-y-3">
          {sessions.map((session) => (
            <div key={session.id} className="flex items-center justify-between p-4 bg-[var(--secondary)] rounded-lg">
              <div className="flex items-center gap-3">
                <Monitor className="w-5 h-5 text-[var(--muted-foreground)]" />
                <div>
                  <p className="text-sm font-medium text-[var(--foreground)]">
                    {session.browser} on {session.os}
                    {session.current && (
                      <span className="ml-2 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">Current</span>
                    )}
                  </p>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    {session.location} · {getRelativeTime(session.lastActive)}
                  </p>
                </div>
              </div>
              {!session.current && (
                <button
                  onClick={() => onRevokeSession(session.id)}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function TeamTab({
  teamMembers,
  pendingInvites,
  canManage,
  onInvite,
  onRemoveMember,
  onChangeRole,
  onRevokeInvite,
  getRelativeTime,
  currentUserId,
}: {
  teamMembers: TeamMember[];
  pendingInvites: PendingInvite[];
  canManage: boolean;
  onInvite: () => void;
  onRemoveMember: (id: string) => void;
  onChangeRole: (id: string, role: UserRole) => void;
  onRevokeInvite: (id: string) => void;
  getRelativeTime: (date: string) => string;
  currentUserId?: string;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
            <Users className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-semibold text-[var(--foreground)]">Team Members</h2>
            <p className="text-sm text-[var(--muted-foreground)]">
              {teamMembers.length} member{teamMembers.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        {canManage && (
          <button
            onClick={onInvite}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-white rounded-lg hover:opacity-90"
          >
            <UserPlus className="w-4 h-4" />
            Invite Member
          </button>
        )}
      </div>

      {/* Team Members List */}
      <div className="space-y-3">
        {teamMembers.map((member) => (
          <div key={member.id} className="flex items-center justify-between p-4 bg-[var(--secondary)] rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-medium">
                {member.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--foreground)]">
                  {member.name}
                  {member.id === currentUserId && (
                    <span className="ml-2 text-xs text-[var(--muted-foreground)]">(You)</span>
                  )}
                </p>
                <p className="text-xs text-[var(--muted-foreground)]">{member.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <RoleBadge role={member.role} size="sm" />
              {canManage && member.role !== 'owner' && member.id !== currentUserId && (
                <div className="flex gap-1">
                  <select
                    value={member.role}
                    onChange={(e) => onChangeRole(member.id, e.target.value as UserRole)}
                    className="text-xs px-2 py-1 bg-[var(--card)] border border-[var(--border)] rounded"
                  >
                    <option value="admin">Admin</option>
                    <option value="viewer">Viewer</option>
                  </select>
                  <button
                    onClick={() => onRemoveMember(member.id)}
                    className="p-1 text-red-500 hover:bg-red-50 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Pending Invites */}
      {pendingInvites.length > 0 && (
        <div className="pt-6 border-t border-[var(--border)]">
          <h3 className="font-medium text-[var(--foreground)] mb-3">Pending Invitations</h3>
          <div className="space-y-2">
            {pendingInvites.map((invite) => (
              <div key={invite.id} className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-amber-600" />
                  <div>
                    <p className="text-sm font-medium text-amber-800">{invite.email}</p>
                    <p className="text-xs text-amber-600">
                      Sent {getRelativeTime(invite.sentAt)} · Expires {new Date(invite.expiresAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <RoleBadge role={invite.role} size="sm" />
                  {canManage && (
                    <button
                      onClick={() => onRevokeInvite(invite.id)}
                      className="p-1 text-red-500 hover:bg-red-50 rounded"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DangerTab({
  organizationName,
  isOwner,
  isUnlocked,
  onDeleteData,
  onDeleteOrg,
  onTransfer,
}: {
  organizationName: string;
  isOwner: boolean;
  isUnlocked: boolean;
  onDeleteData: () => void;
  onDeleteOrg: () => void;
  onTransfer: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-red-500 flex items-center justify-center">
          <AlertTriangle className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="font-semibold text-red-700">Danger Zone</h2>
          <p className="text-sm text-red-600">Irreversible and destructive actions</p>
        </div>
        {isUnlocked && (
          <span className="ml-auto flex items-center gap-1.5 text-xs bg-green-100 text-green-700 px-2.5 py-1 rounded-full">
            <Lock className="w-3 h-3" />
            Unlocked
          </span>
        )}
      </div>

      {/* Password protection notice */}
      {!isUnlocked && (
        <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg mb-4">
          <Lock className="w-5 h-5 text-amber-600 shrink-0" />
          <p className="text-sm text-amber-800">
            Actions in this section require password verification for security.
          </p>
        </div>
      )}

      <div className="space-y-4">
        {/* Delete All Lead Data */}
        <div className="p-4 border border-red-200 rounded-lg bg-red-50">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-red-800">Delete All Lead Data</h3>
              <p className="text-sm text-red-600">
                Permanently delete all leads and conversation data
              </p>
            </div>
            <button
              onClick={onDeleteData}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              {!isUnlocked && <Lock className="w-4 h-4" />}
              Delete Data
            </button>
          </div>
        </div>

        {/* Transfer Ownership - Owner Only */}
        {isOwner && (
          <div className="p-4 border border-amber-200 rounded-lg bg-amber-50">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-amber-800">Transfer Ownership</h3>
                <p className="text-sm text-amber-600">
                  Transfer organization ownership to another team member
                </p>
              </div>
              <button
                onClick={onTransfer}
                className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
              >
                {!isUnlocked && <Lock className="w-4 h-4" />}
                <ArrowRightLeft className="w-4 h-4" />
                Transfer
              </button>
            </div>
          </div>
        )}

        {/* Delete Organization - Owner Only */}
        {isOwner && (
          <div className="p-4 border border-red-300 rounded-lg bg-red-100">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-red-900">Delete Organization</h3>
                <p className="text-sm text-red-700">
                  Permanently delete {organizationName} and all associated data
                </p>
              </div>
              <button
                onClick={onDeleteOrg}
                className="flex items-center gap-2 px-4 py-2 bg-red-700 text-white rounded-lg hover:bg-red-800"
              >
                {!isUnlocked && <Lock className="w-4 h-4" />}
                Delete Organization
              </button>
            </div>
          </div>
        )}
      </div>

      {!isOwner && (
        <div className="p-4 bg-[var(--muted)] rounded-lg">
          <p className="text-sm text-[var(--muted-foreground)]">
            Some destructive actions are only available to organization owners.
          </p>
        </div>
      )}
    </div>
  );
}
