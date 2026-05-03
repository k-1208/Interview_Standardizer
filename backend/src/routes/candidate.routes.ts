import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import { getCandidateById } from '../controllers/candidate.controller.js';

const router = Router();

router.get('/:id', requireAuth, getCandidateById);

export default router;