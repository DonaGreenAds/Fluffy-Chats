# FluffyChats - Lead Intelligence Dashboard

A sales automation platform that transforms WhatsApp conversations into qualified leads using AI analysis.

## What This App Does

1. **Receives WhatsApp conversations** from your chatbot webhook
2. **Analyzes them with AI** (Gemini/OpenAI) to extract lead information
3. **Scores leads** using BANT/MEDDIC/CHAMP sales frameworks
4. **Displays leads** in a dashboard for your sales team
5. **Syncs to CRMs** (HubSpot, Zoho, Google Sheets)

## Quick Start

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local
# Fill in your API keys in .env.local

# Run development server
npm run dev

# Open http://localhost:3000
```

## Project Structure

```
fluffychats/
├── src/
│   ├── app/                    # Next.js pages and API routes
│   │   ├── api/               # Backend API endpoints
│   │   │   ├── leads/         # CRUD operations for leads
│   │   │   ├── process-chats/ # Main pipeline: Redis → AI → SQLite
│   │   │   ├── translate/     # Conversation translation
│   │   │   ├── hubspot/       # HubSpot CRM sync
│   │   │   ├── zoho/          # Zoho CRM sync
│   │   │   └── google-sheets/ # Google Sheets sync
│   │   ├── dashboard/         # Main dashboard page
│   │   └── leads/[id]/        # Individual lead detail page
│   │
│   ├── components/            # React UI components
│   │   ├── LeadTable.tsx      # Main leads table with filters
│   │   ├── LeadDetail.tsx     # Lead detail view with chat
│   │   ├── StatsCards.tsx     # Dashboard statistics
│   │   └── ...
│   │
│   ├── context/               # React state management
│   │   ├── LeadContext.tsx    # Lead data & operations
│   │   └── AuthContext.tsx    # Simple password auth
│   │
│   ├── lib/                   # Core utilities
│   │   ├── gemini.ts          # AI analysis (Gemini + OpenAI fallback)
│   │   ├── redis.ts           # Upstash Redis client
│   │   ├── database.ts        # SQLite operations
│   │   └── integration-utils.ts # Shared validation helpers
│   │
│   └── types/                 # TypeScript definitions
│       └── lead.ts            # Lead data structure
│
├── data/                      # SQLite database file (auto-created)
└── .env.local                 # Your API keys (create from .env.example)
```

## How Data Flows

```
WhatsApp Chatbot
       │
       ▼
   Upstash Redis (temporary storage, 7-day TTL)
       │
       ▼
   /api/process-chats (triggered manually or by cron)
       │
       ▼
   AI Analysis (Gemini 2.5 Pro → OpenAI fallback)
       │
       ▼
   SQLite Database (permanent storage)
       │
       ▼
   Dashboard UI (polls every 30 seconds)
       │
       ▼
   CRM Sync (HubSpot/Zoho/Google Sheets)
```

## Key Files to Understand

| File | Purpose |
|------|---------|
| `src/lib/gemini.ts` | AI analysis engine - extracts lead info from conversations |
| `src/lib/redis.ts` | Fetches raw conversations from Upstash Redis |
| `src/lib/database.ts` | SQLite CRUD operations for leads |
| `src/app/api/process-chats/route.ts` | Main pipeline connecting all pieces |
| `src/context/LeadContext.tsx` | Frontend state management for leads |

## Environment Variables

See `.env.example` for all required variables:

- `GEMINI_API_KEY` - Google AI API key (primary)
- `OPENAI_API_KEY` - OpenAI API key (fallback)
- `UPSTASH_REDIS_URL` - Redis connection URL
- `UPSTASH_REDIS_TOKEN` - Redis auth token
- `APP_PASSWORD` - Dashboard login password

## AI Models Used

- **Primary**: Gemini 2.5 Pro (for both analysis and translation)
- **Fallback**: OpenAI GPT-4.1-mini (when Gemini fails)

The fallback is important because Gemini can be unreliable. Both must be configured.

## Lead Scoring

Leads are scored 0-100 based on BANT framework:
- **0-39**: Low intent (gray badge)
- **40-69**: Medium intent (yellow badge)
- **70-100**: High intent (green badge)

## Common Tasks

### Process new conversations manually
Click "Process Chats" button in dashboard, or call:
```
GET /api/process-chats
```

### Add a new CRM integration
1. Create new folder in `src/app/api/[crm-name]/`
2. Add OAuth and sync endpoints
3. Add UI in settings modal

### Change AI analysis prompts
Edit the `ANALYSIS_PROMPT` in `src/lib/gemini.ts`

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Database**: SQLite (better-sqlite3)
- **Cache**: Upstash Redis (REST API)
- **AI**: Google Gemini + OpenAI
- **UI**: Tailwind CSS + Lucide icons
- **Charts**: Recharts

## Deployment

The app is configured for Netlify deployment. See `netlify.toml` for settings.

For other platforms, ensure:
1. Node.js 18+ environment
2. Writable filesystem for SQLite database
3. All environment variables set
# Trigger redeploy Mon Dec 15 06:51:34 IST 2025
