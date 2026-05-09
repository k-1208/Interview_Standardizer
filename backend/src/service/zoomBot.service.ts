import { buildRecallBotPayload, RECALL_API_BASE_URL, RECALL_API_KEY } from '../config/recall.js';
import { GEMINI_MODEL, geminiClient } from '../config/gemini.js';
import { buildTranscriptAnalysisPrompt } from '../utils/prompt.js';
import { extractJsonFromModelText } from '../utils/helper.js';
import { prisma } from '../utils/prismaClient.js';

type CreateMeetingBotInput = {
	meetingUrl: string;
	botName?: string;
	joinAt?: string | null;
	candidateId?: number | null;
};

type RecallBotResponse = {
	id: string;
	meeting_url: unknown;
	bot_name?: string;
	join_at?: string | null;
	recording_config?: unknown;
};

export type RecallWebhookPayload = {
	event?: string;
	data?: {
		bot?: {
			id?: string;
			metadata?: Record<string, unknown>;
		};
		data?: {
			code?: string;
			sub_code?: string | null;
			updated_at?: string;
		};
	};
};

export type RecallWebhookResult = {
	handled: boolean;
	message: string;
	candidateId?: number;
	analysisId?: number;
};

type RecallRecordingListResponse = {
	results?: Array<{
		id: string;
		created_at?: string;
		completed_at?: string | null;
		status?: { code?: string };
	}>;
};

type RecallTranscriptListResponse = {
	results?: Array<{
		id: string;
		status?: { code?: string };
		data?: { download_url?: string | null };
	}>;
};

type RecallTranscriptResponse = {
	data?: { download_url?: string | null };
	status?: { code?: string };
};

type TranscriptAnalysisResult = {
	summary: string;
	questionsAsked: string[];
	questionAnswerPairs: Array<{ question: string; answer: string }>;
};

export const createMeetingBot = async (input: CreateMeetingBotInput) => {
	if (!RECALL_API_KEY) {
		throw new Error('Recall API key is not configured');
	}

	const overrides: Parameters<typeof buildRecallBotPayload>[1] = {
		metadata: {
			source: 'plaksha-app',
			candidateId: input.candidateId ? String(input.candidateId) : 'unknown',
		},
	};

	if (input.botName) overrides.bot_name = input.botName;
	if (input.joinAt) overrides.join_at = input.joinAt;

	const payload = buildRecallBotPayload(input.meetingUrl, overrides);

	const response = await fetch(`${RECALL_API_BASE_URL}/bot/`, {
		method: 'POST',
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json',
			Authorization: RECALL_API_KEY,
		},
		body: JSON.stringify(payload),
	});

	const raw = (await response.json().catch(() => ({}))) as RecallBotResponse | { detail?: string };

	if (!response.ok) {
		const message = (raw as { detail?: string })?.detail || 'Failed to create Recall bot';
		throw new Error(message);
	}

	if (input.candidateId && (raw as RecallBotResponse).id) {
		await prisma.candidate.update({
			where: { id: input.candidateId },
			data: { botId: (raw as RecallBotResponse).id },
		});
	}

	return raw as RecallBotResponse;
};

const recallHeaders = () => ({
	Accept: 'application/json',
	Authorization: RECALL_API_KEY,
});

const pickLatestByTimestamp = <T extends { completed_at?: string | null; created_at?: string }>(
	items: T[]
): T | null => {
	if (items.length === 0) return null;
	return items.reduce((latest, current) => {
		const latestTime = Date.parse(latest.completed_at || latest.created_at || '') || 0;
		const currentTime = Date.parse(current.completed_at || current.created_at || '') || 0;
		return currentTime >= latestTime ? current : latest;
	});
};

const extractTranscriptText = (payload: unknown): string => {
	if (!payload) return '';
	if (Array.isArray(payload)) {
		const text = payload
			.map((turn) => {
				const words = (turn as { words?: Array<{ text?: string }> }).words;
				if (!Array.isArray(words)) return '';
				return words
					.map((word) => word?.text)
					.filter((value): value is string => Boolean(value && value.trim()))
					.join(' ')
					.trim();
			})
			.filter((line) => line.length > 0)
			.join('\n');
		return text.trim();
	}

	if (typeof payload !== 'object') return '';
	const data = payload as Record<string, unknown>;

	const transcript = data.transcript;
	if (typeof transcript === 'string') return transcript.trim();

	const turns = data.turns;
	if (Array.isArray(turns)) {
		const text = turns
			.map((turn) => {
				const words = (turn as { words?: Array<{ text?: string }> }).words;
				if (!Array.isArray(words)) return '';
				return words
					.map((word) => word?.text)
					.filter((value): value is string => Boolean(value && value.trim()))
					.join(' ')
					.trim();
			})
			.filter((line) => line.length > 0)
			.join('\n');
		if (text) return text.trim();
	}

	const segments = data.segments;
	if (Array.isArray(segments)) {
		const text = segments
			.map((segment) => (segment as { text?: string })?.text)
			.filter((value): value is string => Boolean(value && value.trim()))
			.join(' ');
		if (text) return text.trim();
	}

	const utterances = data.utterances;
	if (Array.isArray(utterances)) {
		const text = utterances
			.map((segment) => (segment as { text?: string })?.text)
			.filter((value): value is string => Boolean(value && value.trim()))
			.join(' ');
		if (text) return text.trim();
	}

	return '';
};

const analyzeTranscriptWithGemini = async (transcript: string): Promise<TranscriptAnalysisResult> => {
	const model = geminiClient.getGenerativeModel({ model: GEMINI_MODEL });
	const prompt = buildTranscriptAnalysisPrompt({ transcript });
	const result = await model.generateContent(prompt);
	const text = result.response.text();
	const jsonText = extractJsonFromModelText(text);
	const parsed = JSON.parse(jsonText) as Partial<TranscriptAnalysisResult>;
	const summary = typeof parsed.summary === 'string' ? parsed.summary.trim() : '';
	const questionAnswerPairs = Array.isArray(parsed.questionAnswerPairs)
		? parsed.questionAnswerPairs
				.map((pair) => {
					const question = typeof pair?.question === 'string' ? pair.question.trim() : '';
					const answer = typeof pair?.answer === 'string' ? pair.answer.trim() : '';
					return { question, answer };
				})
				.filter((pair) => pair.question.length > 0)
		: [];
	const questionsAsked = questionAnswerPairs.map((pair) => pair.question);
	return { summary, questionsAsked, questionAnswerPairs };
};

export const retrieveBot = async (payload: RecallWebhookPayload): Promise<RecallWebhookResult> => {
	if (payload.event !== 'bot.done') {
		return { handled: false, message: 'Event ignored' };
	}

	if (!RECALL_API_KEY) {
		throw new Error('Recall API key is not configured');
	}

	const botId = payload.data?.bot?.id;
	console.log('Processing bot with ID:', botId);

	if (!botId) {
		return { handled: false, message: 'Missing bot id' };
	}

	const candidate = await prisma.candidate.findFirst({
		where: { botId },
		select: { id: true },
	});
	console.log('Associated candidate:', candidate);

	if (!candidate) {
		return { handled: false, message: 'Candidate not found for bot id' };
	}

	const recordingsResponse = await fetch(
		`${RECALL_API_BASE_URL}/recording/?bot_id=${encodeURIComponent(botId)}&status_code=done`,
		{ headers: recallHeaders() }
	);

	const recordingsRaw = (await recordingsResponse.json().catch(() => ({}))) as RecallRecordingListResponse;
	const recordings = recordingsRaw.results || [];
	const latestRecording = pickLatestByTimestamp(recordings);
	console.log('Latest completed recording:', latestRecording);

	if (!latestRecording?.id) {
		return { handled: false, message: 'No completed recording found for bot' };
	}

	const transcriptsResponse = await fetch(
		`${RECALL_API_BASE_URL}/transcript/?recording_id=${encodeURIComponent(latestRecording.id)}&status_code=done`,
		{ headers: recallHeaders() }
	);

	const transcriptsRaw = (await transcriptsResponse.json().catch(() => ({}))) as RecallTranscriptListResponse;
	const transcriptId = transcriptsRaw.results?.[0]?.id;

	if (!transcriptId) {
		return { handled: false, message: 'Transcript not available yet' };
	}

	const transcriptResponse = await fetch(
		`${RECALL_API_BASE_URL}/transcript/${encodeURIComponent(transcriptId)}/`,
		{ headers: recallHeaders() }
	);

	const transcriptRaw = (await transcriptResponse.json().catch(() => ({}))) as RecallTranscriptResponse;
	const downloadUrl = transcriptRaw.data?.download_url;

	if (!downloadUrl) {
		return { handled: false, message: 'Transcript download URL missing' };
	}

	const transcriptDownloadResponse = await fetch(downloadUrl, {
		headers: { Accept: 'application/json' },
	});

	const transcriptPayload = (await transcriptDownloadResponse.json().catch(() => ({}))) as unknown;
	const transcriptText = extractTranscriptText(transcriptPayload);
	console.log('Transcript text:', transcriptText);

	if (!transcriptText) {
		return { handled: false, message: 'Transcript text is empty' };
	}

	console.log('Invoking Gemini transcript analysis');
	const analysis = await analyzeTranscriptWithGemini(transcriptText);
	console.log('Transcript analysis result:', JSON.stringify(analysis, null, 2));

	const analysisRecord = await prisma.transcriptAnalysis.create({
		data: {
			candidateId: candidate.id,
			botId,
			recordingId: latestRecording.id,
			transcriptId,
			transcriptText,
			summary: analysis.summary,
			questionsAsked: analysis.questionsAsked,
			questionAnswerPairs: analysis.questionAnswerPairs,
		},
	});

	await prisma.candidate.update({
		where: { id: candidate.id },
		data: { status: 'completed' },
	});

	return {
		handled: true,
		message: 'Transcript analyzed and stored',
		candidateId: candidate.id,
		analysisId: analysisRecord.id,
	};
};
