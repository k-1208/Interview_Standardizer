import OpenAI from "openai";

const groqApiKey = process.env.GROQ_API_KEY;

if (!groqApiKey) {
  throw new Error(
    "GROQ_API_KEY is missing. Add it in backend environment variables."
  );
}

export const GROQ_MODEL =
  process.env.GROQ_MODEL || "llama-3.1-8b-instant";

export const GROQ_EVALUATION_MODEL =
  process.env.GROQ_EVALUATION_MODEL || "llama-3.1-8b-instant";

// 🔥 IMPORTANT: baseURL for Groq
export const groqClient = new OpenAI({
  apiKey: groqApiKey,
  baseURL: "https://api.groq.com/openai/v1",
});