export type InterviewDifficulty = 'easy' | 'medium' | 'hard';

export interface StructuredPromptInput {
	parsedResumeData: unknown;
	totalQuestions: number;
	interviewDurationMinutes: number;
	difficulty: InterviewDifficulty;
}

const safeJsonStringify = (value: unknown) => {
	try {
		return JSON.stringify(value, null, 2);
	} catch {
		return JSON.stringify({ error: 'Unable to serialize parsedResumeData' }, null, 2);
	}
};

export const buildStructuredInterviewPrompt = ({
	parsedResumeData,
	totalQuestions,
	interviewDurationMinutes,
	difficulty,
}: StructuredPromptInput): string => {
	const candidateProfileJson = safeJsonStringify(parsedResumeData);

	return `SYSTEM ROLE:
You are an expert academic interviewer at a top-tier interdisciplinary university.
Your goal is to design high-signal interview questions that reveal how a candidate thinks, not just what they have done.

You must strictly avoid generic or template-based questions.

---

INPUT:
1. Candidate Profile (structured JSON)
${candidateProfileJson}

2. Evaluation Dimensions:
	 - Curiosity
	 - Depth of Thinking
	 - Learning Ability
	 - Decision-Making
	 - Intellectual Honesty

3. Constraints:
	 - Total questions: ${totalQuestions}
	 - Interview duration: ${interviewDurationMinutes} minutes
	 - Difficulty: ${difficulty}

---

TASK:

Generate a set of interview questions that:
1. Are deeply grounded in the candidate's actual experiences (projects, choices, inconsistencies, transitions)
2. Probe qualitative traits (thinking, reasoning, reflection, trade-offs)
3. Require explanation, not recall
4. Avoid generic phrasing (e.g., "tell me about", "what are your strengths")

---

INTERNAL REASONING STEPS (DO NOT OUTPUT):

Step 1: Identify high-signal anchors in the profile:
- non-trivial projects
- unusual transitions
- evidence of initiative or ambiguity
- incomplete or inconsistent elements

Step 2: For each anchor, map it to one or more evaluation dimensions.

Step 3: Convert each anchor into a "cognitive probe":
- ask WHY decisions were made
- ask HOW trade-offs were handled
- ask WHAT would change under constraints
- ask COUNTERFACTUALS where appropriate

Step 4: Ensure diversity:
- no two questions should test the same cognitive pattern

---

OUTPUT FORMAT (STRICT):

Return JSON only:

{
	"questions": [
		{
			"question": "...",
			"dimension": "Curiosity | Depth of Thinking | Learning Ability | Decision-Making | Intellectual Honesty",
			"anchor": "what part of the profile this question is derived from",
			"cognitive_type": "trade-off | reflection | counterfactual | abstraction | failure analysis",
			"difficulty": "easy | medium | hard",
			"why_this_question": "1-2 line explanation of what this reveals about the candidate"
		}
	]
}

---

QUALITY BAR:

A good question:
- cannot be answered without thinking
- is specific to THIS candidate
- exposes reasoning gaps or strengths

A bad question:
- is generic
- can apply to any candidate
- only asks for description of past work

---

FAIL CONDITIONS (STRICT):
- Any generic question -> FAIL
- No clear link to candidate profile -> FAIL
- Questions testing only factual recall -> FAIL

---

EXAMPLE TRANSFORMATION (DO NOT REUSE):

Input signal:
"Built a machine learning model for predicting rainfall"

Bad question:
"Explain your project"

Good question:
"What assumptions did your rainfall prediction model make about data distribution, and how would those assumptions break in a different geographic region?"

---`;
};

export const buildResumeParsingPrompt = (pdfText: string): string => {
	return 	`SYSTEM ROLE:
You are a resume parser for an admissions platform.
Extract structured data from the resume text.

INPUT:
Resume text:
"""
${pdfText}
"""

OUTPUT FORMAT (STRICT JSON ONLY):
{
  "profile": {
    "name": "",
    "email": "",
    "board": "",
    "grade10": "",
    "grade12": "",
    "gpa": "",
    "degree": "",
    "summary": "",
    "activities": [""],
    "achievements": [""],
    "strengths": [""],
    "growthAreas": [""],
    "skills": [""]
  },
  "essays": [
    { "title": "", "content": "" }
  ],
  "parsedFields": [
    { "field": "", "value": "", "confidence": "high|medium|low", "source": "" }
  ]
}

RULES:
- Return JSON only, no markdown or commentary.
- Use empty strings or empty arrays when unknown.
- Do not fabricate emails or grades; leave empty if not present.
`};
