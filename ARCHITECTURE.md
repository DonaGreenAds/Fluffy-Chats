# FluffyChats Architecture

This document explains how the system works for developers taking over the project.

## System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        EXTERNAL SERVICES                            │
├─────────────────────────────────────────────────────────────────────┤
│  WhatsApp Chatbot  →  Upstash Redis  →  Google Gemini / OpenAI      │
│  HubSpot CRM           (conversation      (AI analysis)             │
│  Zoho CRM               cache)                                      │
│  Google Sheets                                                      │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     NEXT.JS APPLICATION                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────────┐    ┌──────────────────┐                      │
│  │   API Routes     │    │   React Pages    │                      │
│  │  /api/leads      │    │  /dashboard      │                      │
│  │  /api/process-   │◄───│  /leads/[id]     │                      │
│  │     chats        │    │                  │                      │
│  │  /api/translate  │    │                  │                      │
│  │  /api/hubspot/*  │    │                  │                      │
│  │  /api/zoho/*     │    │                  │                      │
│  └────────┬─────────┘    └────────┬─────────┘                      │
│           │                       │                                 │
│           ▼                       ▼                                 │
│  ┌──────────────────┐    ┌──────────────────┐                      │
│  │   /src/lib/      │    │  /src/context/   │                      │
│  │  gemini.ts       │    │  LeadContext     │                      │
│  │  redis.ts        │    │  AuthContext     │                      │
│  │  database.ts     │    │                  │                      │
│  └────────┬─────────┘    └──────────────────┘                      │
│           │                                                         │
│           ▼                                                         │
│  ┌──────────────────┐                                              │
│  │  SQLite Database │                                              │
│  │  /data/leads.db  │                                              │
│  └──────────────────┘                                              │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Core Pipeline: How Leads Are Created

### Step 1: WhatsApp Conversations → Redis

Your WhatsApp chatbot (external) stores conversations in Upstash Redis with this key format:
```
chat:+919876543210::product-name::session-id
```

Each key contains JSON:
```json
{
  "messages": [
    { "role": "user", "content": "Hello", "ts": "2024-01-01T12:00:00Z" },
    { "role": "assistant", "content": "Hi! How can I help?", "ts": "2024-01-01T12:00:05Z" }
  ],
  "metadata": {
    "phone": "+919876543210",
    "product": "product-name",
    "email": "user@example.com"
  }
}
```

Keys have a 7-day TTL (time-to-live).

### Step 2: Process Chats API

**File**: `src/app/api/process-chats/route.ts`

When triggered (manually or by cron), this endpoint:

1. **Scans Redis** for all `chat:*` keys
2. **Filters** conversations ready for processing (TTL < 2 hours = conversation likely complete)
3. **Sends to AI** for analysis (Gemini 2.5 Pro, falls back to OpenAI)
4. **Saves to SQLite** as a qualified lead
5. **Marks as processed** in Redis (prevents duplicate processing)

```typescript
// Simplified flow
const keys = await redis.scanChatKeys();
for (const key of keys) {
  const ttl = await redis.getTTL(key);
  if (ttl < 7200 && ttl > 0) {  // Ready to process
    const chatData = await redis.get(key);
    const analysis = await analyzeConversation(chatData);
    await database.insertLead(analysis);
    await redis.markAsProcessed(key);
  }
}
```

### Step 3: AI Analysis

**File**: `src/lib/gemini.ts`

The AI extracts:
- **Contact info**: name, email, phone
- **Intent score**: 0-100 based on BANT framework
- **Summary**: What the customer wants
- **Key details**: Budget, timeline, requirements
- **Recommended actions**: What sales should do

**Important**: Always uses Gemini 2.5 Pro first. If it fails, falls back to OpenAI GPT-4.1-mini.

### Step 4: Database Storage

**File**: `src/lib/database.ts`

SQLite database schema (auto-created):

```sql
CREATE TABLE leads (
  id TEXT PRIMARY KEY,
  name TEXT,
  email TEXT,
  phone TEXT,
  status TEXT DEFAULT 'new',
  intent_score INTEGER,
  summary TEXT,
  conversation TEXT,
  analysis TEXT,         -- Full AI analysis JSON
  source TEXT,
  product TEXT,
  created_at DATETIME,
  updated_at DATETIME
);
```

## Frontend Architecture

### State Management

**File**: `src/context/LeadContext.tsx`

Provides these methods to all components:
- `leads` - All leads (sample + database)
- `webhookLeads` - Database leads only
- `updateLeadStatus(id, status)` - Change lead status
- `markAsContacted(id)` - Shortcut for status='contacted'
- `deleteLead(id)` - Remove a lead
- `refreshWebhookLeads()` - Fetch latest from database
- `triggerProcessing()` - Run process-chats pipeline
- `bulkMarkContacted(ids)` - Batch update
- `bulkDelete(ids)` - Batch delete
- `stats` - Computed statistics

**Smart Polling**: Only polls when browser tab is visible (saves bandwidth).

### Authentication

**File**: `src/context/AuthContext.tsx`

Simple password-based auth:
- Compares against `APP_PASSWORD` environment variable
- Stores session in localStorage
- No user accounts, just one shared password

### Key Components

| Component | File | Purpose |
|-----------|------|---------|
| LeadTable | `src/components/LeadTable.tsx` | Main table with filtering, sorting, bulk actions |
| LeadDetail | `src/components/LeadDetail.tsx` | Full lead view with chat transcript |
| StatsCards | `src/components/StatsCards.tsx` | Dashboard statistics |
| IntentChart | `src/components/IntentChart.tsx` | Lead intent visualization |
| SettingsModal | `src/components/SettingsModal.tsx` | CRM integration settings |

## API Endpoints Reference

### Leads CRUD

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/leads` | Get all leads |
| GET | `/api/leads/[id]` | Get single lead |
| PATCH | `/api/leads/[id]` | Update lead (status, etc.) |
| DELETE | `/api/leads/[id]` | Delete lead |

### Processing

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/process-chats` | Process pending conversations |
| POST | `/api/translate` | Translate conversation text |

### CRM Integrations

**HubSpot**:
| Endpoint | Purpose |
|----------|---------|
| `/api/hubspot/auth` | OAuth redirect URL |
| `/api/hubspot/callback` | OAuth callback |
| `/api/hubspot/sync` | Sync all leads to HubSpot |
| `/api/hubspot/sync-lead` | Sync single lead |
| `/api/hubspot/status` | Check connection status |
| `/api/hubspot/disconnect` | Remove OAuth tokens |

**Zoho** and **Google Sheets**: Same pattern as HubSpot.

## Environment Variables

```bash
# Required - AI APIs
GEMINI_API_KEY=           # Google AI API key (primary)
OPENAI_API_KEY=           # OpenAI API key (fallback - required!)

# Required - Redis
UPSTASH_REDIS_URL=        # Upstash Redis REST URL
UPSTASH_REDIS_TOKEN=      # Upstash Redis auth token

# Required - Auth
APP_PASSWORD=             # Dashboard login password

# Optional - CRM Integrations
HUBSPOT_CLIENT_ID=
HUBSPOT_CLIENT_SECRET=
ZOHO_CLIENT_ID=
ZOHO_CLIENT_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Optional - Email Notifications
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
NOTIFICATION_EMAIL=
```

## Lead Scoring Logic

The AI scores leads 0-100 using BANT framework:

- **B**udget: Does customer have money to spend?
- **A**uthority: Is this a decision maker?
- **N**eed: Do they have a clear problem to solve?
- **T**imeline: When do they want to buy?

Score interpretation:
- **70-100**: High intent - ready to buy, prioritize
- **40-69**: Medium intent - needs nurturing
- **0-39**: Low intent - early stage or just browsing

## Common Modifications

### Change AI Prompts

Edit `src/lib/gemini.ts`, look for `ANALYSIS_PROMPT`:
```typescript
const ANALYSIS_PROMPT = `
  Analyze this WhatsApp conversation...
  // Modify the prompt here
`;
```

### Add New Fields to Leads

1. Update `src/types/lead.ts`
2. Update database schema in `src/lib/database.ts`
3. Update AI prompt to extract new field
4. Update UI components to display it

### Add New CRM Integration

1. Create folder: `src/app/api/[crm-name]/`
2. Add endpoints: `auth/`, `callback/`, `sync/`, `status/`, `disconnect/`
3. Add OAuth token storage (currently uses filesystem)
4. Add UI in `src/components/SettingsModal.tsx`

### Change Polling Interval

In `src/context/LeadContext.tsx`:
```typescript
interval = setInterval(refreshWebhookLeads, 30000);  // Change 30000 to desired ms
```

## Deployment Notes

### Netlify (Current)

Uses `netlify.toml` configuration. SQLite database is stored in ephemeral storage (data may be lost on redeploy).

### Other Platforms

Requirements:
1. Node.js 18+
2. Writable filesystem for SQLite (or switch to PostgreSQL)
3. Environment variables set
4. Build command: `npm run build`
5. Start command: `npm start`

For persistent data, consider:
- Switching to PostgreSQL/MySQL
- Using Turso (SQLite edge database)
- Moving SQLite to persistent volume
