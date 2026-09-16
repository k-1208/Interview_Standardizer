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
