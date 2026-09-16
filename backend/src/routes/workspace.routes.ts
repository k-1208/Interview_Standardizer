import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import { createWorkspace } from '../controllers/workspace.controller.js';

const router = Router();

router.post('/', requireAuth, createWorkspace);

export default router;
