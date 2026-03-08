import { Router } from 'express';
import { register, login, logout, me } from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

// POST /api/auth/register — create a new account
router.post('/register', register);

// POST /api/auth/login — login and receive JWT cookie
router.post('/login', login);

// POST /api/auth/logout — clear the JWT cookie
router.post('/logout', logout);

// GET /api/auth/me — get the currently logged-in user (protected)
router.get('/me', requireAuth, me);

export default router;
