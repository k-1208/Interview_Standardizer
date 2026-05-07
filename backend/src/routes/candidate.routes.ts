import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import { getCandidateById, listCandidates } from '../controllers/candidate.controller.js';

const router = Router();

router.get('/', requireAuth, listCandidates);
router.get('/:id', requireAuth, getCandidateById);

export default router;