import { prisma } from '../utils/prismaClient.js';

type WorkspaceRole = 'super_admin' | 'admin' | 'reviewer';

const getPermissionsByRole = (role: WorkspaceRole) => {
	if (role === 'super_admin') {
		return {
			canManageWorkspace: true,
			canInviteMembers: true,
			canManageCandidates: true,
			canViewAllInterviews: true,
			canExportData: true,
		};
	}

	if (role === 'admin') {
		return {
			canManageWorkspace: false,
			canInviteMembers: true,
			canManageCandidates: true,
			canViewAllInterviews: true,
			canExportData: true,
		};
	}

	return {
		canManageWorkspace: false,
		canInviteMembers: false,
		canManageCandidates: true,
		canViewAllInterviews: false,
		canExportData: false,
	};
};

export async function getUser(userId: number) {
	const user = await prisma.user.findUnique({
		where: { id: userId },
		select: {
			id: true,
			name: true,
			organizationName: true,
			email: true,
			createdAt: true,
			workspaces: {
				select: {
					role: true,
					joinedAt: true,
					workspace: {
						select: {
							id: true,
							name: true,
							slug: true,
						},
					},
				},
			},
		},
	});

	if (!user) {
		throw new Error('User not found');
	}

	const membership = user.workspaces[0]
		? {
				role: user.workspaces[0].role as WorkspaceRole,
				joinedAt: user.workspaces[0].joinedAt,
				workspace: user.workspaces[0].workspace,
		  }
		: null;

    if(!membership) {
        throw new Error('User is not part of any workspace');
    }

	const activeWorkspace = membership.workspace;
	const permissions = getPermissionsByRole(membership.role);

	const organizationUsers =
		membership.role === 'super_admin'
			? await prisma.workspaceMember.findMany({
					where: { workspaceId: activeWorkspace.id },
					orderBy: { joinedAt: 'asc' },
					select: {
						role: true,
						joinedAt: true,
						user: {
							select: {
								id: true,
								name: true,
								organizationName: true,
								email: true,
								createdAt: true,
								updatedAt: true,
							},
						},
					},
			  })
			: [];

	const [
		totalCandidates,
		pendingCandidates,
		reviewedCandidates,
		interviewingCandidates,
		completedCandidates,
		totalInterviewSessions,
		scheduledInterviews,
		completedInterviews,
		cancelledInterviews,
		pendingInvitations,
		recentCandidates,
	] = await prisma.$transaction([
		prisma.candidate.count({ where: { workspaceId: activeWorkspace.id } }),
		prisma.candidate.count({ where: { workspaceId: activeWorkspace.id, status: 'pending' } }),
		prisma.candidate.count({ where: { workspaceId: activeWorkspace.id, status: 'reviewed' } }),
		prisma.candidate.count({ where: { workspaceId: activeWorkspace.id, status: 'interviewing' } }),
		prisma.candidate.count({ where: { workspaceId: activeWorkspace.id, status: 'completed' } }),
		prisma.interviewSession.count({ where: { candidate: { workspaceId: activeWorkspace.id } } }),
		prisma.interviewSession.count({ where: { candidate: { workspaceId: activeWorkspace.id }, status: 'scheduled' } }),
		prisma.interviewSession.count({ where: { candidate: { workspaceId: activeWorkspace.id }, status: 'completed' } }),
		prisma.interviewSession.count({ where: { candidate: { workspaceId: activeWorkspace.id }, status: 'cancelled' } }),
		prisma.invitation.count({ where: { workspaceId: activeWorkspace.id, status: 'pending' } }),
		prisma.candidate.findMany({
			where: { workspaceId: activeWorkspace.id },
			orderBy: { updatedAt: 'desc' },
			take: 8,
			select: {
				id: true,
				name: true,
				email: true,
				board: true,
				degree: true,
				grade10: true,
				grade12: true,
				gpa: true,
				status: true,
				createdAt: true,
				updatedAt: true,
			},
		}),
	]);

	return {
		user: {
			id: user.id,
			name: user.name,
			organizationName: user.organizationName,
			email: user.email,
			createdAt: user.createdAt,
		},
		position: {
			role: membership.role,
			joinedAt: membership.joinedAt,
		},
		workspace: {
			id: activeWorkspace.id,
			name: activeWorkspace.name,
			slug: activeWorkspace.slug,
		},
		permissions,
		dashboard: {
			kpis: {
				totalCandidates,
				pendingCandidates,
				reviewedCandidates,
				interviewingCandidates,
				completedCandidates,
				totalInterviewSessions,
				scheduledInterviews,
				completedInterviews,
				cancelledInterviews,
				pendingInvitations: permissions.canInviteMembers ? pendingInvitations : 0,
			},
			recentCandidates,
		},
		membership: {
			role: membership.role,
			joinedAt: membership.joinedAt,
			workspace: {
				id: membership.workspace.id,
				name: membership.workspace.name,
				slug: membership.workspace.slug,
			},
		},
		organizationUsers,
	};
}
