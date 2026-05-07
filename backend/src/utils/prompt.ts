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
5. Keep each question concise (30-40 words maximum)
6. Use simple, easy-to-understand language

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
	return `SYSTEM ROLE:
You are a precise academic data extractor for an admissions platform.
Your PRIMARY and MOST IMPORTANT task is to populate academicRecords and competitiveExams arrays completely.

INPUT:
Resume text:
"""
${pdfText}
"""

===== RAW TEXT LAYOUT NOTES (read this before extracting) =====
The input text is parsed from a PDF form. Column headers and values appear on SEPARATE lines
due to PDF parsing. Match values to columns by LEFT-TO-RIGHT ORDER, not by proximity.

ACADEMIC TABLE — columns always appear in this fixed order:
  School/Institute Name | Board | Year of Passing | [Result Status — 12th only] | Marking Scheme | Obtained Percentage/CGPA | [Predicted Marks — 12th only]

CRITICAL COLUMN RULES:
  - "Obtained Percentage/CGPA" is ALWAYS the numeric score (e.g. "96", "10", "99.1", "98.3", "8.5", "85%")
  - For 12th class ONLY, two extra columns appear: "Result Status" (e.g. "Passed", "Appearing") and
    "Predicted Marks/Grades" (e.g. "NA", "Appearing", a number). Both must be IGNORED when extracting obtained score.
  - The obtained score for 12th is always the numeric value BEFORE the Predicted column.
  - "Passed", "Appearing", "NA" are NEVER the obtained score — skip them entirely.

MARKING SCHEME can be any of:
  - "Percentage"       → obtained value is a percentage like "96", "98.3", "85.5"
  - "CGPA out of 10"  → obtained value is a GPA like "10", "9.8", "8.5"
  - "CGPA out of 4"   → obtained value is a GPA like "3.9", "4.0"
  - "Letter Grade"    → obtained value is a grade like "A+", "O"
  Extract whatever value is present — do not convert or normalize it.

ACADEMIC TABLE PARSING EXAMPLES:
  "9th TELANGANA BOARD OF SECONDARY EDUCATION 2022 Percentage 96"
  → standard:"9th", board:"TELANGANA BOARD OF SECONDARY EDUCATION", year:"2022", scheme:"Percentage", obtained:"96"

  "10th SOME BOARD 2023 Percentage 92.4"
  → standard:"10th", scheme:"Percentage", obtained:"92.4"

  "10th SOME BOARD 2023 CGPA out of 10 9.8"
  → standard:"10th", scheme:"CGPA out of 10", obtained:"9.8"

  "12th SOME BOARD 2025 Passed Percentage 98.3 NA"
  → standard:"12th", scheme:"Percentage", obtained:"98.3"
  → "Passed" = Result Status column — IGNORE
  → "NA" = Predicted Marks column — IGNORE

  "12th SOME BOARD 2025 Appearing CGPA out of 10 9.2 Appearing"
  → standard:"12th", scheme:"CGPA out of 10", obtained:"9.2"
  → first "Appearing" = Result Status — IGNORE
  → last "Appearing" = Predicted Marks — IGNORE

JEE TABLE — columns in order:
  Test Date | Roll Number | Physics % | Maths % | Chemistry % | Total Score | Common Rank/Percentile
  Test Date and Roll Number may be BLANK in the form. When blank, the numeric values shift left.
  Rule: if you see fewer values than columns, assume leftmost columns (Test Date, Roll Number) are blank first.
  Example: "JEE Mains 97.11 97.29 99.81 99.09" → testDate:"", rollNumber:"", Physics:"97.11", Maths:"97.29", Chemistry:"99.81", rank:"99.09"

===== OUTPUT FORMAT (STRICT JSON ONLY) =====
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
    "skills": [""],
    "academicRecords": [
      {
        "standard": "",
        "schoolName": "",
        "board": "",
        "yearOfPassing": "",
        "markingScheme": "",
        "obtainedPercentageOrCgpa": "",
        "subjects": [
          {
            "subject": "",
            "maximumMarksOrGrade": "",
            "obtainedMarksOrGrade": ""
          }
        ]
      }
    ],
    "competitiveExams": [
      {
        "examName": "",
        "status": "",
        "testDate": "",
        "rollNumber": "",
        "sectionScores": [
          {
            "section": "",
            "score": ""
          }
        ],
        "totalScore": "",
        "rankOrPercentile": "",
        "result": ""
      }
    ]
  },
  "aiSummary": {
    "summary": "",
    "keyInsights": [""],
    "growthAreas": [""]
  },
  "essays": [
    { "title": "", "content": "" }
  ],
  "parsedFields": [
    { "field": "", "value": "", "confidence": "high|medium|low", "source": "" }
  ]
}

===== EXTRACTION INSTRUCTIONS — FOLLOW IN ORDER =====

PASS 1 — BUILD academicRecords FIRST:
For each class section found (9th, 10th, 11th, 12th), extract one object.
Use the column-order rules above to identify the obtained score regardless of marking scheme.

  For each class:
  - standard: "9th" / "10th" / "11th" / "12th"
  - schoolName: institution name from that section
  - board: exact board name
  - yearOfPassing: 4-digit year
  - markingScheme: exact scheme string as written (e.g. "Percentage", "CGPA out of 10")
  - obtainedPercentageOrCgpa: the numeric/grade value for that class
      → Accept any format: "96", "98.3", "10", "9.8", "A+", "O", "3.9"
      → For 12th: skip "Passed"/"Appearing" (Result Status) and "NA"/"Appearing" (Predicted) — take the score between them
  - subjects: every numbered row from "Subject Wise Marks/Grades" under that class

PASS 2 — DERIVE top-level fields FROM academicRecords (do not re-read raw text):
  - grade10: find academicRecords entry where standard === "10th"
             copy its obtainedPercentageOrCgpa exactly as-is
             works for any scheme: "92.4" if Percentage, "9.8" if CGPA, "A" if Letter Grade

  - grade12: find academicRecords entry where standard === "12th"
             copy its obtainedPercentageOrCgpa exactly as-is
             works for any scheme: "98.3" if Percentage, "9.2" if CGPA

  - board:   board value from "12th" entry, fallback to "10th" entry if 12th absent

  - gpa:     "<obtainedPercentageOrCgpa> (<markingScheme>)" from 12th entry
             e.g. "98.3 (Percentage)" or "9.8 (CGPA out of 10)" or "3.9 (CGPA out of 4)"

  SELF-CHECK before writing final JSON:
  → Is grade10 === the obtainedPercentageOrCgpa of the 10th academicRecord? If not, fix it.
  → Is grade12 === the obtainedPercentageOrCgpa of the 12th academicRecord? If not, fix it.
  → Are grade10 and grade12 non-empty strings if those records exist? If empty, fix it.

PASS 3 — COMPETITIVE EXAMS:
  For each exam found apply JEE column-order rules above.
  - status: map source text →
      "Attempted the examination" → "Attempted"
      "Awaited Result"            → "Awaited"
      "Did not appear"            → "Not Attempted"
  - testDate, rollNumber: use "" if blank in the form
  - sectionScores: one object per subject percentile { "section": "<name>", "score": "<value>" }
  - result: "Qualified for JEE Advanced" / "Awaited" / "" based on JEE Advanced qualification field

PASS 4 — REMAINING FIELDS:
  - name: from "Applicant Name" or Personal Details name field — "" if blank
  - email: from "Email Address" in Personal Details — "" if blank
  - activities: from "Extra-Curricular Activities" table → "<Activity> - <Level> - <Achievement>"
  - achievements: from Co-Curricular and Leadership sections
  - essays: question text → title, full answer text → content

  PASS 5 — AI SUMMARY:
    After extracting the structured profile, produce a concise AI-generated summary of the candidate profile. This must be an objective, high-level paragraph (2-4 sentences) that highlights the candidate's strengths, key insights from their academic and activity records, and 2-4 actionable growth areas the candidate can work on. Return this as 'aiSummary' with fields:
      - summary: short paragraph (2-4 sentences)
      - keyInsights: array of short bullets (each 6-15 words) capturing most important signals
      - growthAreas: array of 2-4 concise suggestions candidate can work on
    The 'aiSummary' should be specific to the extracted profile (do NOT hallucinate facts not present in extracted fields).

===== STRICT OUTPUT RULES =====
- Return ONLY the raw JSON object. No markdown. No code fences. No commentary.
- grade10 and grade12 MUST NOT be empty if those academicRecords were successfully extracted.
- obtainedPercentageOrCgpa MUST be the actual score — never "Passed", "NA", or "Appearing".
- testDate and rollNumber MUST NOT contain percentile values.
- NEVER return empty [] for academicRecords or competitiveExams if data exists in the source.
- Use "" only for fields genuinely absent from the source text.
`;
};