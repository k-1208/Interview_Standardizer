import { Router } from 'express';
import { generateQuestions, sendInterviewBot } from '../controllers/ai.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requireWorkspaceAccess } from '../middleware/tenant.middleware.js';

const router = Router();

// POST /api/ai/questions/generate
// Both require workspace membership; candidates are looked up inside that workspace only.
router.post('/questions/generate', requireAuth, requireWorkspaceAccess, generateQuestions);
// POST /api/ai/bot/join
router.post('/bot/join', requireAuth, requireWorkspaceAccess, sendInterviewBot);

export default router;
