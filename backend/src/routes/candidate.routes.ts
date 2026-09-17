import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requireWorkspaceAccess, requireWorkspaceRole } from '../middleware/tenant.middleware.js';
import {
  getCandidateById,
  getCandidateTranscript,
  listCandidates,
  assignReviewer,
} from '../controllers/candidate.controller.js';

const router = Router();

router.get('/', requireAuth, requireWorkspaceAccess, listCandidates);
router.get('/:id/transcript-analysis', requireAuth, requireWorkspaceAccess, getCandidateTranscript);
router.get('/:id', requireAuth, requireWorkspaceAccess, getCandidateById);
router.post('/:id/assign', requireAuth, requireWorkspaceAccess, requireWorkspaceRole(['super_admin', 'admin']), assignReviewer);

export default router;