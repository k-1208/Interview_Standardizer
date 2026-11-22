import { sendError } from '../utils/httpError.js';
import type { Request, Response } from 'express';
import { generateInterviewQuestions } from '../service/ai.service.js';
import { createMeetingBot } from '../service/zoomBot.service.js';
import { isGeminiTimeout } from '../config/gemini.js';

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
      workspaceId: number;
      candidateId?: number | null;
      role?: string;
      context?: string;
      count?: number;
      interviewDurationMinutes?: number;
      difficulty?: 'easy' | 'medium' | 'hard';
    } = { workspaceId: req.membership!.workspaceId };

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
  } catch (err) {
    if (isGeminiTimeout(err)) {
      res.status(504).json({
        success: false,
        message: 'Question generation took too long. Please try again.',
      });
      return;
    }
    
    sendError(res, err, 'ai/generateQuestions', 'Failed to generate interview questions');
  }
};

export const sendInterviewBot = async (req: Request, res: Response): Promise<void> => {
  const { meetingUrl, candidateId, botName, joinAt } = req.body || {};

  if (!meetingUrl || typeof meetingUrl !== 'string') {
    res.status(400).json({ success: false, message: 'meetingUrl is required' });
    return;
  }

  try {
    const payload: {
      workspaceId: number;
      meetingUrl: string;
      candidateId?: number | null;
      botName?: string;
      joinAt?: string | null;
    } = {
      workspaceId: req.membership!.workspaceId,
      meetingUrl,
      candidateId: candidateId ? Number(candidateId) : null,
    };

    if (botName) payload.botName = String(botName);
    if (joinAt) payload.joinAt = String(joinAt);

    const data = await createMeetingBot(payload);

    res.status(201).json({ success: true, data });
  } catch (err) {
    sendError(res, err, 'ai/sendInterviewBot', 'Failed to send bot to meeting');
  }
};
