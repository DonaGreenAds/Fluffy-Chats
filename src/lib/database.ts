/**
 * DATABASE LAYER - Supabase PostgreSQL
 *
 * This module handles all database operations using Supabase.
 * Tables: leads, processed_sessions, organizations, users, team_members,
 *         invitations, audit_logs, api_keys, sessions
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Lead } from '@/types/lead';
import {
  Organization,
  OrganizationSettings,
  User,
  UserRole,
  TeamMember,
  Invitation,
  AuditLogEntry,
  UserPreferences,
  DEFAULT_USER_PREFERENCES,
  ApiKey
} from '@/types/auth';

// Supabase client singleton
let supabase: SupabaseClient | null = null;

function getSupabase(): SupabaseClient {
  if (supabase) return supabase;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error('Missing Supabase credentials. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local');
  }

  supabase = createClient(url, key);
  return supabase;
}

// Helper to parse JSON arrays
function parseJsonArray(value: string | string[] | null | undefined): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    return JSON.parse(value);
  } catch {
    return [];
  }
}

// Helper to parse JSON object
function parseJsonObject<T>(value: string | T | null | undefined, defaultValue: T): T {
  if (!value) return defaultValue;
  if (typeof value === 'object') return value as T;
  if (typeof value !== 'string') return defaultValue;
  try {
    return JSON.parse(value) as T;
  } catch {
    return defaultValue;
  }
}

// Transform DB row to Lead
function rowToLead(row: Record<string, unknown>): Lead {
  return {
    id: String(row.id),
    prospect_name: String(row.prospect_name || 'Unknown Lead'),
    phone: String(row.phone || ''),
    email: String(row.email || ''),
    company_name: String(row.company_name || ''),
    region: String(row.region || 'Unknown'),
    conversation_date: String(row.conversation_date || ''),
    start_time_ist: String(row.start_time_ist || ''),
    end_time_ist: String(row.end_time_ist || ''),
    duration_minutes: Number(row.duration_minutes) || 0,
    duration_seconds: Number(row.duration_seconds) || 0,
    total_messages: Number(row.total_messages) || 0,
    user_messages: Number(row.user_messages) || 0,
    assistant_messages: Number(row.assistant_messages) || 0,
    messages_per_minute: Number(row.messages_per_minute) || 0,
    engagement_rate: Number(row.engagement_rate) || 0,
    session_id: String(row.session_id || ''),
    conversation: String(row.conversation || ''),
    conversation_summary: String(row.conversation_summary || ''),
    conversation_timeline_points: parseJsonArray(row.conversation_timeline_points as string),
    timeline_notes: String(row.timeline_notes || ''),
    info_shared_by_assistant: parseJsonArray(row.info_shared_by_assistant as string),
    links_shared: parseJsonArray(row.links_shared as string),
    open_loops_or_commitments: parseJsonArray(row.open_loops_or_commitments as string),
    detected_phone_numbers: parseJsonArray(row.detected_phone_numbers as string),
    detected_emails: parseJsonArray(row.detected_emails as string),
    primary_topic: String(row.primary_topic || 'General Inquiry'),
    secondary_topics: parseJsonArray(row.secondary_topics as string),
    use_case_category: String(row.use_case_category || 'Other'),
    need_summary: String(row.need_summary || ''),
    lead_score: Number(row.lead_score) || 50,
    intent_level: (row.intent_level as Lead['intent_level']) || 'medium',
    buyer_stage: (row.buyer_stage as Lead['buyer_stage']) || 'awareness',
    urgency: (row.urgency as Lead['urgency']) || 'medium',
    is_hot_lead: Boolean(row.is_hot_lead),
    sentiment_overall: (row.sentiment_overall as Lead['sentiment_overall']) || 'neutral',
    emotional_intensity: (row.emotional_intensity as Lead['emotional_intensity']) || 'moderate',
    motivation_type: String(row.motivation_type || 'Unknown'),
    trust_level: (row.trust_level as Lead['trust_level']) || 'medium',
    next_action: String(row.next_action || ''),
    recommended_routing: String(row.recommended_routing || 'Sales Team'),
    needs_immediate_followup: Boolean(row.needs_immediate_followup),
    key_questions: parseJsonArray(row.key_questions as string),
    main_objections: parseJsonArray(row.main_objections as string),
    competitors_mentioned: parseJsonArray(row.competitors_mentioned as string),
    budget_bucket_inr: String(row.budget_bucket_inr || 'Unknown'),
    estimated_scale: String(row.estimated_scale || 'Unknown'),
    partner_intent: Boolean(row.partner_intent),
    is_enterprise: Boolean(row.is_enterprise),
    is_partner: Boolean(row.is_partner),
    completeness: Number(row.completeness) || 50,
    isValid: Boolean(row.is_valid !== false),
    missingFields: parseJsonArray(row.missing_fields as string),
    has_phone: Boolean(row.has_phone),
    has_email: Boolean(row.has_email),
    has_company: Boolean(row.has_company),
    source: String(row.source || 'redis'),
    channel: String(row.channel || 'WhatsApp'),
    created_at: String(row.created_at || new Date().toISOString()),
    updated_at: String(row.updated_at || new Date().toISOString()),
    assigned_to: row.assigned_to ? String(row.assigned_to) : undefined,
    status: (row.status as Lead['status']) || 'new',
    synced_to: parseJsonArray(row.synced_to as string),
  };
}

// ============================================
// LEADS DATABASE OPERATIONS
// ============================================
export const leadsDb = {
  async getAll(): Promise<Lead[]> {
    const { data, error } = await getSupabase()
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[DB] Error fetching leads:', error);
      return [];
    }
    return (data || []).map(row => rowToLead(row));
  },

  async getById(id: string): Promise<Lead | null> {
    const { data, error } = await getSupabase()
      .from('leads')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return null;
    return rowToLead(data);
  },

  async insert(lead: Lead): Promise<void> {
    const { error } = await getSupabase()
      .from('leads')
      .upsert({
        id: lead.id,
        prospect_name: lead.prospect_name,
        phone: lead.phone,
        email: lead.email,
        company_name: lead.company_name,
        region: lead.region,
        conversation_date: lead.conversation_date,
        start_time_ist: lead.start_time_ist,
        end_time_ist: lead.end_time_ist,
        duration_minutes: lead.duration_minutes,
        duration_seconds: lead.duration_seconds || 0,
        total_messages: lead.total_messages,
        user_messages: lead.user_messages,
        assistant_messages: lead.assistant_messages,
        messages_per_minute: lead.messages_per_minute || 0,
        engagement_rate: lead.engagement_rate || 0,
        session_id: lead.session_id || '',
        conversation: lead.conversation,
        conversation_summary: lead.conversation_summary,
        conversation_timeline_points: JSON.stringify(lead.conversation_timeline_points),
        timeline_notes: lead.timeline_notes || '',
        info_shared_by_assistant: JSON.stringify(lead.info_shared_by_assistant || []),
        links_shared: JSON.stringify(lead.links_shared || []),
        open_loops_or_commitments: JSON.stringify(lead.open_loops_or_commitments || []),
        detected_phone_numbers: JSON.stringify(lead.detected_phone_numbers || []),
        detected_emails: JSON.stringify(lead.detected_emails || []),
        primary_topic: lead.primary_topic,
        secondary_topics: JSON.stringify(lead.secondary_topics),
        use_case_category: lead.use_case_category,
        need_summary: lead.need_summary,
        lead_score: lead.lead_score,
        intent_level: lead.intent_level,
        buyer_stage: lead.buyer_stage,
        urgency: lead.urgency,
        is_hot_lead: lead.is_hot_lead,
        sentiment_overall: lead.sentiment_overall,
        emotional_intensity: lead.emotional_intensity,
        motivation_type: lead.motivation_type,
        trust_level: lead.trust_level,
        next_action: lead.next_action,
        recommended_routing: lead.recommended_routing,
        needs_immediate_followup: lead.needs_immediate_followup,
        key_questions: JSON.stringify(lead.key_questions),
        main_objections: JSON.stringify(lead.main_objections),
        competitors_mentioned: JSON.stringify(lead.competitors_mentioned),
        budget_bucket_inr: lead.budget_bucket_inr,
        estimated_scale: lead.estimated_scale,
        partner_intent: lead.partner_intent,
        is_enterprise: lead.is_enterprise,
        is_partner: lead.is_partner,
        completeness: lead.completeness,
        is_valid: lead.isValid,
        missing_fields: JSON.stringify(lead.missingFields),
        has_phone: lead.has_phone,
        has_email: lead.has_email,
        has_company: lead.has_company,
        source: lead.source,
        channel: lead.channel,
        created_at: lead.created_at,
        updated_at: lead.updated_at,
        assigned_to: lead.assigned_to || null,
        status: lead.status,
        synced_to: JSON.stringify(lead.synced_to || [])
      });

    if (error) {
      console.error('[DB] Error inserting lead:', error);
      throw error;
    }
  },

  async markSyncedTo(id: string, integration: string): Promise<void> {
    const lead = await this.getById(id);
    if (!lead) return;

    const syncedTo = lead.synced_to || [];
    if (!syncedTo.includes(integration)) {
      syncedTo.push(integration);
      await getSupabase()
        .from('leads')
        .update({
          synced_to: JSON.stringify(syncedTo),
          updated_at: new Date().toISOString()
        })
        .eq('id', id);
    }
  },

  async isSyncedTo(id: string, integration: string): Promise<boolean> {
    const lead = await this.getById(id);
    if (!lead) return false;
    return (lead.synced_to || []).includes(integration);
  },

  async getUnsyncedTo(integration: string): Promise<Lead[]> {
    const allLeads = await this.getAll();
    return allLeads.filter(lead => !(lead.synced_to || []).includes(integration));
  },

  async updateStatus(id: string, status: Lead['status']): Promise<void> {
    const { error } = await getSupabase()
      .from('leads')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.error('[DB] Error updating lead status:', error);
    }
  },

  async delete(id: string): Promise<void> {
    const { error } = await getSupabase()
      .from('leads')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[DB] Error deleting lead:', error);
    }
  },

  async isSessionProcessed(sessionId: string): Promise<boolean> {
    const { data } = await getSupabase()
      .from('processed_sessions')
      .select('session_id')
      .eq('session_id', sessionId)
      .single();

    return !!data;
  },

  async isConversationDuplicate(conversation: string): Promise<boolean> {
    // Check if this exact conversation already exists in the database
    const { data } = await getSupabase()
      .from('leads')
      .select('id')
      .eq('conversation', conversation)
      .limit(1);

    return !!(data && data.length > 0);
  },

  async markSessionProcessed(sessionId: string, redisKey: string): Promise<void> {
    await getSupabase()
      .from('processed_sessions')
      .upsert({
        session_id: sessionId,
        processed_at: new Date().toISOString(),
        redis_key: redisKey
      });
  },
};

// ============================================
// ORGANIZATIONS DATABASE OPERATIONS
// ============================================
export const organizationsDb = {
  async create(org: Omit<Organization, 'createdAt' | 'updatedAt'>): Promise<Organization> {
    const now = new Date().toISOString();
    const fullOrg: Organization = {
      ...org,
      createdAt: now,
      updatedAt: now,
    };

    const { error } = await getSupabase()
      .from('organizations')
      .insert({
        id: fullOrg.id,
        name: fullOrg.name,
        slug: fullOrg.slug,
        logo: fullOrg.logo || null,
        industry: fullOrg.industry || null,
        size: fullOrg.size || 'small',
        timezone: fullOrg.timezone,
        created_at: fullOrg.createdAt,
        updated_at: fullOrg.updatedAt,
        owner_id: fullOrg.ownerId,
        settings: fullOrg.settings
      });

    if (error) {
      console.error('[DB] Error creating organization:', error);
      throw error;
    }

    return fullOrg;
  },

  async getById(id: string): Promise<Organization | null> {
    const { data, error } = await getSupabase()
      .from('organizations')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return null;

    return {
      id: String(data.id),
      name: String(data.name),
      slug: String(data.slug),
      logo: data.logo ? String(data.logo) : undefined,
      industry: data.industry ? String(data.industry) : undefined,
      size: (data.size as Organization['size']) || 'small',
      timezone: String(data.timezone || 'Asia/Kolkata'),
      createdAt: String(data.created_at),
      updatedAt: String(data.updated_at),
      ownerId: String(data.owner_id),
      settings: parseJsonObject<OrganizationSettings>(data.settings, {
        allowSignups: false,
        defaultRole: 'viewer',
        requireEmailVerification: false,
        leadAssignmentMode: 'manual',
      }),
    };
  },

  async getBySlug(slug: string): Promise<Organization | null> {
    const { data, error } = await getSupabase()
      .from('organizations')
      .select('*')
      .eq('slug', slug)
      .single();

    if (error || !data) return null;
    return this.getById(data.id);
  },

  async update(id: string, updates: Partial<Organization>): Promise<void> {
    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.slug !== undefined) updateData.slug = updates.slug;
    if (updates.logo !== undefined) updateData.logo = updates.logo;
    if (updates.industry !== undefined) updateData.industry = updates.industry;
    if (updates.size !== undefined) updateData.size = updates.size;
    if (updates.timezone !== undefined) updateData.timezone = updates.timezone;
    if (updates.settings !== undefined) updateData.settings = updates.settings;

    await getSupabase()
      .from('organizations')
      .update(updateData)
      .eq('id', id);
  },

  async delete(id: string): Promise<void> {
    await getSupabase()
      .from('organizations')
      .delete()
      .eq('id', id);
  },

  async transferOwnership(orgId: string, newOwnerId: string): Promise<void> {
    await getSupabase()
      .from('organizations')
      .update({ owner_id: newOwnerId, updated_at: new Date().toISOString() })
      .eq('id', orgId);
  },
};

// ============================================
// USERS DATABASE OPERATIONS
// ============================================
export const usersDb = {
  async create(user: Omit<User, 'createdAt' | 'updatedAt'> & { passwordHash: string }): Promise<User> {
    const now = new Date().toISOString();

    const { error } = await getSupabase()
      .from('users')
      .insert({
        id: user.id,
        email: user.email,
        name: user.name,
        password_hash: user.passwordHash,
        role: user.role,
        created_at: now,
        updated_at: now,
        phone: user.phone || null,
        avatar: user.avatar || null,
        title: user.title || null,
        organization_id: user.organizationId || null,
        status: user.status || 'active',
        last_login_at: user.lastLoginAt || null,
        preferences: user.preferences || DEFAULT_USER_PREFERENCES,
        two_factor_enabled: user.twoFactorEnabled || false,
        email_verified: user.emailVerified || false
      });

    if (error) {
      console.error('[DB] Error creating user:', error);
      throw error;
    }

    return { ...user, createdAt: now, updatedAt: now };
  },

  async getById(id: string): Promise<(User & { passwordHash: string }) | null> {
    const { data, error } = await getSupabase()
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return null;
    return this.rowToUser(data);
  },

  async getByEmail(email: string): Promise<(User & { passwordHash: string }) | null> {
    const { data, error } = await getSupabase()
      .from('users')
      .select('*')
      .ilike('email', email)
      .single();

    if (error || !data) return null;
    return this.rowToUser(data);
  },

  async getByOrganization(orgId: string): Promise<User[]> {
    const { data, error } = await getSupabase()
      .from('users')
      .select('*')
      .eq('organization_id', orgId);

    if (error || !data) return [];
    return data.map(row => {
      const user = this.rowToUser(row);
      const { passwordHash: _, ...userWithoutPassword } = user;
      return userWithoutPassword as User;
    });
  },

  rowToUser(row: Record<string, unknown>): User & { passwordHash: string } {
    return {
      id: String(row.id),
      email: String(row.email),
      name: String(row.name),
      passwordHash: String(row.password_hash),
      role: (row.role as UserRole) || 'viewer',
      createdAt: String(row.created_at),
      updatedAt: row.updated_at ? String(row.updated_at) : undefined,
      phone: row.phone ? String(row.phone) : undefined,
      avatar: row.avatar ? String(row.avatar) : undefined,
      title: row.title ? String(row.title) : undefined,
      organizationId: row.organization_id ? String(row.organization_id) : undefined,
      status: (row.status as User['status']) || 'active',
      lastLoginAt: row.last_login_at ? String(row.last_login_at) : undefined,
      preferences: parseJsonObject<UserPreferences>(row.preferences as string, DEFAULT_USER_PREFERENCES),
      twoFactorEnabled: Boolean(row.two_factor_enabled),
      emailVerified: Boolean(row.email_verified),
    };
  },

  async update(id: string, updates: Partial<User & { passwordHash?: string }>): Promise<void> {
    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (updates.email !== undefined) updateData.email = updates.email;
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.passwordHash !== undefined) updateData.password_hash = updates.passwordHash;
    if (updates.role !== undefined) updateData.role = updates.role;
    if (updates.phone !== undefined) updateData.phone = updates.phone;
    if (updates.avatar !== undefined) updateData.avatar = updates.avatar;
    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.organizationId !== undefined) updateData.organization_id = updates.organizationId;
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.lastLoginAt !== undefined) updateData.last_login_at = updates.lastLoginAt;
    if (updates.preferences !== undefined) updateData.preferences = updates.preferences;
    if (updates.twoFactorEnabled !== undefined) updateData.two_factor_enabled = updates.twoFactorEnabled;
    if (updates.emailVerified !== undefined) updateData.email_verified = updates.emailVerified;

    await getSupabase()
      .from('users')
      .update(updateData)
      .eq('id', id);
  },

  async updateLoginTime(id: string): Promise<void> {
    await getSupabase()
      .from('users')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', id);
  },

  async delete(id: string): Promise<void> {
    await getSupabase()
      .from('users')
      .delete()
      .eq('id', id);
  },
};

// ============================================
// TEAM MEMBERS DATABASE OPERATIONS
// ============================================
export const teamMembersDb = {
  async add(member: Omit<TeamMember, 'user'>): Promise<void> {
    await getSupabase()
      .from('team_members')
      .upsert({
        id: member.id,
        user_id: member.userId,
        organization_id: member.organizationId,
        role: member.role,
        joined_at: member.joinedAt,
        invited_by: member.invitedBy || null
      });
  },

  async getByOrganization(orgId: string): Promise<TeamMember[]> {
    const { data, error } = await getSupabase()
      .from('team_members')
      .select(`
        *,
        users (id, email, name, avatar, status, last_login_at)
      `)
      .eq('organization_id', orgId)
      .order('joined_at', { ascending: false });

    if (error || !data) return [];

    return data
      .filter(row => row.users) // Filter out rows without user data
      .map(row => ({
        id: String(row.id),
        userId: String(row.user_id),
        organizationId: String(row.organization_id),
        role: (row.role as UserRole) || 'viewer',
        joinedAt: String(row.joined_at),
        invitedBy: row.invited_by ? String(row.invited_by) : undefined,
        user: {
          id: String(row.users!.id),
          email: String(row.users!.email),
          name: String(row.users!.name),
          avatar: row.users!.avatar ? String(row.users!.avatar) : undefined,
          status: (row.users!.status as User['status']) || 'active',
          lastLoginAt: row.users!.last_login_at ? String(row.users!.last_login_at) : undefined,
        },
      }));
  },

  async getMember(userId: string, orgId: string): Promise<TeamMember | null> {
    const { data, error } = await getSupabase()
      .from('team_members')
      .select(`
        *,
        users (id, email, name, avatar, status, last_login_at)
      `)
      .eq('user_id', userId)
      .eq('organization_id', orgId)
      .single();

    if (error || !data || !data.users) return null;

    return {
      id: String(data.id),
      userId: String(data.user_id),
      organizationId: String(data.organization_id),
      role: (data.role as UserRole) || 'viewer',
      joinedAt: String(data.joined_at),
      invitedBy: data.invited_by ? String(data.invited_by) : undefined,
      user: {
        id: String(data.users.id),
        email: String(data.users.email),
        name: String(data.users.name),
        avatar: data.users.avatar ? String(data.users.avatar) : undefined,
        status: (data.users.status as User['status']) || 'active',
        lastLoginAt: data.users.last_login_at ? String(data.users.last_login_at) : undefined,
      },
    };
  },

  async updateRole(userId: string, orgId: string, role: UserRole): Promise<void> {
    await getSupabase()
      .from('team_members')
      .update({ role })
      .eq('user_id', userId)
      .eq('organization_id', orgId);

    // Also update the user's role
    await getSupabase()
      .from('users')
      .update({ role })
      .eq('id', userId);
  },

  async remove(userId: string, orgId: string): Promise<void> {
    await getSupabase()
      .from('team_members')
      .delete()
      .eq('user_id', userId)
      .eq('organization_id', orgId);
  },
};

// ============================================
// INVITATIONS DATABASE OPERATIONS
// ============================================
export const invitationsDb = {
  async create(invitation: Invitation): Promise<void> {
    await getSupabase()
      .from('invitations')
      .insert({
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        organization_id: invitation.organizationId,
        invited_by: invitation.invitedBy,
        invited_by_name: invitation.invitedByName,
        created_at: invitation.createdAt,
        expires_at: invitation.expiresAt,
        status: invitation.status,
        token: invitation.token
      });
  },

  async getByToken(token: string): Promise<Invitation | null> {
    const { data, error } = await getSupabase()
      .from('invitations')
      .select('*')
      .eq('token', token)
      .single();

    if (error || !data) return null;
    return this.rowToInvitation(data);
  },

  async getByOrganization(orgId: string): Promise<Invitation[]> {
    const { data, error } = await getSupabase()
      .from('invitations')
      .select('*')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });

    if (error || !data) return [];
    return data.map(row => this.rowToInvitation(row));
  },

  async getPendingByEmail(email: string, orgId: string): Promise<Invitation | null> {
    const { data, error } = await getSupabase()
      .from('invitations')
      .select('*')
      .ilike('email', email)
      .eq('organization_id', orgId)
      .eq('status', 'pending')
      .single();

    if (error || !data) return null;
    return this.rowToInvitation(data);
  },

  rowToInvitation(row: Record<string, unknown>): Invitation {
    return {
      id: String(row.id),
      email: String(row.email),
      role: (row.role as UserRole) || 'viewer',
      organizationId: String(row.organization_id),
      invitedBy: String(row.invited_by),
      invitedByName: String(row.invited_by_name),
      createdAt: String(row.created_at),
      expiresAt: String(row.expires_at),
      status: (row.status as Invitation['status']) || 'pending',
      token: String(row.token),
    };
  },

  async updateStatus(id: string, status: Invitation['status']): Promise<void> {
    await getSupabase()
      .from('invitations')
      .update({ status })
      .eq('id', id);
  },

  async delete(id: string): Promise<void> {
    await getSupabase()
      .from('invitations')
      .delete()
      .eq('id', id);
  },
};

// ============================================
// AUDIT LOGS DATABASE OPERATIONS
// ============================================
export const auditLogsDb = {
  async create(entry: Omit<AuditLogEntry, 'id' | 'createdAt'>): Promise<void> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await getSupabase()
      .from('audit_logs')
      .insert({
        id,
        organization_id: entry.organizationId,
        user_id: entry.userId,
        user_name: entry.userName,
        action: entry.action,
        resource: entry.resource,
        resource_id: entry.resourceId || null,
        details: entry.details || null,
        ip_address: entry.ipAddress || null,
        user_agent: entry.userAgent || null,
        created_at: now
      });
  },

  async getByOrganization(orgId: string, limit = 100): Promise<AuditLogEntry[]> {
    const { data, error } = await getSupabase()
      .from('audit_logs')
      .select('*')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error || !data) return [];

    return data.map(row => ({
      id: String(row.id),
      organizationId: String(row.organization_id),
      userId: String(row.user_id),
      userName: String(row.user_name),
      action: String(row.action),
      resource: String(row.resource),
      resourceId: row.resource_id ? String(row.resource_id) : undefined,
      details: row.details as Record<string, unknown> | undefined,
      ipAddress: row.ip_address ? String(row.ip_address) : undefined,
      userAgent: row.user_agent ? String(row.user_agent) : undefined,
      createdAt: String(row.created_at),
    }));
  },
};

// ============================================
// API KEYS DATABASE OPERATIONS
// ============================================
export const apiKeysDb = {
  async create(key: Omit<ApiKey, 'id' | 'createdAt'> & { keyHash: string; organizationId: string; createdBy: string }): Promise<ApiKey> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await getSupabase()
      .from('api_keys')
      .insert({
        id,
        name: key.name,
        key_hash: key.keyHash,
        key_prefix: key.keyPrefix,
        permissions: key.permissions,
        organization_id: key.organizationId,
        created_at: now,
        expires_at: key.expiresAt || null,
        created_by: key.createdBy
      });

    return {
      id,
      name: key.name,
      keyPrefix: key.keyPrefix,
      permissions: key.permissions,
      createdAt: now,
      expiresAt: key.expiresAt,
      createdBy: key.createdBy,
    };
  },

  async getByOrganization(orgId: string): Promise<ApiKey[]> {
    const { data, error } = await getSupabase()
      .from('api_keys')
      .select('*')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });

    if (error || !data) return [];

    return data.map(row => ({
      id: String(row.id),
      name: String(row.name),
      keyPrefix: String(row.key_prefix),
      permissions: parseJsonArray(row.permissions),
      createdAt: String(row.created_at),
      lastUsedAt: row.last_used_at ? String(row.last_used_at) : undefined,
      expiresAt: row.expires_at ? String(row.expires_at) : undefined,
      createdBy: String(row.created_by),
    }));
  },

  async updateLastUsed(id: string): Promise<void> {
    await getSupabase()
      .from('api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', id);
  },

  async delete(id: string): Promise<void> {
    await getSupabase()
      .from('api_keys')
      .delete()
      .eq('id', id);
  },
};

// Export Supabase client getter for direct access if needed
export default getSupabase;
