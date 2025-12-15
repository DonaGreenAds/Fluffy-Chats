import { NextRequest, NextResponse } from 'next/server';
import { invitationsDb, auditLogsDb } from '@/lib/database';
import { hasPermission } from '@/lib/permissions';
import { UserRole } from '@/types/auth';

// GET /api/team/invitations - Get pending invitations for an organization
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 });
    }

    const invitations = await invitationsDb.getByOrganization(organizationId);

    // Filter out expired invitations and mark them
    const now = new Date();
    const processedInvitations = [];
    for (const inv of invitations) {
      if (inv.status === 'pending' && new Date(inv.expiresAt) < now) {
        await invitationsDb.updateStatus(inv.id, 'expired');
        processedInvitations.push({ ...inv, status: 'expired' as const });
      } else {
        processedInvitations.push(inv);
      }
    }

    return NextResponse.json({ invitations: processedInvitations });
  } catch (error) {
    console.error('Error fetching invitations:', error);
    return NextResponse.json({ error: 'Failed to fetch invitations' }, { status: 500 });
  }
}

// DELETE /api/team/invitations - Revoke an invitation
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const invitationId = searchParams.get('invitationId');
    const organizationId = searchParams.get('organizationId');
    const requesterId = searchParams.get('requesterId');
    const requesterRole = searchParams.get('requesterRole');

    if (!invitationId || !organizationId || !requesterId || !requesterRole) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Check if requester has permission
    if (!hasPermission(requesterRole as UserRole, 'settings:team:invite')) {
      return NextResponse.json({ error: 'You do not have permission to revoke invitations' }, { status: 403 });
    }

    // Update invitation status
    await invitationsDb.updateStatus(invitationId, 'revoked');

    // Log the action
    await auditLogsDb.create({
      organizationId,
      userId: requesterId,
      userName: 'Admin',
      action: 'revoke_invitation',
      resource: 'invitation',
      resourceId: invitationId,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error revoking invitation:', error);
    return NextResponse.json({ error: 'Failed to revoke invitation' }, { status: 500 });
  }
}
