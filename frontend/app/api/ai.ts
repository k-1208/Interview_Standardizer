const BACKEND_BASE_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

const AUTH_TOKEN_KEY = "auth_token";

const getStoredToken = () => {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(AUTH_TOKEN_KEY);
};

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

export interface GenerateQuestionsInput {
  candidateId?: number;
  role?: string;
  context?: string;
  count?: number;
  interviewDurationMinutes?: number;
  difficulty?: "easy" | "medium" | "hard";
}

export interface GeneratedQuestionPayload {
  questions: Array<{
    question: string;
    dimension: "Curiosity" | "Depth of Thinking" | "Learning Ability" | "Decision-Making" | "Intellectual Honesty";
    anchor: string;
    cognitive_type: "trade-off" | "reflection" | "counterfactual" | "abstraction" | "failure analysis";
    difficulty: "easy" | "medium" | "hard";
    why_this_question: string;
  }>;
}

export interface GenerateQuestionsResponse {
  candidateId: number | null;
  candidateName: string;
  role: string;
  interviewDurationMinutes: number;
  difficulty: "easy" | "medium" | "hard";
  questionCount: number;
  questions: GeneratedQuestionPayload["questions"];
  generatedAt: string;
}

export const generateInterviewQuestions = async (input: GenerateQuestionsInput) => {
  const token = getStoredToken();
  const response = await fetch(`${BACKEND_BASE_URL}/api/ai/questions/generate`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "ngrok-skip-browser-warning": "true",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(input),
  });

  const raw = (await response.json().catch(() => ({}))) as ApiResponse<GenerateQuestionsResponse>;

  if (!response.ok || !raw.success || !raw.data) {
    throw new Error(raw.message || "Failed to generate interview questions");
  }

  return raw.data;
};

export interface SendBotInput {
  meetingUrl: string;
  candidateId?: number;
  botName?: string;
  joinAt?: string | null;
}

export interface SendBotResponse {
  id: string;
  meeting_url: unknown;
  bot_name?: string;
  join_at?: string | null;
  recording_config?: unknown;
}

export const sendInterviewBot = async (input: SendBotInput) => {
  const token = getStoredToken();
  const response = await fetch(`${BACKEND_BASE_URL}/api/ai/bot/join`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "ngrok-skip-browser-warning": "true",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(input),
  });

  const raw = (await response.json().catch(() => ({}))) as ApiResponse<SendBotResponse>;

  if (!response.ok || !raw.success || !raw.data) {
    throw new Error(raw.message || "Failed to send bot to meeting");
  }

  return raw.data;
};
