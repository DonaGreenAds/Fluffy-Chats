// Team Invitation API Routes
import { NextRequest, NextResponse } from 'next/server';
import { sendTeamInvitation } from '@/lib/email';
import { v4 as uuidv4 } from 'uuid';

// POST /api/team/invite - Send team invitation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, inviterName, organizationName, role } = body;

    if (!email || !inviterName || !organizationName || !role) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Generate invite token
    const inviteToken = uuidv4();

    // Send invitation email
    const result = await sendTeamInvitation(
      email,
      inviterName,
      organizationName,
      role,
      inviteToken
    );

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to send invitation' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Invitation sent successfully',
      inviteToken,
    });
  } catch (error) {
    console.error('Team invite error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
