import { NextResponse } from 'next/server';
import { leadsDb } from '@/lib/database';

// GET all leads
export async function GET() {
  try {
    const leads = await leadsDb.getAll();
    return NextResponse.json({ success: true, leads });
  } catch (error) {
    console.error('[API/leads] Error fetching leads:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
