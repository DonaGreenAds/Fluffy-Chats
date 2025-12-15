import { NextRequest, NextResponse } from 'next/server';
import { teamMembersDb, usersDb, invitationsDb, auditLogsDb } from '@/lib/database';
import { hasPermission, canManageRole } from '@/lib/permissions';
import { UserRole } from '@/types/auth';

// GET /api/team - Get all team members
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 });
    }

    const members = await teamMembersDb.getByOrganization(organizationId);
    return NextResponse.json({ members });
  } catch (error) {
    console.error('Error fetching team members:', error);
    return NextResponse.json({ error: 'Failed to fetch team members' }, { status: 500 });
  }
}

// POST /api/team - Add a team member (or send invitation)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, role, organizationId, invitedBy, invitedByName, inviterRole } = body;

    if (!email || !role || !organizationId || !invitedBy) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check if inviter has permission to invite
    if (!hasPermission(inviterRole as UserRole, 'settings:team:invite')) {
      return NextResponse.json({ error: 'You do not have permission to invite team members' }, { status: 403 });
    }

    // Check if inviter can assign this role
    if (!canManageRole(inviterRole as UserRole, role as UserRole)) {
      return NextResponse.json({ error: 'You cannot assign this role level' }, { status: 403 });
    }

    // Check if user already exists in team
    const existingUser = await usersDb.getByEmail(email);
    if (existingUser) {
      const existingMember = await teamMembersDb.getMember(existingUser.id, organizationId);
      if (existingMember) {
        return NextResponse.json({ error: 'User is already a team member' }, { status: 400 });
      }
    }

    // Check for existing pending invitation
    const existingInvite = await invitationsDb.getPendingByEmail(email, organizationId);
    if (existingInvite) {
      return NextResponse.json({ error: 'An invitation has already been sent to this email' }, { status: 400 });
    }

    // Create invitation
    const invitationId = crypto.randomUUID();
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

    await invitationsDb.create({
      id: invitationId,
      email,
      role: role as UserRole,
      organizationId,
      invitedBy,
      invitedByName: invitedByName || 'Team Member',
      createdAt: new Date().toISOString(),
      expiresAt,
      status: 'pending',
      token,
    });

    // Log the action
    auditLogsDb.create({
      organizationId,
      userId: invitedBy,
      userName: invitedByName || 'Team Member',
      action: 'invite_team_member',
      resource: 'invitation',
      resourceId: invitationId,
      details: { email, role },
    });

    return NextResponse.json({
      success: true,
      invitation: {
        id: invitationId,
        email,
        role,
        expiresAt,
        token,
      },
    });
  } catch (error) {
    console.error('Error creating invitation:', error);
    return NextResponse.json({ error: 'Failed to create invitation' }, { status: 500 });
  }
}

// PATCH /api/team - Update team member role
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, organizationId, newRole, requesterId, requesterRole } = body;

    if (!userId || !organizationId || !newRole || !requesterId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check if requester has permission to change roles
    if (!hasPermission(requesterRole as UserRole, 'settings:team:change_roles')) {
      return NextResponse.json({ error: 'You do not have permission to change roles' }, { status: 403 });
    }

    // Get current member
    const member = await teamMembersDb.getMember(userId, organizationId);
    if (!member) {
      return NextResponse.json({ error: 'Team member not found' }, { status: 404 });
    }

    // Check if requester can manage this member's role
    if (!canManageRole(requesterRole as UserRole, member.role)) {
      return NextResponse.json({ error: 'You cannot modify this user\'s role' }, { status: 403 });
    }

    // Check if requester can assign the new role
    if (!canManageRole(requesterRole as UserRole, newRole as UserRole)) {
      return NextResponse.json({ error: 'You cannot assign this role level' }, { status: 403 });
    }

    // Update the role
    await teamMembersDb.updateRole(userId, organizationId, newRole as UserRole);

    // Log the action
    await auditLogsDb.create({
      organizationId,
      userId: requesterId,
      userName: 'Admin', // Could pass this from request
      action: 'change_team_member_role',
      resource: 'team_member',
      resourceId: userId,
      details: { oldRole: member.role, newRole },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating team member role:', error);
    return NextResponse.json({ error: 'Failed to update role' }, { status: 500 });
  }
}

// DELETE /api/team - Remove team member
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const organizationId = searchParams.get('organizationId');
    const requesterId = searchParams.get('requesterId');
    const requesterRole = searchParams.get('requesterRole');

    if (!userId || !organizationId || !requesterId || !requesterRole) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Check if requester has permission to remove members
    if (!hasPermission(requesterRole as UserRole, 'settings:team:remove')) {
      return NextResponse.json({ error: 'You do not have permission to remove team members' }, { status: 403 });
    }

    // Get member to remove
    const member = await teamMembersDb.getMember(userId, organizationId);
    if (!member) {
      return NextResponse.json({ error: 'Team member not found' }, { status: 404 });
    }

    // Cannot remove owner
    if (member.role === 'owner') {
      return NextResponse.json({ error: 'Cannot remove organization owner' }, { status: 403 });
    }

    // Check if requester can manage this member
    if (!canManageRole(requesterRole as UserRole, member.role)) {
      return NextResponse.json({ error: 'You cannot remove this user' }, { status: 403 });
    }

    // Remove from team
    await teamMembersDb.remove(userId, organizationId);

    // Log the action
    await auditLogsDb.create({
      organizationId,
      userId: requesterId,
      userName: 'Admin',
      action: 'remove_team_member',
      resource: 'team_member',
      resourceId: userId,
      details: { removedUserEmail: member.user.email },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing team member:', error);
    return NextResponse.json({ error: 'Failed to remove team member' }, { status: 500 });
  }
}
