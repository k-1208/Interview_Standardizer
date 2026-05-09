import { Router } from 'express';
import { recallWebhook } from '../controllers/webhook.controller.js';

const router = Router();

// POST /api/webhooks/recall
router.post('/recall', recallWebhook);

export default router;
