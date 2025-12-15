/**
 * =============================================================================
 * UPSTASH REDIS REST API CLIENT
 * =============================================================================
 *
 * Purpose: Manages WhatsApp conversation caching from the chatbot webhook.
 * Uses Upstash Redis (serverless Redis) via REST API for edge compatibility.
 *
 * DATA FLOW:
 * 1. WhatsApp webhook receives messages → stored in Redis with TTL
 * 2. Chat processor scans Redis for complete conversations
 * 3. Conversations analyzed by AI → stored in SQLite
 * 4. Redis key marked as processed to prevent duplicates
 *
 * KEY FORMAT: chat:phone::product::sessionId
 * - Enables scanning all chats for a phone number or product
 * - sessionId is unique per conversation instance
 *
 * TTL STRATEGY:
 * - Conversations auto-expire after ~7 days
 * - Processing happens when TTL drops below 2 hours
 * - Prevents analyzing incomplete (in-progress) conversations
 *
 * TIMEZONE:
 * All timestamps converted to IST (Indian Standard Time, UTC+5:30)
 * to match customer timezone expectations.
 *
 * =============================================================================
 */

// Upstash Redis connection (serverless-compatible REST API)
const REDIS_URL = process.env.UPSTASH_REDIS_URL || 'https://clear-woodcock-13031.upstash.io';
const REDIS_TOKEN = process.env.UPSTASH_REDIS_TOKEN || '';

// Generic Redis response wrapper
interface RedisResponse<T = unknown> {
  result: T;
}

// Individual chat message structure
interface ChatMessage {
  role: 'user' | 'assistant';  // Who sent the message
  content: string;              // Message text
  ts?: string;                  // Timestamp (ISO format)
  message?: string;             // Alternative content field (legacy)
}

// Conversation metadata (set by webhook)
interface ChatMetadata {
  phone?: string;               // Customer phone number
  email?: string;               // Customer email (if provided)
  sessionId?: string;           // Unique conversation ID
  product?: string;             // Product they inquired about
  businessInfo?: string;        // Business context
  username?: string;            // Customer name (if provided)
  processedToSheets?: boolean;  // Flag: already sent to Google Sheets
  processedAt?: string;         // When processing completed
}

// Complete chat data structure
interface ChatData {
  messages: ChatMessage[];      // Array of conversation messages
  metadata: ChatMetadata;       // Conversation context
}

async function redisCommand<T = unknown>(command: unknown[]): Promise<T> {
  const response = await fetch(REDIS_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${REDIS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(command),
  });

  if (!response.ok) {
    throw new Error(`Redis error: ${response.status} ${response.statusText}`);
  }

  const data: RedisResponse<T> = await response.json();
  return data.result;
}

/**
 * Redis client object with all chat-related operations
 */
export const redis = {
  /**
   * Scans Redis for all chat conversation keys
   * Returns up to 500 keys matching pattern 'chat:*'
   */
  async scanChatKeys(): Promise<string[]> {
    const result = await redisCommand<[string, string[]]>(['SCAN', '0', 'MATCH', 'chat:*', 'COUNT', '500']);
    return result[1] || [];
  },

  /**
   * Gets Time-To-Live (TTL) for a key in seconds
   * Used to determine if conversation is ready for processing
   */
  async getTTL(key: string): Promise<number> {
    return await redisCommand<number>(['TTL', key]);
  },

  /**
   * Gets the raw string value for a Redis key
   */
  async get(key: string): Promise<string | null> {
    return await redisCommand<string | null>(['GET', key]);
  },

  /**
   * Sets a key with expiration time
   * Used to mark conversations as processed with short TTL
   */
  async setWithExpiry(key: string, value: string, expirySeconds: number): Promise<void> {
    await redisCommand(['SET', key, value, 'EX', expirySeconds]);
  },

  /**
   * Parses raw Redis string into structured ChatData
   *
   * Handles multiple formats for backward compatibility:
   * - Format 1: { messages: [], metadata: { username, phone, ... } }
   * - Format 2: { messages: [], username, phone, ... } (fields at root level)
   * - Format 3: Direct array of messages (deprecated)
   *
   * Returns empty structure if data is null, invalid, or malformed
   */
  parseChatData(raw: string | null): ChatData {
    if (!raw || raw === 'null') {
      return { messages: [], metadata: {} };
    }

    try {
      const parsed = JSON.parse(raw);

      // Format with messages array
      if (parsed.messages && Array.isArray(parsed.messages)) {
        // Check if metadata fields are at root level (not inside metadata object)
        // Fields like username, phone, email, etc. might be at root level
        const rootMetadata: ChatMetadata = {};

        // Extract metadata fields from root level
        if (parsed.username) rootMetadata.username = parsed.username;
        if (parsed.phone) rootMetadata.phone = parsed.phone;
        if (parsed.email) rootMetadata.email = parsed.email;
        if (parsed.sessionId) rootMetadata.sessionId = parsed.sessionId;
        if (parsed.product) rootMetadata.product = parsed.product;
        if (parsed.businessInfo) rootMetadata.businessInfo = parsed.businessInfo;
        if (parsed.processedToSheets) rootMetadata.processedToSheets = parsed.processedToSheets;
        if (parsed.processedAt) rootMetadata.processedAt = parsed.processedAt;

        // Merge with any existing metadata object (root level fields take priority)
        const existingMetadata = parsed.metadata || {};

        return {
          messages: parsed.messages,
          metadata: { ...existingMetadata, ...rootMetadata },
        };
      }

      // Old format: just array of messages (deprecated, for backward compat)
      if (Array.isArray(parsed)) {
        return {
          messages: parsed,
          metadata: {},
        };
      }

      return { messages: [], metadata: {} };
    } catch {
      return { messages: [], metadata: {} };
    }
  },

  /**
   * Extracts session info from Redis key
   *
   * Key format: chat:phone::product::sessionId
   * Example: chat:+919876543210::whatsapp-api::abc123
   *
   * The double-colon (::) delimiter separates components
   */
  parseKey(key: string): { phone: string; product: string; sessionId: string } {
    const keyWithoutPrefix = key.replace(/^chat:/, '');
    const parts = keyWithoutPrefix.split('::');

    return {
      phone: parts[0]?.trim() || '',
      product: parts[1]?.trim() || '',
      sessionId: keyWithoutPrefix,  // Full key used as session ID
    };
  },

  /**
   * Builds formatted conversation text for AI analysis
   *
   * Output format: "ROLE @ timestamp: message content"
   * Example: "USER @ 2024-01-01T12:00:00Z: Hello, I need help"
   *
   * Cleans up excessive newlines and whitespace
   */
  buildConversationText(messages: ChatMessage[]): string {
    return messages.map(msg => {
      const role = (msg.role || 'user').toString().toUpperCase();
      const time = msg.ts ? ` @ ${new Date(msg.ts).toISOString()}` : '';
      const content = (msg.content || msg.message || '').toString();
      const clean = content.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
      return `${role}${time}: ${clean}`;
    }).join('\n\n');
  },

  /**
   * Extracts timing information from conversation messages
   *
   * All times converted to IST (Indian Standard Time, UTC+5:30)
   * Calculates duration, message counts, and timestamps
   *
   * Returns defaults if no timestamps available in messages
   */
  extractTimingInfo(messages: ChatMessage[]): {
    conversationDate: string;
    startTimeIst: string;
    endTimeIst: string;
    durationMinutes: number;
    durationSeconds: number;
    totalMessages: number;
    userMessages: number;
    assistantMessages: number;
  } {
    const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000; // IST is UTC+5:30

    // Get all timestamps from messages
    const timestamps: Date[] = [];
    let userMessages = 0;
    let assistantMessages = 0;

    for (const msg of messages) {
      if (msg.ts) {
        timestamps.push(new Date(msg.ts));
      }
      if (msg.role === 'user') {
        userMessages++;
      } else if (msg.role === 'assistant') {
        assistantMessages++;
      }
    }

    if (timestamps.length === 0) {
      // No timestamps, return defaults
      const now = new Date();
      const istNow = new Date(now.getTime() + IST_OFFSET_MS);
      return {
        conversationDate: istNow.toISOString().split('T')[0],
        startTimeIst: 'Unknown',
        endTimeIst: 'Unknown',
        durationMinutes: 0,
        durationSeconds: 0,
        totalMessages: messages.length,
        userMessages,
        assistantMessages,
      };
    }

    // Sort timestamps
    timestamps.sort((a, b) => a.getTime() - b.getTime());

    const firstTimestamp = timestamps[0];
    const lastTimestamp = timestamps[timestamps.length - 1];

    // Convert to IST
    const firstIst = new Date(firstTimestamp.getTime() + IST_OFFSET_MS);
    const lastIst = new Date(lastTimestamp.getTime() + IST_OFFSET_MS);

    // Calculate duration
    const durationMs = lastTimestamp.getTime() - firstTimestamp.getTime();
    const totalSeconds = Math.floor(durationMs / 1000);
    const durationMinutes = Math.floor(totalSeconds / 60);
    const durationSeconds = totalSeconds % 60;

    // Format date as YYYY-MM-DD (using IST date)
    const conversationDate = firstIst.toISOString().split('T')[0];

    // Format times as HH:MM:SS
    const formatTime = (d: Date) => {
      const hours = d.getUTCHours().toString().padStart(2, '0');
      const mins = d.getUTCMinutes().toString().padStart(2, '0');
      const secs = d.getUTCSeconds().toString().padStart(2, '0');
      return `${hours}:${mins}:${secs}`;
    };

    return {
      conversationDate,
      startTimeIst: formatTime(firstIst),
      endTimeIst: formatTime(lastIst),
      durationMinutes,
      durationSeconds,
      totalMessages: messages.length,
      userMessages,
      assistantMessages,
    };
  },

  // Mark conversation as processed in Redis
  async markAsProcessed(key: string, chatData: ChatData): Promise<void> {
    const updatedData: ChatData = {
      messages: chatData.messages,
      metadata: {
        ...chatData.metadata,
        processedToSheets: true,
        processedAt: new Date().toISOString(),
      },
    };

    // Set with short TTL (conversation will expire soon anyway)
    await this.setWithExpiry(key, JSON.stringify(updatedData), 25);
  },
};

export type { ChatMessage, ChatMetadata, ChatData };
