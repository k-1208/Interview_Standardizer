import { buildRecallBotPayload, RECALL_API_BASE_URL, RECALL_API_KEY } from '../config/recall.js';

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

	return raw as RecallBotResponse;
};
