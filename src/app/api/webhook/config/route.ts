import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const CONFIG_PATH = path.join(process.cwd(), 'data', 'webhook-config.json');

// Ensure data directory exists
function ensureDataDir() {
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

export async function GET() {
  try {
    ensureDataDir();
    if (fs.existsSync(CONFIG_PATH)) {
      const data = fs.readFileSync(CONFIG_PATH, 'utf-8');
      return NextResponse.json(JSON.parse(data));
    }
    return NextResponse.json({ url: '', headers: '', events: {} });
  } catch (error) {
    console.error('[Webhook Config] Read error:', error);
    return NextResponse.json({ url: '', headers: '', events: {} });
  }
}

export async function POST(request: Request) {
  try {
    const config = await request.json();

    ensureDataDir();
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));

    console.log('[Webhook Config] Saved to:', CONFIG_PATH);
    console.log('[Webhook Config] URL:', config.url);
    console.log('[Webhook Config] Events:', JSON.stringify(config.events));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Webhook Config] Save error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
