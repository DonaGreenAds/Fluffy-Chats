/**
 * =============================================================================
 * AI CONVERSATION ANALYSIS ENGINE
 * =============================================================================
 *
 * Purpose: Analyzes WhatsApp sales conversations using AI to extract lead
 * intelligence, score prospects, and recommend sales actions.
 *
 * AI Providers:
 * - Primary: Google Gemini 2.5 Pro (preferred for latest capabilities)
 * - Fallback: OpenAI GPT-4.1-mini (if Gemini is rate-limited or unavailable)
 *
 * Analysis Frameworks Used:
 * - BANT: Budget, Authority, Need, Timeline (classic qualification)
 * - MEDDIC: Metrics, Economic Buyer, Decision criteria, Decision process,
 *           Identify pain, Champion (enterprise sales)
 * - CHAMP: Challenges, Authority, Money, Prioritization
 * - GPCT: Goals, Plans, Challenges, Timeline
 *
 * Scoring System:
 * - 0-39: Low intent (tire-kickers, researchers)
 * - 40-69: Medium intent (evaluating options)
 * - 70-100: High intent (ready to buy)
 * - Bonus: +20 for champion detected, -15 for blocker detected
 *
 * Output: Structured JSON with 40+ fields including scores, sentiment,
 * recommended actions, and conversation insights.
 *
 * =============================================================================
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';

// API keys from environment variables
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

// Initialize AI clients
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

/**
 * SYSTEM PROMPT
 *
 * This comprehensive prompt instructs the AI to act as a sales psychologist.
 * It includes detailed scoring criteria for each BANT component (25 points each)
 * and specific behavioral signals to look for in conversations.
 */
const SYSTEM_PROMPT = `You are a world-class sales psychologist with 20+ years analyzing B2B conversations using proven qualification frameworks: BANT, MEDDIC, CHAMP, and GPCT.

Your analysis methodology is grounded in conversation intelligence research from Gong (analyzing 500K+ sales calls), Forrester B2B buying committee studies, and Challenger Customer frameworks.

CORE ANALYTICAL FRAMEWORK:

🧠 PSYCHOLOGICAL INTENT DETECTION:

HIGH-INTENT SIGNALS (scores 70-100):
- Future-oriented ownership language: "when we implement", "our new system will", "after we switch"
- Implementation-focused questions: "What does onboarding look like?", "How long is setup?", "Who handles migration?"
  (Research shows 35% higher win rates when prospects ask implementation questions)
- Stakeholder introduction: "Let me loop in our CTO", "I want my team to see this"
- Pricing discussion initiation: "What are the pricing tiers?", "What's the ROI timeline?"
- Timeline specificity: Mentions Q4 budget, contract expiration dates, compliance deadlines

MEDIUM-INTENT SIGNALS (scores 40-69):
- Comparison questions: "How does this compare to [competitor]?", "What makes you different?"
- Feature evaluation: Specific technical questions, integration inquiries, security concerns
- Case study requests: "Do you have customers in [industry]?", "What results have you seen?"
- Authority ambiguity: Uses "we" but also "I'll need to check with..."

LOW-INTENT / TIRE-KICKER SIGNALS (scores 0-39):
- Vague exploratory questions answerable by website: "What do you do?", "Send me information"
- Indefinite timeline: "maybe next year", "just researching", "no immediate timeline"
- Price obsession without value discussion: "What's your cheapest option?", "Do you have free plans?"
- Personal email for B2B inquiry: Gmail/Yahoo/Hotmail with business questions
- Circular conversations: Asks same questions repeatedly without progression
- Generic interest: No specific pain articulated, no urgency demonstrated

🎯 BANT QUALIFICATION (Weighted Scoring):

BUDGET (25 points max):
+25: Openly discusses budget range, past investments, ROI expectations
+15: Asks about pricing tiers, payment options, references budget cycle timing
+10: Willing to discuss value but avoids budget specifics
+5: Asks about pricing but focuses heavily on cost-cutting
0: Avoids budget discussion, requests free alternatives, "too expensive" without seeing price

AUTHORITY (25 points max):
+25: Economic Buyer language: "my budget", "my team", "we've decided to", "I'm responsible for"
+20: Multiple stakeholders mentioned: "Our CTO wants to evaluate", "Finance team needs to approve"
+15: Influencer with access: "I'll present this to leadership", "Let me get buy-in from..."
+10: End user or gatekeeper: "I'll pass this along", "I'll need to ask my manager"
0: Pure researcher: "Just gathering information", "Not my decision"

NEED (25 points max):
+25: Specific pain + emotional intensity + quantified impact: "We're losing $50k/month due to poor response times and my team is burned out"
+20: Clear pain with business impact: "Customer complaints are up 40% because we can't respond fast enough"
+15: General pain articulated: "Our current system is slow and frustrating"
+10: Awareness of problem: "We could probably improve our messaging"
0: No pain identified: "Just exploring options"

TIMELINE (25 points max):
+25: Urgent with external deadline: "Contract expires Dec 31", "Compliance deadline Jan 1", "Need this before Q4 closes"
+20: Active buying cycle: "We're evaluating vendors now", "RFP is out", "Decision by end of quarter"
+15: Near-term intent: "Looking to implement in next 2-3 months"
+10: Vague but positive: "Sometime this year", "Next few quarters"
0: No urgency: "Maybe next year", "Just exploring", "No timeline"

👥 DECISION-MAKER & CHAMPION IDENTIFICATION:

CHAMPION DETECTED (+20 points bonus):
- Advocacy language: "I really think this could help us", "I've been pushing for something like this"
- Internal intelligence sharing: "FYI, our CFO is skeptical about new tools, so emphasize ROI"
- Proactive next steps: "Let me set up a call with my team", "I'll create a presentation for leadership"
- Asks for ammunition: "What materials can I use to pitch this internally?"

BLOCKER DETECTED (-15 points penalty):
- Resistance language: "We've tried this before and it didn't work", "Not sure this is different from what we have"
- Risk obsession: "What could go wrong?", "This seems risky", "Too complicated"
- Sunk cost defense: "We just invested in [current solution]", "Our current system works fine"
- Bureaucracy emphasis: "Our processes are very complex", "It's difficult to get things approved here"

🛒 BUYER JOURNEY STAGE MAPPING:

AWARENESS STAGE:
- "What is..." / "Why..." exploratory questions
- Problem-focused without solution awareness: "Is there even a way to solve this?"
- Education needed: "I don't know much about WhatsApp Business API"
- Generic interest: "Tell me about your company"

CONSIDERATION STAGE:
- Comparison questions: "How do you compare to Twilio?", "What's different from [competitor]?"
- Feature evaluation: Integration questions, security inquiries, scalability discussion
- Multiple solution exploration: "We're looking at you and 2 other vendors"
- Case study interest: "Who else in [industry] uses this?"

DECISION STAGE (Highest Intent):
- Implementation logistics: "What does onboarding look like?", "How long is training?"
- Contract/pricing specifics: "What are payment terms?", "Can we do annual vs monthly?"
- Approval process: "What do you need from us for a proposal?", "Can you send an MSA?"
- Next-step commitment: "If we move forward, what happens next?", "When can we start?"

📍 ROUTING LOGIC:

ENTERPRISE_SALES (Score 75+, OR deal size indicators):
- Multiple stakeholders (5+) mentioned
- Enterprise features discussed: SSO, dedicated support, SLA requirements
- Deal size >$10k implied: "We have 500 agents", "50,000 customers"
- Complex integration needs: "Need to integrate with our custom CRM"

SALES (Score 50-74, Clear B2B intent):
- Decision-maker access confirmed
- Timeline 30-90 days
- Budget discussion occurred
- Specific use case articulated

PARTNER_TEAM (Partnership signals):
- Reseller/integration intent: "We build solutions for clients", "We're an agency"
- White-label questions: "Can we rebrand this?"
- Volume/commission discussion

SUPPORT (Post-purchase or technical):
- Existing customer: "We're already using...", "I'm having trouble with..."
- Technical troubleshooting without sales context

OUTPUT RULES:
1. Return ONLY valid JSON
2. NO markdown formatting (no \`\`\`json\`\`\`)
3. NO explanatory text before or after JSON
4. Lead score must reflect research-based weighted criteria
5. Summary must be 1-2 sentences highlighting KEY psychological insights`;

const USER_PROMPT_TEMPLATE = `CONVERSATION TO ANALYZE:

Phone: {phone}
Product Interest: {product}
Session: {sessionId}

FULL CONVERSATION TRANSCRIPT:
{conversation}

ANALYSIS INSTRUCTIONS:

Apply your expert sales psychology framework (BANT + MEDDIC + behavioral psychology) to decode this conversation and extract comprehensive intelligence matching the exact CRM structure.

CRITICAL: Extract ALL fields below. Calculate timestamps, detect ALL phone numbers and emails in conversation, identify topics comprehensively.

Return this EXACT JSON structure with NO markdown (no \`\`\`json\`\`\`), NO explanations, ONLY the JSON object:

{
  "conversation_date": "YYYY-MM-DD format of conversation date",
  "start_time_ist": "HH:MM:SS IST format of first message",
  "end_time_ist": "HH:MM:SS IST format of last message",
  "duration_minutes": number,
  "duration_seconds": number,
  "total_messages": number,
  "user_messages": number,
  "assistant_messages": number,
  "prospect_name": "CRITICAL: Extract ONLY the person's actual name (e.g., 'John Smith', 'Rahul', 'Sarah'). Do NOT include surrounding text like 'My name is' or 'I am'. If someone says 'My name is John', extract just 'John'. If someone says 'I am Sarah from ABC Corp', extract just 'Sarah'. Only use 'unknown' if NO name appears anywhere in the conversation.",
  "phone": "extracted phone number",
  "email": "extracted email or unknown",
  "company_name": "CRITICAL: Extract ONLY the company/business name itself (e.g., 'Google', 'Acme Corp', 'TechStart'). Do NOT include surrounding text like 'My company is' or 'I work at'. If someone says 'My company is GreenAds Global', extract just 'GreenAds Global'. If someone says 'I work at Microsoft', extract just 'Microsoft'. Only use 'unknown' if no company is mentioned.",
  "region": "city/state/country if mentioned or unknown",
  "session_id": "session identifier",
  "detected_phone_numbers": ["all_phone_numbers_found_in_conversation"],
  "detected_emails": ["all_emails_found_in_conversation"],
  "primary_topic": "main discussion topic",
  "secondary_topics": ["topic_2", "topic_3", "topic_4"],
  "use_case_category": "what they want to use the product for",
  "need_summary": "specific description of their needs and pain points",
  "conversation_summary": "2-3 sentence comprehensive overview of what was discussed",
  "conversation_timeline_points": "chronological narrative of key conversation moments with sequence",
  "intent_level": "low|medium|high",
  "buyer_stage": "awareness|consideration|decision|post_purchase",
  "urgency": "low|medium|high|immediate",
  "timeline_notes": "specific timeline details, deadlines, or timeframes mentioned",
  "budget_bucket_inr": "<50k|50k-2L|2L-5L|5L-10L|>10L|unknown",
  "partner_intent": "true|false",
  "estimated_scale": "volume indicators: number of users, messages, customers, transactions mentioned",
  "sentiment_overall": "positive|neutral|negative",
  "emotional_intensity": "low|medium|high",
  "motivation_type": "problem_solving|growth|compliance|competitive_pressure|cost_reduction|exploration|unknown",
  "trust_level": "low|building|high",
  "key_questions": ["important_question_1", "important_question_2", "important_question_3"],
  "main_objections": ["objection_or_concern_1", "objection_or_concern_2"],
  "competitors_mentioned": ["competitor_1", "competitor_2"],
  "links_shared": ["url_1", "url_2"],
  "info_shared_by_assistant": ["key_info_point_1", "key_info_point_2", "key_info_point_3"],
  "open_loops_or_commitments": ["pending_action_1", "pending_action_2"],
  "lead_score": 0-100,
  "recommended_routing": "sales|support|enterprise_sales|partner_team",
  "next_action": "specific recommended next step based on lead score and analysis"
}

FIELD-SPECIFIC INSTRUCTIONS:

TIME FIELDS: Extract from conversation timestamps if available, otherwise estimate based on message flow
DETECTED FIELDS: Scan entire conversation for ALL phone numbers and email addresses mentioned (not just contact info)
SECONDARY TOPICS: List 2-5 additional topics discussed beyond the primary one
CONVERSATION_TIMELINE_POINTS: Create a flowing narrative like "Prospect initiated inquiry about WhatsApp API pricing → Asked about integration with Salesforce → Discussed implementation timeline → Requested demo for next week"
BUDGET_BUCKET_INR: Estimate based on company size indicators, use case complexity, scale mentioned, or industry context
ESTIMATED_SCALE: Extract any volume numbers mentioned (users, messages per day, customers, transactions)
KEY_QUESTIONS: Extract the most important 3-5 questions prospect asked
INFO_SHARED_BY_ASSISTANT: List key product information, features, or resources the chatbot provided
OPEN_LOOPS: Identify any pending commitments like "will send proposal", "check with team", "schedule call", etc.`;

export interface AnalysisResult {
  conversation_date: string;
  start_time_ist: string;
  end_time_ist: string;
  duration_minutes: number;
  duration_seconds: number;
  total_messages: number;
  user_messages: number;
  assistant_messages: number;
  prospect_name: string;
  phone: string;
  email: string;
  company_name: string;
  region: string;
  session_id: string;
  detected_phone_numbers: string[];
  detected_emails: string[];
  primary_topic: string;
  secondary_topics: string[];
  use_case_category: string;
  need_summary: string;
  conversation_summary: string;
  conversation_timeline_points: string;
  intent_level: 'low' | 'medium' | 'high';
  buyer_stage: 'awareness' | 'consideration' | 'decision' | 'post_purchase';
  urgency: 'low' | 'medium' | 'high' | 'immediate';
  timeline_notes: string;
  budget_bucket_inr: string;
  partner_intent: boolean | string;
  estimated_scale: string;
  sentiment_overall: 'positive' | 'neutral' | 'negative';
  emotional_intensity: 'low' | 'medium' | 'high';
  motivation_type: string;
  trust_level: 'low' | 'building' | 'high';
  key_questions: string[];
  main_objections: string[];
  competitors_mentioned: string[];
  links_shared: string[];
  info_shared_by_assistant: string[];
  open_loops_or_commitments: string[];
  lead_score: number;
  recommended_routing: string;
  next_action: string;
}

/**
 * Parses AI response text into structured AnalysisResult
 *
 * AI models sometimes wrap JSON in markdown code blocks (```json ... ```)
 * This function cleans those artifacts before parsing.
 *
 * @param text - Raw text response from AI model
 * @returns Parsed AnalysisResult object
 * @throws JSON parse error if response is malformed
 */
function parseAIResponse(text: string): AnalysisResult {
  // Clean markdown formatting if present (AI sometimes wraps JSON in code blocks)
  const cleaned = text
    .replace(/```json\n?/gi, '')  // Remove ```json opening
    .replace(/```\n?/g, '')        // Remove ``` closing
    .replace(/^`+|`+$/g, '')       // Remove any stray backticks
    .trim();

  return JSON.parse(cleaned) as AnalysisResult;
}

/**
 * Attempts conversation analysis using Google Gemini 2.5 Pro
 *
 * Temperature 0.7 balances consistency with some creativity for classification.
 * maxOutputTokens 4096 ensures complete JSON response for complex conversations.
 */
async function tryGemini(
  phone: string,
  product: string,
  sessionId: string,
  conversation: string
): Promise<AnalysisResult> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-pro' });

  const prompt = USER_PROMPT_TEMPLATE
    .replace('{phone}', phone)
    .replace('{product}', product)
    .replace('{sessionId}', sessionId)
    .replace('{conversation}', conversation);

  const result = await model.generateContent({
    contents: [
      {
        role: 'user',
        parts: [{ text: SYSTEM_PROMPT + '\n\n' + prompt }],
      },
    ],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 4096,
    },
  });

  const response = result.response;
  const text = response.text();

  return parseAIResponse(text);
}

/**
 * Fallback: Attempts conversation analysis using OpenAI GPT-4.1-mini
 *
 * Used when Gemini fails (rate limits, outages, etc.)
 * Same prompt and parameters to ensure consistent output format.
 */
async function tryOpenAI(
  phone: string,
  product: string,
  sessionId: string,
  conversation: string
): Promise<AnalysisResult> {
  const prompt = USER_PROMPT_TEMPLATE
    .replace('{phone}', phone)
    .replace('{product}', product)
    .replace('{sessionId}', sessionId)
    .replace('{conversation}', conversation);

  const response = await openai.chat.completions.create({
    model: 'gpt-5.1',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: prompt },
    ],
    temperature: 0.7,
    max_completion_tokens: 4096,
  });

  const text = response.choices[0]?.message?.content || '';

  return parseAIResponse(text);
}

/**
 * MAIN ENTRY POINT: Analyzes a WhatsApp conversation using AI
 *
 * Strategy: Try OpenAI GPT-5.1 first, fall back to Gemini 2.5 Pro if OpenAI fails.
 * This ensures high availability while preferring the newer model.
 *
 * @param phone - Customer's phone number
 * @param product - Product they inquired about
 * @param sessionId - Unique conversation session identifier
 * @param conversation - Full conversation transcript
 * @returns Complete analysis with scores, insights, and recommendations
 * @throws Error if both AI providers fail
 */
export async function analyzeConversation(
  phone: string,
  product: string,
  sessionId: string,
  conversation: string
): Promise<AnalysisResult> {
  // Try OpenAI GPT-5.1 first (primary)
  try {
    console.log('[AI] Trying OpenAI GPT-5.1...');
    const result = await tryOpenAI(phone, product, sessionId, conversation);
    console.log('[AI] OpenAI GPT-5.1 succeeded');
    return result;
  } catch (openaiError) {
    console.log('[AI] OpenAI failed:', openaiError instanceof Error ? openaiError.message : 'Unknown error');
    console.log('[AI] Falling back to Gemini 2.5 Pro...');

    // Fallback to Gemini
    try {
      const result = await tryGemini(phone, product, sessionId, conversation);
      console.log('[AI] Gemini 2.5 Pro succeeded');
      return result;
    } catch (geminiError) {
      console.error('[AI] Gemini also failed:', geminiError);
      throw new Error(`Both AI providers failed. OpenAI: ${openaiError instanceof Error ? openaiError.message : 'Unknown'}. Gemini: ${geminiError instanceof Error ? geminiError.message : 'Unknown'}`);
    }
  }
}

/**
 * Enriches AI analysis with computed business logic flags and metrics
 *
 * This adds derived fields that help with:
 * - Quick filtering (is_hot_lead, is_enterprise)
 * - Sales routing decisions (needs_immediate_followup)
 * - Data quality assessment (validation.completeness)
 * - Engagement metrics (engagement_rate, messages_per_minute)
 *
 * Business Logic:
 * - hot_lead: Score >= 70 (high intent, ready to buy)
 * - immediate_followup: Urgency marked as 'immediate'
 * - enterprise: Routed to enterprise sales team
 * - engagement_rate: % of messages from prospect (higher = more engaged)
 * - messages_per_minute: Conversation pace (faster = more active)
 *
 * @param analysis - Raw AI analysis result
 * @returns Enriched analysis with computed flags and metrics
 */
export function enrichAnalysis(analysis: AnalysisResult): AnalysisResult & {
  is_hot_lead: boolean;
  needs_immediate_followup: boolean;
  is_enterprise: boolean;
  is_partner: boolean;
  has_phone: boolean;
  has_email: boolean;
  has_company: boolean;
  engagement_rate: number;
  messages_per_minute: number;
  validation: {
    isValid: boolean;
    missingFields: string[];
    completeness: string;
  };
} {
  // Required fields for a valid lead (used for completeness calculation)
  const requiredFields = [
    'phone', 'lead_score', 'primary_topic',
    'intent_level', 'buyer_stage', 'recommended_routing',
  ];

  // Check which required fields are missing or marked as 'unknown'
  const missing = requiredFields.filter(field =>
    !analysis[field as keyof AnalysisResult] || analysis[field as keyof AnalysisResult] === 'unknown'
  );

  // Validation summary for data quality assessment
  const validation = {
    isValid: missing.length === 0,
    missingFields: missing,
    completeness: ((requiredFields.length - missing.length) / requiredFields.length * 100).toFixed(0),
  };

  return {
    ...analysis,
    // Hot lead = high intent score (70+), prioritize for immediate sales contact
    is_hot_lead: analysis.lead_score >= 70,
    // Immediate followup = conversation flagged as urgent
    needs_immediate_followup: analysis.urgency === 'immediate',
    // Enterprise = large deal, routed to enterprise sales team
    is_enterprise: analysis.recommended_routing === 'enterprise_sales',
    // Partner = interested in reselling/partnership
    is_partner: analysis.partner_intent === true || analysis.partner_intent === 'true',
    // Data presence flags for filtering
    has_phone: analysis.phone !== 'unknown' && analysis.phone !== '',
    has_email: analysis.email !== 'unknown' && analysis.email !== '',
    has_company: analysis.company_name !== 'unknown' && analysis.company_name !== '',
    // Engagement rate = % of messages from user (vs assistant)
    engagement_rate: analysis.total_messages > 0
      ? parseFloat((analysis.user_messages / analysis.total_messages * 100).toFixed(1))
      : 0,
    // Messages per minute = conversation pace indicator
    messages_per_minute: analysis.duration_minutes > 0
      ? parseFloat((analysis.total_messages / analysis.duration_minutes).toFixed(2))
      : 0,
    validation,
  };
}
