-- FluffyChats Supabase Schema
-- Run this in Supabase SQL Editor (https://supabase.com/dashboard/project/mtzemdaujsyuzumpjlmr/sql/new)

-- Leads table
CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,
  prospect_name TEXT,
  phone TEXT,
  email TEXT,
  company_name TEXT,
  region TEXT,
  conversation_date TEXT,
  start_time_ist TEXT,
  end_time_ist TEXT,
  duration_minutes INTEGER DEFAULT 0,
  duration_seconds INTEGER DEFAULT 0,
  total_messages INTEGER DEFAULT 0,
  user_messages INTEGER DEFAULT 0,
  assistant_messages INTEGER DEFAULT 0,
  messages_per_minute REAL DEFAULT 0,
  engagement_rate REAL DEFAULT 0,
  session_id TEXT,
  conversation TEXT,
  conversation_summary TEXT,
  conversation_timeline_points TEXT,
  timeline_notes TEXT,
  info_shared_by_assistant TEXT,
  links_shared TEXT,
  open_loops_or_commitments TEXT,
  detected_phone_numbers TEXT,
  detected_emails TEXT,
  primary_topic TEXT,
  secondary_topics TEXT,
  use_case_category TEXT,
  need_summary TEXT,
  lead_score INTEGER DEFAULT 50,
  intent_level TEXT DEFAULT 'medium',
  buyer_stage TEXT DEFAULT 'awareness',
  urgency TEXT DEFAULT 'medium',
  is_hot_lead BOOLEAN DEFAULT false,
  sentiment_overall TEXT DEFAULT 'neutral',
  emotional_intensity TEXT DEFAULT 'moderate',
  motivation_type TEXT,
  trust_level TEXT DEFAULT 'medium',
  next_action TEXT,
  recommended_routing TEXT,
  needs_immediate_followup BOOLEAN DEFAULT false,
  key_questions TEXT,
  main_objections TEXT,
  competitors_mentioned TEXT,
  budget_bucket_inr TEXT,
  estimated_scale TEXT,
  partner_intent BOOLEAN DEFAULT false,
  is_enterprise BOOLEAN DEFAULT false,
  is_partner BOOLEAN DEFAULT false,
  completeness INTEGER DEFAULT 50,
  is_valid BOOLEAN DEFAULT true,
  missing_fields TEXT,
  has_phone BOOLEAN DEFAULT false,
  has_email BOOLEAN DEFAULT false,
  has_company BOOLEAN DEFAULT false,
  source TEXT DEFAULT 'redis',
  channel TEXT DEFAULT 'WhatsApp',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_to TEXT,
  status TEXT DEFAULT 'new',
  synced_to TEXT DEFAULT '[]',
  organization_id TEXT
);

-- Processed sessions table
CREATE TABLE IF NOT EXISTS processed_sessions (
  session_id TEXT PRIMARY KEY,
  processed_at TIMESTAMPTZ DEFAULT NOW(),
  redis_key TEXT
);

-- Organizations table
CREATE TABLE IF NOT EXISTS organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo TEXT,
  industry TEXT,
  size TEXT DEFAULT 'small',
  timezone TEXT DEFAULT 'Asia/Kolkata',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  owner_id TEXT NOT NULL,
  settings JSONB DEFAULT '{}'
);

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'viewer',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  phone TEXT,
  avatar TEXT,
  title TEXT,
  organization_id TEXT,
  status TEXT DEFAULT 'active',
  last_login_at TIMESTAMPTZ,
  preferences JSONB DEFAULT '{}',
  two_factor_enabled BOOLEAN DEFAULT false,
  email_verified BOOLEAN DEFAULT false
);

-- Team members table
CREATE TABLE IF NOT EXISTS team_members (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  organization_id TEXT NOT NULL,
  role TEXT DEFAULT 'viewer',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  invited_by TEXT,
  UNIQUE(user_id, organization_id)
);

-- Invitations table
CREATE TABLE IF NOT EXISTS invitations (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  role TEXT DEFAULT 'viewer',
  organization_id TEXT NOT NULL,
  invited_by TEXT NOT NULL,
  invited_by_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'pending',
  token TEXT UNIQUE NOT NULL
);

-- Audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  action TEXT NOT NULL,
  resource TEXT NOT NULL,
  resource_id TEXT,
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- API keys table
CREATE TABLE IF NOT EXISTS api_keys (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  key_hash TEXT UNIQUE NOT NULL,
  key_prefix TEXT NOT NULL,
  permissions JSONB DEFAULT '[]',
  organization_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_by TEXT NOT NULL
);

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  device TEXT,
  browser TEXT,
  os TEXT,
  location TEXT,
  ip TEXT,
  last_active TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_current BOOLEAN DEFAULT false
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_organization ON leads(organization_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_organization ON users(organization_id);
CREATE INDEX IF NOT EXISTS idx_team_members_org ON team_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_org ON audit_logs(organization_id);

-- Enable Row Level Security (optional - can be configured later)
-- ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
