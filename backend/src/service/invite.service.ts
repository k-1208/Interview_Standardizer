import { prisma } from '../utils/prismaClient.js';
import { generateToken } from '../utils/helper.js';
import { sendWorkspaceInvitationEmail } from './email.service.js';

type WorkspaceRole = 'super_admin' | 'admin' | 'reviewer';

const INVITE_EXPIRY_DAYS = 7;

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

	const [workspace, inviter] = await Promise.all([
		prisma.workspace.findUnique({ where: { id: workspaceId }, select: { id: true, name: true, slug: true } }),
		prisma.user.findUnique({ where: { id: invitedById }, select: { id: true, name: true } }),
	]);

	if (!workspace) {
		throw new Error('Workspace not found');
	}

	if (!inviter) {
		throw new Error('Inviter not found');
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
		throw new Error('Invitation not found');
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
		throw new Error('Invitation expired or already used');
	}

	return {
		email: invitation.email,
		role: invitation.role,
		expiresAt: invitation.expiresAt,
		workspace: invitation.workspace,
		invitedBy: invitation.invitedBy,
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
		throw new Error('Invitation not found');
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
		throw new Error('Invitation expired or already used');
	}

	const user = await prisma.user.findUnique({
		where: { id: userId },
		select: { email: true },
	});

	if (!user) {
		throw new Error('User not found');
	}

	if (user.email.toLowerCase() !== invitation.email.toLowerCase()) {
		throw new Error('Invitation email does not match user');
	}

	await prisma.workspaceMember.upsert({
		where: { userId_workspaceId: { userId, workspaceId: invitation.workspaceId } },
		update: { role: invitation.role },
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
