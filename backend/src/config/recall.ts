export const RECALL_API_BASE_URL =
	process.env.RECALL_API_BASE_URL || "https://us-west-2.recall.ai/api/v1";

export const RECALL_API_KEY = process.env.RECALL_API_KEY || "";

export type RecallBotCreateInput = {
	meeting_url: string;
	bot_name?: string;
	join_at?: string | null;
	recording_config?: {
		transcript?: {
			provider?: {
				recallai_streaming?: {
					language_code?: string;
					filter_profanity?: boolean;
					mode?: "prioritize_accuracy" | "prioritize_speed";
				};
			};
		};
	};
	metadata?: Record<string, string>;
};

export const defaultRecallBotConfig: Omit<RecallBotCreateInput, "meeting_url"> = {
	bot_name: "Plaksha Interview Bot",
	join_at: null,
	recording_config: {
		transcript: {
			provider: {
				recallai_streaming: {
					language_code: "auto",
					filter_profanity: false,
					mode: "prioritize_accuracy",
				},
			},
		},
	},
	metadata: {
		source: "plaksha-app",
	},
};

export const buildRecallBotPayload = (
	meetingUrl: string,
	overrides?: Partial<RecallBotCreateInput>
): RecallBotCreateInput => {
	return {
		meeting_url: meetingUrl,
		...defaultRecallBotConfig,
		...overrides,
		recording_config: {
			...defaultRecallBotConfig.recording_config,
			...(overrides?.recording_config || {}),
		},
	};
};
