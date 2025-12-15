import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

const TRANSLATION_PROMPT = (targetLanguage: string, conversation: string) =>
  `You are a professional translator. Translate the following WhatsApp conversation to ${targetLanguage} language. IMPORTANT: You MUST translate to ${targetLanguage} only, not any other language. Keep the format exactly the same with timestamps and sender labels (User/Fluffy). Only translate the message content, not the timestamps or labels.

Translate this conversation to ${targetLanguage}:

${conversation}`;

// Try Gemini 2.5 Pro first
async function tryGeminiTranslate(targetLanguage: string, conversation: string): Promise<string> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-pro' });

  const result = await model.generateContent({
    contents: [
      {
        role: 'user',
        parts: [{ text: TRANSLATION_PROMPT(targetLanguage, conversation) }],
      },
    ],
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 8192,
    },
  });

  return result.response.text();
}

// Fallback to OpenAI
async function tryOpenAITranslate(targetLanguage: string, conversation: string): Promise<string> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4.1-mini',
    messages: [
      {
        role: 'system',
        content: `You are a professional translator. Translate the following WhatsApp conversation to ${targetLanguage} language. IMPORTANT: You MUST translate to ${targetLanguage} only, not any other language. Keep the format exactly the same with timestamps and sender labels (User/Fluffy). Only translate the message content, not the timestamps or labels.`
      },
      {
        role: 'user',
        content: `Translate this conversation to ${targetLanguage}:\n\n${conversation}`
      }
    ],
    temperature: 0.3,
  });

  return response.choices[0]?.message?.content || '';
}

export async function POST(request: Request) {
  try {
    const { conversation, targetLanguage } = await request.json();

    if (!conversation || !targetLanguage) {
      return NextResponse.json(
        { error: 'Missing conversation or targetLanguage' },
        { status: 400 }
      );
    }

    if (!GEMINI_API_KEY && !OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'Translation service not configured' },
        { status: 500 }
      );
    }

    let translatedText = '';

    // Try Gemini 2.5 Pro first
    try {
      console.log('[Translate] Trying Gemini 2.5 Pro...');
      translatedText = await tryGeminiTranslate(targetLanguage, conversation);
      console.log('[Translate] Gemini 2.5 Pro succeeded');
    } catch (geminiError) {
      console.log('[Translate] Gemini failed:', geminiError instanceof Error ? geminiError.message : 'Unknown error');
      console.log('[Translate] Falling back to OpenAI...');

      // Fallback to OpenAI
      try {
        translatedText = await tryOpenAITranslate(targetLanguage, conversation);
        console.log('[Translate] OpenAI succeeded');
      } catch (openaiError) {
        console.error('[Translate] OpenAI also failed:', openaiError);
        throw new Error(`Both AI providers failed. Gemini: ${geminiError instanceof Error ? geminiError.message : 'Unknown'}. OpenAI: ${openaiError instanceof Error ? openaiError.message : 'Unknown'}`);
      }
    }

    return NextResponse.json({ translatedText });
  } catch (error) {
    console.error('[Translate] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Translation failed' },
      { status: 500 }
    );
  }
}
