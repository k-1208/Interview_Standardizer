import { GoogleGenerativeAI, GoogleGenerativeAIAbortError } from '@google/generative-ai';

const geminiApiKey = process.env.GEMINI_API_KEY;

if (!geminiApiKey) {
  throw new Error('GEMINI_API_KEY is missing. Add it in backend environment variables.');
}

export const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3-flash-preview';
export const GEMINI_EVALUATION_MODEL = process.env.GEMINI_EVALUATION_MODEL || 'gemini-2.0-flash';

export const geminiClient = new GoogleGenerativeAI(geminiApiKey);

// Per-call time limits so a hung Gemini request can't block a worker slot or an HTTP request.
const timeoutFromEnv = (name: string, fallbackMs: number) => {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallbackMs;
};

export const GEMINI_TIMEOUTS = {
  resumeParse: timeoutFromEnv('GEMINI_PARSE_TIMEOUT_MS', 90_000),
  questionGeneration: timeoutFromEnv('GEMINI_QUESTIONS_TIMEOUT_MS', 60_000),
  evaluation: timeoutFromEnv('GEMINI_EVALUATION_TIMEOUT_MS', 60_000),
  transcriptAnalysis: timeoutFromEnv('GEMINI_TRANSCRIPT_TIMEOUT_MS', 90_000),
} as const;

export const getGeminiModel = (model: string, timeoutMs: number) =>
  geminiClient.getGenerativeModel({ model }, { timeout: timeoutMs });

export const isGeminiTimeout = (error: unknown) => error instanceof GoogleGenerativeAIAbortError;
