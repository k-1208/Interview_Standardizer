import { prisma } from '../utils/prismaClient.js';
import { GEMINI_MODEL, geminiClient } from '../config/gemini.js';
import { buildStructuredInterviewPrompt, type InterviewDifficulty } from '../utils/prompt.js';
import { evaluateGeneratedEndpointResponse } from './aiEvaluation.service.js';
import { extractJsonFromModelText, generateToken, jsonToStringArray } from '../utils/helper.js';

interface GenerateInterviewQuestionsInput {
  candidateId?: number| null;
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

const QUESTION_CATEGORY_MAP: Record<GeneratedQuestion['dimension'], string> = {
  'Depth of Thinking': 'academic',
  'Learning Ability': 'academic',
  Curiosity: 'motivation',
  'Decision-Making': 'problem_solving',
  'Intellectual Honesty': 'ethics',
};

const CATEGORY_TO_DIMENSION: Record<string, GeneratedQuestion['dimension']> = {
  academic: 'Depth of Thinking',
  motivation: 'Curiosity',
  leadership: 'Decision-Making',
  ethics: 'Intellectual Honesty',
  problem_solving: 'Decision-Making',
};

const buildInterviewQuestionId = () => `IQ${generateToken(9)}`;

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
  let candidateProfile: unknown | null = null;
  let existingQuestions: GeneratedQuestion[] | null = null;
  let existingGeneratedAt: string | null = null;

  if (input.candidateId) {
    const candidate = await prisma.candidate.findUnique({
      where: { id: Number(input.candidateId) },
      select: {
        id: true,
        name: true,
        email: true,
        resume: true,
        resumeKey: true,
        board: true,
        grade10: true,
        grade12: true,
        gpa: true,
        degree: true,
        status: true,
        summary: true,
        aiSummary: true,
        activities: true,
        achievements: true,
        strengths: true,
        growthAreas: true,
        skills: true,
        createdAt: true,
        updatedAt: true,
        essays: {
          select: {
            title: true,
            content: true,
            createdAt: true,
          },
        },
        parsedFields: {
          select: {
            field: true,
            value: true,
            confidence: true,
            source: true,
            payload: true,
            createdAt: true,
          },
        },
        academicRecords: {
          select: {
            standard: true,
            schoolName: true,
            board: true,
            yearOfPassing: true,
            markingScheme: true,
            obtainedPercentageOrCgpa: true,
            subjects: {
              select: {
                subject: true,
                maximumMarksOrGrade: true,
                obtainedMarksOrGrade: true,
              },
            },
          },
        },
        competitiveExams: {
          select: {
            examName: true,
            status: true,
            testDate: true,
            rollNumber: true,
            totalScore: true,
            rankOrPercentile: true,
            result: true,
            sectionScores: {
              select: {
                section: true,
                score: true,
              },
            },
          },
        },
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
    candidateProfile = candidate;

    const storedQuestions = await prisma.interviewQuestion.findMany({
      where: { candidateId: Number(input.candidateId) },
      orderBy: { createdAt: 'asc' },
    });

    if (storedQuestions.length > 0) {
      existingQuestions = storedQuestions.map((item) => {
        const dimension = VALID_DIMENSIONS.includes(item.skillEvaluated as GeneratedQuestion['dimension'])
          ? (item.skillEvaluated as GeneratedQuestion['dimension'])
          : (CATEGORY_TO_DIMENSION[item.category] || 'Depth of Thinking');

        const cognitiveType = (Array.isArray(item.tags)
          ? item.tags.find((tag) => VALID_COGNITIVE_TYPES.includes(tag as GeneratedQuestion['cognitive_type']))
          : null) as GeneratedQuestion['cognitive_type'] | null;

        return {
          dimension,
          anchor: item.sourceText || 'Candidate profile context',
          cognitive_type: cognitiveType || 'reflection',
          difficulty: item.difficulty as GeneratedQuestion['difficulty'],
          question: item.question,
          why_this_question: item.rationale,
        };
      });

      const lastStoredQuestion = storedQuestions[storedQuestions.length - 1];
      if (lastStoredQuestion) {
        existingGeneratedAt = lastStoredQuestion.createdAt.toISOString();
      }
    }
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
    candidateProfile,
  };

  const questions = existingQuestions
    ? existingQuestions
    : await generateQuestionsWithGemini(
        parsedResumeData,
        desiredCount,
        interviewDurationMinutes,
        difficulty
      );

  if (!existingQuestions && input.candidateId) {
    const data = questions.map((item) => ({
      id: buildInterviewQuestionId(),
      candidateId: Number(input.candidateId),
      category: QUESTION_CATEGORY_MAP[item.dimension] || 'academic',
      difficulty: item.difficulty,
      question: item.question,
      skillEvaluated: item.dimension,
      rationale: item.why_this_question,
      sourceText: item.anchor,
      confidence: null,
      tags: [item.cognitive_type],
    }));

    if (data.length > 0) {
      await prisma.interviewQuestion.createMany({ data });
    }
  }

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
    generatedAt: existingGeneratedAt || new Date().toISOString(),
  };
};

