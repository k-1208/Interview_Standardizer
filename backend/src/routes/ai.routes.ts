import { Router } from 'express';
import { generateQuestions } from '../controllers/ai.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

// POST /api/ai/questions/generate
router.post('/questions/generate', requireAuth, generateQuestions);

export default router;
