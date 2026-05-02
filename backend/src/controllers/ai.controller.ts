import type { Request, Response } from 'express';
import { generateInterviewQuestions } from '../service/ai.service.js';

export const generateQuestions = async (req: Request, res: Response): Promise<void> => {
  const { candidateId, role, context, count, interviewDurationMinutes, difficulty } = req.body || {};

  if (!candidateId && !context) {
    res.status(400).json({
      success: false,
      message: 'Provide either candidateId or context to generate questions',
    });
    return;
  }

  try {
    const payload: {
      candidateId?: number | null;
      role?: string;
      context?: string;
      count?: number;
      interviewDurationMinutes?: number;
      difficulty?: 'easy' | 'medium' | 'hard';
    } = {};

    if (candidateId) payload.candidateId = Number(candidateId);
    if (role) payload.role = String(role);
    if (context) payload.context = String(context);
    if (typeof count === 'number') payload.count = count;
    if (typeof interviewDurationMinutes === 'number') {
      payload.interviewDurationMinutes = interviewDurationMinutes;
    }
    if (difficulty === 'easy' || difficulty === 'medium' || difficulty === 'hard') {
      payload.difficulty = difficulty;
    }

    const data = await generateInterviewQuestions(payload);

    res.status(200).json({ success: true, data });
  } catch (err: any) {
    const isNotFound = err?.message === 'Candidate not found';
    res.status(isNotFound ? 404 : 500).json({
      success: false,
      message: err?.message || 'Failed to generate interview questions',
    });
  }
};
