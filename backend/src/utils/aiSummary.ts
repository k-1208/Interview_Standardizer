import { jsonToStringArray } from './helper.js';

export type CandidateAiSummary = {
  summary: string;
  keyInsights: string[];
  growthAreas: string[];
};

/** aiSummary is stored as JSON text; older rows hold a plain summary string. */
export const serializeAiSummary = (value: CandidateAiSummary | undefined | null) =>
  value?.summary ? JSON.stringify(value) : null;

export const normalizeAiSummary = (stored: string | null | undefined): CandidateAiSummary | null => {
  if (!stored || !stored.trim()) return null;
  try {
    const parsed = JSON.parse(stored) as Record<string, unknown>;
    if (parsed && typeof parsed === 'object' && typeof parsed.summary === 'string') {
      return {
        summary: parsed.summary,
        keyInsights: jsonToStringArray(parsed.keyInsights),
        growthAreas: jsonToStringArray(parsed.growthAreas),
      };
    }
  } catch {
    // legacy plain-text value
  }
  return { summary: stored.trim(), keyInsights: [], growthAreas: [] };
};
