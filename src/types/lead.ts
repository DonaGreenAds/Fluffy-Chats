// FluffyChats Lead Types - 50+ fields for comprehensive lead intelligence

export interface Lead {
  // Unique identifier
  id: string;

  // Contact Info
  prospect_name: string;
  phone: string;
  email: string;
  company_name: string;
  region: string;

  // Conversation Metadata
  conversation_date: string;
  start_time_ist: string;
  end_time_ist: string;
  duration_minutes: number;
  duration_seconds?: number;
  total_messages: number;
  user_messages: number;
  assistant_messages: number;
  messages_per_minute?: number;
  engagement_rate?: number;
  session_id?: string;

  // Conversation Content
  conversation: string;
  conversation_summary: string;
  conversation_timeline_points: string[];
  timeline_notes?: string;
  info_shared_by_assistant?: string[];
  links_shared?: string[];
  open_loops_or_commitments?: string[];
  detected_phone_numbers?: string[];
  detected_emails?: string[];

  // Lead Intelligence
  primary_topic: string;
  secondary_topics: string[];
  use_case_category: string;
  need_summary: string;

  // Sales Scoring
  lead_score: number;
  intent_level: 'low' | 'medium' | 'high';
  buyer_stage: 'awareness' | 'consideration' | 'decision';
  urgency: 'low' | 'medium' | 'high' | 'critical';
  is_hot_lead: boolean;

  // Psychological Analysis
  sentiment_overall: 'negative' | 'neutral' | 'positive' | 'very_positive';
  emotional_intensity: 'low' | 'moderate' | 'high';
  motivation_type: string;
  trust_level: 'low' | 'medium' | 'high';

  // Sales Actions
  next_action: string;
  recommended_routing: string;
  needs_immediate_followup: boolean;

  // Objections & Questions
  key_questions: string[];
  main_objections: string[];
  competitors_mentioned: string[];

  // Business Details
  budget_bucket_inr: string;
  estimated_scale: string;
  partner_intent: boolean;
  is_enterprise: boolean;
  is_partner: boolean;

  // Data Quality
  completeness: number;
  isValid: boolean;
  missingFields: string[];
  has_phone: boolean;
  has_email: boolean;
  has_company: boolean;

  // Source & Channel
  source: string;
  channel: string;

  // Additional metadata
  created_at: string;
  updated_at: string;
  assigned_to?: string;
  status: 'new' | 'contacted' | 'qualified' | 'converted' | 'lost';

  // Sync tracking - which integrations this lead has been synced to
  synced_to?: string[]; // e.g., ['google-sheets', 'hubspot', 'zoho-crm', 'webhook']
}

export interface LeadFilters {
  search: string;
  intent_level: string[];
  buyer_stage: string[];
  urgency: string[];
  is_hot_lead: boolean | null;
  score_min: number;
  score_max: number;
  date_from: string;
  date_to: string;
}

export interface LeadStats {
  total_leads: number;
  high_intent_leads: number;
  hot_leads: number;
  needs_followup: number;
  avg_score: number;
  conversion_rate: number;
  leads_by_stage: Record<string, number>;
  leads_by_intent: Record<string, number>;
  leads_by_source: Record<string, number>;
  leads_over_time: { date: string; count: number }[];
}
