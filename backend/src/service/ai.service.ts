import { prisma } from '../utils/prismaClient.js';
import { GEMINI_MODEL, geminiClient } from '../config/gemini.js';
import { buildStructuredInterviewPrompt, type InterviewDifficulty } from '../utils/prompt.js';
import { evaluateGeneratedEndpointResponse } from './aiEvaluation.service.js';

interface GenerateInterviewQuestionsInput {
  candidateId?: string;
  role?: string;
  context?: string;
  count?: number;
  interviewDurationMinutes?: number;
  difficulty?: InterviewDifficulty;
}

interface GeneratedQuestion {
  dimension: 'Curiosity' | 'Depth of Thinking' | 'Learning Ability' | 'Decision-Making' | 'Intellectual Honesty';
  anchor: string;
  cognitive_type: 'trade-off' | 'reflection' | 'counterfactual' | 'abstraction' | 'failure analysis';
  difficulty: 'easy' | 'medium' | 'hard';
  question: string;
  why_this_question: string;
}

const DEFAULT_COUNT = 6;
const MAX_COUNT = 12;

const VALID_DIMENSIONS: GeneratedQuestion['dimension'][] = [
  'Curiosity',
  'Depth of Thinking',
  'Learning Ability',
  'Decision-Making',
  'Intellectual Honesty',
];

const VALID_COGNITIVE_TYPES: GeneratedQuestion['cognitive_type'][] = [
  'trade-off',
  'reflection',
  'counterfactual',
  'abstraction',
  'failure analysis',
];

const jsonToStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
};

const clampQuestionCount = (count?: number) => {
  if (!count || Number.isNaN(count)) return DEFAULT_COUNT;
  return Math.max(1, Math.min(MAX_COUNT, Math.floor(count)));
};

const clampInterviewDuration = (minutes?: number, fallbackCount?: number) => {
  if (!minutes || Number.isNaN(minutes)) {
    return Math.max(20, (fallbackCount || DEFAULT_COUNT) * 4);
  }
  return Math.max(10, Math.floor(minutes));
};

const extractJsonFromModelText = (value: string) => {
  const trimmed = value.trim();
  const fencedMatch = trimmed.match(/```json\s*([\s\S]*?)```/i);
  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim();
  }

  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }

  return trimmed;
};

const validateQuestions = (questions: unknown): GeneratedQuestion[] => {
  if (!Array.isArray(questions)) {
    throw new Error('Gemini response did not include a valid questions array');
  }

  return questions.map((item) => {
    const question = item as Partial<GeneratedQuestion>;
    const difficulty = question.difficulty;
    const safeDifficulty: GeneratedQuestion['difficulty'] =
      difficulty === 'easy' || difficulty === 'medium' || difficulty === 'hard'
        ? difficulty
        : 'medium';

    const safeDimension = VALID_DIMENSIONS.includes(
      question.dimension as GeneratedQuestion['dimension']
    )
      ? (question.dimension as GeneratedQuestion['dimension'])
      : 'Depth of Thinking';

    const safeCognitiveType = VALID_COGNITIVE_TYPES.includes(
      question.cognitive_type as GeneratedQuestion['cognitive_type']
    )
      ? (question.cognitive_type as GeneratedQuestion['cognitive_type'])
      : 'reflection';

    return {
      dimension: safeDimension,
      anchor: String(question.anchor || 'Candidate profile context'),
      cognitive_type: safeCognitiveType,
      difficulty: safeDifficulty,
      question: String(question.question || '').trim(),
      why_this_question: String(
        question.why_this_question || 'Evaluates candidate reasoning under realistic constraints.'
      ),
    };
  }).filter((q) => q.question.length > 0);
};

const generateQuestionsWithGemini = async (
  parsedResumeData: unknown,
  desiredCount: number,
  interviewDurationMinutes: number,
  difficulty: InterviewDifficulty
) => {
  const model = geminiClient.getGenerativeModel({ model: GEMINI_MODEL });

  const prompt = buildStructuredInterviewPrompt({
    parsedResumeData,
    totalQuestions: desiredCount,
    interviewDurationMinutes,
    difficulty,
  });

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  const jsonText = extractJsonFromModelText(text);
  const parsed = JSON.parse(jsonText) as { questions?: unknown };
  return validateQuestions(parsed.questions);
};

export const generateInterviewQuestions = async (input: GenerateInterviewQuestionsInput) => {
  const desiredCount = clampQuestionCount(input.count);
  const role = (input.role || 'general').trim() || 'general';
  const difficulty: InterviewDifficulty = input.difficulty || 'medium';
  const interviewDurationMinutes = clampInterviewDuration(input.interviewDurationMinutes, desiredCount);

  let candidateName = 'Candidate';
  let candidateSkills: string[] = [];

  if (input.candidateId) {
    const candidate = await prisma.candidate.findUnique({
      where: { id: input.candidateId },
      select: {
        id: true,
        name: true,
        skills: true,
        strengths: true,
      },
    });

    if (!candidate) {
      throw new Error('Candidate not found');
    }

    candidateName = candidate.name;

    const skillList = [
      ...jsonToStringArray(candidate.skills),
      ...jsonToStringArray(candidate.strengths),
    ];

    candidateSkills = Array.from(new Set(skillList.map((item) => item.trim()).filter(Boolean)));
  }

  if (candidateSkills.length === 0) {
    const contextTokens = (input.context || '')
      .split(/[,.\n]/)
      .map((token) => token.trim())
      .filter(Boolean)
      .slice(0, desiredCount);

    candidateSkills = contextTokens.length > 0 ? contextTokens : ['problem solving', 'communication', 'ownership'];
  }

  const parsedResumeData = {
    candidateId: input.candidateId || null,
    candidateName,
    role,
    context: input.context || null,
    extractedSkills: candidateSkills,
  };

  const questions = await generateQuestionsWithGemini(
    parsedResumeData,
    desiredCount,
    interviewDurationMinutes,
    difficulty
  );

  const evaluation = await evaluateGeneratedEndpointResponse({
    candidateProfile: parsedResumeData,
    generatedResponse: { questions },
  });

  return {
    candidateId: input.candidateId || null,
    candidateName,
    role,
    interviewDurationMinutes,
    difficulty,
    questionCount: questions.length,
    questions,
    evaluation,
    generatedAt: new Date().toISOString(),
  };
};
