import { prisma } from '../utils/prismaClient.js';
import { generateToken } from '../utils/helper.js';
import { sendWorkspaceInvitationEmail } from './email.service.js';
import { requireWorkspaceInvitePermission } from './workspace.service.js';
import { HttpError } from '../utils/httpError.js';

type WorkspaceRole = 'super_admin' | 'admin' | 'reviewer';

const INVITE_EXPIRY_DAYS = 7;

// Roles that can be granted through an invitation. super_admin is never invitable.
const INVITABLE_ROLES: readonly WorkspaceRole[] = ['admin', 'reviewer'];
// What each inviter role may hand out — mirrors the member-management rules
// (admins can only manage reviewers).
const GRANTABLE_ROLES: Record<WorkspaceRole, readonly WorkspaceRole[]> = {
	super_admin: ['admin', 'reviewer'],
	admin: ['reviewer'],
	reviewer: [],
};

export const isInvitableRole = (role: unknown): role is WorkspaceRole =>
	typeof role === 'string' && (INVITABLE_ROLES as readonly string[]).includes(role);

export interface InvitePayload {
	email: string;
	role: WorkspaceRole;
	workspaceId: number;
	invitedById: number;
}

export const inviteWorkspaceMember = async ({ email, role, workspaceId, invitedById }: InvitePayload) => {
	const normalizedEmail = email.trim().toLowerCase();
	const token = generateToken(32);
	const expiresAt = new Date(Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

	if (!isInvitableRole(role)) {
		throw new HttpError(400, 'Role must be admin or reviewer');
	}

	const inviterMembership = await requireWorkspaceInvitePermission(invitedById, workspaceId);
	const inviterRole = inviterMembership.role as WorkspaceRole;
	if (!GRANTABLE_ROLES[inviterRole].includes(role)) {
		throw new HttpError(403, `As ${inviterRole.replace('_', ' ')} you can only invite: ${GRANTABLE_ROLES[inviterRole].join(', ')}`);
	}

	// Existing members are managed through the member endpoints, not re-invited —
	// otherwise an invite could be used to change anyone's (or your own) role.
	const existingMember = await prisma.workspaceMember.findFirst({
		where: { workspaceId, user: { email: normalizedEmail } },
		select: { id: true },
	});
	if (existingMember) {
		throw new HttpError(409, 'This person is already a member of the workspace');
	}

	const [workspace, inviter] = await Promise.all([
		prisma.workspace.findUnique({ where: { id: workspaceId }, select: { id: true, name: true, slug: true } }),
		prisma.user.findUnique({ where: { id: invitedById }, select: { id: true, name: true } }),
	]);

	if (!workspace) {
		throw new HttpError(404, 'Workspace not found');
	}

	if (!inviter) {
		throw new HttpError(404, 'Inviter not found');
	}

	const existing = await prisma.invitation.findUnique({
		where: { workspaceId_email: { workspaceId, email: normalizedEmail } },
	});

	const invitation = existing
		? await prisma.invitation.update({
			where: { id: existing.id },
			data: {
				role,
				token,
				status: 'pending',
				expiresAt,
				invitedById,
			},
		})
		: await prisma.invitation.create({
			data: {
				email: normalizedEmail,
				role,
				token,
				status: 'pending',
				expiresAt,
				workspaceId,
				invitedById,
			},
		});

	const appBaseUrl = process.env.FRONTEND_URL || process.env.APP_BASE_URL || 'http://localhost:3000';
	const inviteLink = `${appBaseUrl}/invite/${token}`;

	await sendWorkspaceInvitationEmail(
		normalizedEmail,
		workspace.name,
		inviter.name,
		inviteLink
	);

	return invitation;
};

export const validateInvitationToken = async (token: string) => {
	const invitation = await prisma.invitation.findUnique({
		where: { token },
		include: {
			workspace: {
				select: { id: true, name: true, slug: true },
			},
			invitedBy: {
				select: { id: true, name: true, email: true },
			},
		},
	});

	if (!invitation) {
		throw new HttpError(404, 'Invitation not found');
	}

	const now = new Date();
	const isExpired = invitation.expiresAt.getTime() < now.getTime();

	if (isExpired && invitation.status === 'pending') {
		await prisma.invitation.update({
			where: { id: invitation.id },
			data: { status: 'expired' },
		});
	}

	if (invitation.status !== 'pending' || isExpired) {
		throw new HttpError(409, 'Invitation expired or already used');
	}

	const existingUser = await prisma.user.findUnique({
		where: { email: invitation.email.toLowerCase() },
		select: { id: true },
	});

	return {
		email: invitation.email,
		role: invitation.role,
		expiresAt: invitation.expiresAt,
		workspace: invitation.workspace,
		invitedBy: invitation.invitedBy,
		accountExists: Boolean(existingUser),
	};
};

export const acceptInvitation = async (token: string, userId: number) => {
	const invitation = await prisma.invitation.findUnique({
		where: { token },
		include: {
			workspace: { select: { id: true, name: true, slug: true } },
		},
	});

	if (!invitation) {
		throw new HttpError(404, 'Invitation not found');
	}

	const now = new Date();
	const isExpired = invitation.expiresAt.getTime() < now.getTime();

	if (isExpired && invitation.status === 'pending') {
		await prisma.invitation.update({
			where: { id: invitation.id },
			data: { status: 'expired' },
		});
	}

	if (invitation.status !== 'pending' || isExpired) {
		throw new HttpError(409, 'Invitation expired or already used');
	}

	const user = await prisma.user.findUnique({
		where: { id: userId },
		select: { email: true },
	});

	if (!user) {
		throw new HttpError(404, 'User not found');
	}

	if (user.email.toLowerCase() !== invitation.email.toLowerCase()) {
		throw new HttpError(403, 'Invitation email does not match user');
	}

	if (!isInvitableRole(invitation.role)) {
		throw new HttpError(400, 'Invitation has an invalid role');
	}

	// Accepting never changes an existing membership's role (no escalation via invites).
	await prisma.workspaceMember.upsert({
		where: { userId_workspaceId: { userId, workspaceId: invitation.workspaceId } },
		update: {},
		create: {
			userId,
			workspaceId: invitation.workspaceId,
			role: invitation.role,
		},
	});

	await prisma.invitation.update({
		where: { id: invitation.id },
		data: { status: 'accepted' },
	});

	return {
		workspace: invitation.workspace,
		role: invitation.role,
	};
};
