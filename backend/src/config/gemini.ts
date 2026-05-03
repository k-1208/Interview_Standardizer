import { GoogleGenerativeAI } from '@google/generative-ai';

const geminiApiKey = process.env.GEMINI_API_KEY;

if (!geminiApiKey) {
  throw new Error('GEMINI_API_KEY is missing. Add it in backend environment variables.');
}

export const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
export const GEMINI_EVALUATION_MODEL = process.env.GEMINI_EVALUATION_MODEL || 'gemini-2.0-flash';

export const geminiClient = new GoogleGenerativeAI(geminiApiKey);
