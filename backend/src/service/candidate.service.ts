import { prisma } from '../utils/prismaClient.js';

export type GetCandidateDetailInput = {
	userId: number;
	workspaceId: number;
	candidateId: number;
};

export async function getCandidateDetail({ userId, workspaceId, candidateId }: GetCandidateDetailInput) {
	const membership = await prisma.workspaceMember.findFirst({
		where: {
			userId,
			workspaceId,
		},
		select: {
			id: true,
			role: true,
			workspaceId: true,
		},
	});

	if (!membership) {
		throw new Error('User does not have access to this workspace');
	}

	const candidate = await prisma.candidate.findFirst({
		where: {
			id: candidateId,
			workspaceId,
		},
		select: {
			id: true,
			name: true,
			email: true,
			resume: true,
			resumeKey: true,
			board: true,
			grade10: true,
			grade12: true,
			gpa: true,
			degree: true,
			status: true,
			summary: true,
			activities: true,
			achievements: true,
			strengths: true,
			growthAreas: true,
			skills: true,
			workspaceId: true,
			createdAt: true,
			updatedAt: true,
			essays: {
				orderBy: { createdAt: 'asc' },
				select: {
					id: true,
					title: true,
					content: true,
					createdAt: true,
				},
			},
			parsedFields: {
				orderBy: { createdAt: 'asc' },
				select: {
					id: true,
					field: true,
					value: true,
					confidence: true,
					source: true,
					payload: true,
					createdAt: true,
				},
			},
			resumeFiles: {
				orderBy: { createdAt: 'asc' },
				select: {
					id: true,
					originalName: true,
					mimeType: true,
					size: true,
					resumeUrl: true,
					resumeKey: true,
					status: true,
					createdAt: true,
					updatedAt: true,
				},
			},
			academicRecords: {
				orderBy: { createdAt: 'asc' },
				select: {
					id: true,
					standard: true,
					schoolName: true,
					board: true,
					yearOfPassing: true,
					markingScheme: true,
					obtainedPercentageOrCgpa: true,
					createdAt: true,
					subjects: {
						orderBy: { createdAt: 'asc' },
						select: {
							id: true,
							subject: true,
							maximumMarksOrGrade: true,
							obtainedMarksOrGrade: true,
							createdAt: true,
						},
					},
				},
			},
			competitiveExams: {
				orderBy: { createdAt: 'asc' },
				select: {
					id: true,
					examName: true,
					status: true,
					testDate: true,
					rollNumber: true,
					totalScore: true,
					rankOrPercentile: true,
					result: true,
					createdAt: true,
					sectionScores: {
						orderBy: { createdAt: 'asc' },
						select: {
							id: true,
							section: true,
							score: true,
							createdAt: true,
						},
					},
				},
			},
			interviewQuestions: {
				orderBy: { createdAt: 'asc' },
				select: {
					id: true,
					category: true,
					difficulty: true,
					question: true,
					skillEvaluated: true,
					rationale: true,
					sourceText: true,
					confidence: true,
					tags: true,
					createdAt: true,
					updatedAt: true,
				},
			},
			interviewSessions: {
				orderBy: { dateGenerated: 'asc' },
				select: {
					id: true,
					version: true,
					dateGenerated: true,
					questionCount: true,
					status: true,
					generatedById: true,
				},
			},
		},
	});

	if (!candidate) {
		throw new Error('Candidate not found in this workspace');
	}

	return {
		workspaceId,
		candidate,
	};
}
