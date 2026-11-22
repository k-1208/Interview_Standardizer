import { GoogleGenerativeAI, GoogleGenerativeAIAbortError } from '@google/generative-ai';
import { resolveApiKey } from '../service/apiKey.service.js';

// GEMINI_API_KEY is now optional: it is the server-wide default, used when a
// workspace hasn't set its own key in Settings → API keys.

export const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3-flash-preview';
export const GEMINI_EVALUATION_MODEL = process.env.GEMINI_EVALUATION_MODEL || 'gemini-2.0-flash';

// One client per distinct key (workspaces can bring their own).
const clients = new Map<string, GoogleGenerativeAI>();
const clientFor = (apiKey: string) => {
  let client = clients.get(apiKey);
  if (!client) {
    client = new GoogleGenerativeAI(apiKey);
    clients.set(apiKey, client);
  }
  return client;
};

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

/** Gemini model bound to the workspace's API key (or the server default). */
export const getGeminiModel = async (workspaceId: number, model: string, timeoutMs: number) => {
  const apiKey = await resolveApiKey(workspaceId, 'gemini');
  return clientFor(apiKey).getGenerativeModel({ model }, { timeout: timeoutMs });
};

export const isGeminiTimeout = (error: unknown) => error instanceof GoogleGenerativeAIAbortError;
