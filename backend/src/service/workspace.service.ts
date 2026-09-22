import type { Prisma } from '../../generated/prisma/client.js';
import { prisma } from '../utils/prismaClient.js';

const toSlug = (value: string) =>
	value
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9\s-]/g, '')
		.replace(/\s+/g, '-')
		.replace(/-+/g, '-');

type SlugLookup = Pick<typeof prisma.workspace, 'findUnique'>;

const buildUniqueWorkspaceSlug = async (name: string, lookup: SlugLookup = prisma.workspace) => {
	const baseSlug = toSlug(name) || 'workspace';
	let slug = baseSlug;
	let attempt = 1;

	while (true) {
		const existing = await lookup.findUnique({ where: { slug } });
		if (!existing) {
			return slug;
		}
		attempt += 1;
		slug = `${baseSlug}-${attempt}`;
	}
};

export async function createWorkspaceForUser(userId: number, name: string) {
	const trimmed = name.trim();
	if (!trimmed) {
		throw new Error('Organization name is required');
	}

	const owner = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
	if (!owner) {
		throw new Error('User not found');
	}

	return prisma.$transaction(async (tx) => {
		const slug = await buildUniqueWorkspaceSlug(trimmed, tx.workspace);

		const workspace = await tx.workspace.create({
			data: {
				name: trimmed,
				slug,
				ownerId: userId,
			},
			select: { id: true, name: true, slug: true, createdAt: true },
		});

		await tx.workspaceMember.create({
			data: {
				userId,
				workspaceId: workspace.id,
				role: 'super_admin',
			},
		});

		return workspace;
	});
}

export async function createWorkspaceForUserInTransaction(
	tx: Prisma.TransactionClient,
	userId: number,
	name: string
) {
	const trimmed = name.trim();
	const slug = await buildUniqueWorkspaceSlug(trimmed, tx.workspace);

	const workspace = await tx.workspace.create({
		data: {
			name: trimmed,
			slug,
			ownerId: userId,
		},
		select: { id: true },
	});

	await tx.workspaceMember.create({
		data: {
			userId,
			workspaceId: workspace.id,
			role: 'super_admin',
		},
	});

	return workspace;
}

export async function requireWorkspaceMembership(userId: number, workspaceId: number) {
	const membership = await prisma.workspaceMember.findFirst({
		where: { userId, workspaceId },
		select: { role: true, joinedAt: true, workspaceId: true },
	});

	if (!membership) {
		throw new Error('User does not have access to this workspace');
	}

	return membership;
}

export async function requireWorkspaceInvitePermission(userId: number, workspaceId: number) {
	const membership = await requireWorkspaceMembership(userId, workspaceId);
	if (membership.role !== 'super_admin' && membership.role !== 'admin') {
		throw new Error('You do not have permission to invite members to this workspace');
	}

	return membership;
}

type WorkspaceRole = 'super_admin' | 'admin' | 'reviewer';
const MANAGEABLE_ROLES = ['admin', 'reviewer'] as const;
export type InviteRole = (typeof MANAGEABLE_ROLES)[number];

export const isInviteRole = (role: string): role is InviteRole =>
	MANAGEABLE_ROLES.includes(role as InviteRole);

export function assertCanInviteRole(actorRole: WorkspaceRole, role: string): asserts role is InviteRole {
	if (!isInviteRole(role)) {
		throw new Error('Role must be admin or reviewer');
	}

	if (actorRole === 'admin' && role !== 'reviewer') {
		throw new Error('Admins can only invite reviewers');
	}
}

const assertCanManageMember = (
	actorRole: WorkspaceRole,
	targetRole: WorkspaceRole,
	actorUserId: number,
	targetUserId: number
) => {
	if (actorUserId === targetUserId) {
		throw new Error('You cannot change your own membership');
	}

	if (targetRole === 'super_admin') {
		throw new Error('Super admin membership cannot be modified');
	}

	if (actorRole !== 'super_admin' && actorRole !== 'admin') {
		throw new Error('You do not have permission to manage members');
	}

	if (actorRole === 'admin' && targetRole !== 'reviewer') {
		throw new Error('Admins can only manage reviewers');
	}
};

const toMemberPayload = (member: {
	role: WorkspaceRole;
	joinedAt: Date;
	user: {
		id: number;
		name: string;
		email: string;
		organizationName: string;
		createdAt?: Date;
	};
	assignedCandidateCount?: number;
}) => ({
	id: member.user.id,
	name: member.user.name,
	email: member.user.email,
	organizationName: member.user.organizationName,
	role: member.role,
	joinedAt: member.joinedAt,
	createdAt: member.user.createdAt,
	assignedCandidateCount: member.assignedCandidateCount,
});

export async function getWorkspaceMember({
	actorUserId,
	workspaceId,
	targetUserId,
}: {
	actorUserId: number;
	workspaceId: number;
	targetUserId: number;
}) {
	await requireWorkspaceInvitePermission(actorUserId, workspaceId);

	const member = await prisma.workspaceMember.findFirst({
		where: { userId: targetUserId, workspaceId },
		select: {
			role: true,
			joinedAt: true,
			user: {
				select: {
					id: true,
					name: true,
					email: true,
					organizationName: true,
					createdAt: true,
				},
			},
		},
	});

	if (!member) {
		throw new Error('Member not found in this workspace');
	}

	const assignedCandidateCount = await prisma.candidate.count({
		where: { workspaceId, assignedReviewerId: targetUserId },
	});

	return toMemberPayload({
		...member,
		role: member.role as WorkspaceRole,
		assignedCandidateCount,
	});
}

export async function updateWorkspaceMemberRole({
	actorUserId,
	workspaceId,
	targetUserId,
	role,
}: {
	actorUserId: number;
	workspaceId: number;
	targetUserId: number;
	role: string;
}) {
	if (!MANAGEABLE_ROLES.includes(role as (typeof MANAGEABLE_ROLES)[number])) {
		throw new Error('Role must be admin or reviewer');
	}

	const actor = await requireWorkspaceInvitePermission(actorUserId, workspaceId);
	const target = await prisma.workspaceMember.findFirst({
		where: { userId: targetUserId, workspaceId },
		select: { userId: true, role: true },
	});

	if (!target) {
		throw new Error('Member not found in this workspace');
	}

	assertCanManageMember(actor.role as WorkspaceRole, target.role as WorkspaceRole, actorUserId, targetUserId);

	const updated = await prisma.workspaceMember.update({
		where: { userId_workspaceId: { userId: targetUserId, workspaceId } },
		data: { role: role as 'admin' | 'reviewer' },
		select: {
			role: true,
			joinedAt: true,
			user: {
				select: {
					id: true,
					name: true,
					email: true,
					organizationName: true,
					createdAt: true,
				},
			},
		},
	});

	return toMemberPayload({
		...updated,
		role: updated.role as WorkspaceRole,
	});
}

export async function removeWorkspaceMember({
	actorUserId,
	workspaceId,
	targetUserId,
}: {
	actorUserId: number;
	workspaceId: number;
	targetUserId: number;
}) {
	const actor = await requireWorkspaceInvitePermission(actorUserId, workspaceId);
	const target = await prisma.workspaceMember.findFirst({
		where: { userId: targetUserId, workspaceId },
		select: { userId: true, role: true },
	});

	if (!target) {
		throw new Error('Member not found in this workspace');
	}

	assertCanManageMember(actor.role as WorkspaceRole, target.role as WorkspaceRole, actorUserId, targetUserId);

	await prisma.$transaction([
		prisma.candidate.updateMany({
			where: { workspaceId, assignedReviewerId: targetUserId },
			data: { assignedReviewerId: null },
		}),
		prisma.workspaceMember.delete({
			where: { userId_workspaceId: { userId: targetUserId, workspaceId } },
		}),
	]);

	return { id: targetUserId, removed: true };
}

const memberErrorStatus = (message: string) => {
	if (message === 'Member not found in this workspace') return 404;
	if (
		message === 'You do not have permission to invite members to this workspace' ||
		message === 'You do not have permission to manage members' ||
		message === 'Super admin membership cannot be modified' ||
		message === 'Admins can only manage reviewers' ||
		message === 'Admins can only invite reviewers' ||
		message === 'User does not have access to this workspace'
	) {
		return 403;
	}
	if (
		message === 'You cannot change your own membership' ||
		message === 'Role must be admin or reviewer' ||
		message === 'Invitation role is invalid'
	) {
		return 400;
	}
	return 500;
};

export { memberErrorStatus };
