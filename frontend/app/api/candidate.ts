const BACKEND_BASE_URL =
	process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const AUTH_TOKEN_KEY = 'auth_token';

const getStoredToken = () => {
	if (typeof window === 'undefined') return null;
	return window.localStorage.getItem(AUTH_TOKEN_KEY);
};

interface ApiResponse<T> {
	success: boolean;
	message?: string;
	data?: T;
}

export interface CandidateListItem {
	id: number;
	name: string;
	board: string;
	grade10: string;
	grade12: string;
	status: string;
	createdAt: string;
	updatedAt: string;
}

export interface CandidateListResponse {
	workspaceId: number;
	candidates: CandidateListItem[];
}

export const getCandidates = async (workspaceId: number) => {
	const token = getStoredToken();
	const response = await fetch(`${BACKEND_BASE_URL}/api/candidates?workspaceId=${workspaceId}`, {
		credentials: 'include',
		headers: {
			'Content-Type': 'application/json',
			...(token ? { Authorization: `Bearer ${token}` } : {}),
		},
	});

	const raw = (await response.json().catch(() => ({}))) as ApiResponse<CandidateListResponse>;

	if (!response.ok || !raw.success || !raw.data) {
		throw new Error(raw.message || 'Failed to load candidates');
	}

	return raw.data;
};

export interface CandidateDetailResponse {
	workspaceId: number;
	candidate: {
		id: number;
		name: string;
		email: string;
		resume: string | null;
		resumeKey: string | null;
		board: string;
		grade10: string;
		grade12: string;
		gpa: string;
		degree: string;
		status: string;
		summary: string | null;
		aiSummary?: {
			summary: string | null;
			keyInsights?: string[];
			growthAreas?: string[];
		};
		activities: string[];
		achievements: string[];
		strengths: string[];
		growthAreas: string[];
		skills: string[];
		workspaceId: number;
		createdAt: string;
		updatedAt: string;
		essays?: Array<{
			id: number;
			title: string;
			content: string;
			createdAt: string;
		}>;
		parsedFields: Array<{
			id: number;
			field: string;
			value: string;
			confidence: 'high' | 'medium' | 'low';
			source: string;
			payload: unknown;
			createdAt: string;
		}>;
		resumeFiles: Array<{
			id: number;
			originalName: string;
			mimeType: string;
			size: number;
			resumeUrl: string;
			resumeKey: string;
			status: string;
			createdAt: string;
			updatedAt: string;
		}>;
		academicRecords: Array<{
			id: number;
			standard: string;
			schoolName: string;
			board: string;
			yearOfPassing: string;
			markingScheme: string;
			obtainedPercentageOrCgpa: string;
			createdAt: string;
			subjects: Array<{
				id: number;
				subject: string;
				maximumMarksOrGrade: string;
				obtainedMarksOrGrade: string;
				createdAt: string;
			}>;
		}>;
		competitiveExams: Array<{
			id: number;
			examName: string;
			status: string;
			testDate: string;
			rollNumber: string;
			totalScore: string;
			rankOrPercentile: string;
			result: string;
			createdAt: string;
			sectionScores: Array<{
				id: number;
				section: string;
				score: string;
				createdAt: string;
			}>;
		}>;
		interviewQuestions: Array<{
			id: string;
			category: string;
			difficulty: string;
			question: string;
			skillEvaluated: string;
			rationale: string;
			sourceText: string | null;
			confidence: number | null;
			tags: unknown;
			createdAt: string;
			updatedAt: string;
		}>;
		interviewSessions: Array<{
			id: string;
			version: string;
			dateGenerated: string;
			questionCount: number;
			status: string;
			generatedById: number;
		}>;
	};
}

export interface TranscriptAnalysisItem {
	id: number;
	botId: string | null;
	recordingId: string | null;
	transcriptId: string | null;
	summary: string | null;
	questionsAsked: string[];
	questionAnswerPairs?: Array<{ question: string; answer: string }>;
	createdAt: string;
}

export interface CandidateTranscriptAnalysisResponse {
	workspaceId: number;
	candidateId: number;
	analysis: TranscriptAnalysisItem | null;
}

export const getCandidateById = async (candidateId: number, workspaceId: number) => {
	const token = getStoredToken();
	const response = await fetch(
		`${BACKEND_BASE_URL}/api/candidates/${candidateId}?workspaceId=${workspaceId}`,
		{
			credentials: 'include',
			headers: {
				'Content-Type': 'application/json',
				...(token ? { Authorization: `Bearer ${token}` } : {}),
			},
		}
	);

	const raw = (await response.json().catch(() => ({}))) as ApiResponse<CandidateDetailResponse>;

	if (!response.ok || !raw.success || !raw.data) {
		throw new Error(raw.message || 'Failed to load candidate');
	}

	return raw.data;
};

export const getCandidateTranscriptAnalysis = async (candidateId: number, workspaceId: number) => {
	const token = getStoredToken();
	const response = await fetch(
		`${BACKEND_BASE_URL}/api/candidates/${candidateId}/transcript-analysis?workspaceId=${workspaceId}`,
		{
			credentials: 'include',
			headers: {
				'Content-Type': 'application/json',
				...(token ? { Authorization: `Bearer ${token}` } : {}),
			},
		}
	);

	const raw = (await response.json().catch(() => ({}))) as ApiResponse<CandidateTranscriptAnalysisResponse>;

	if (!response.ok || !raw.success || !raw.data) {
		throw new Error(raw.message || 'Failed to load transcript analysis');
	}

	return raw.data;
};