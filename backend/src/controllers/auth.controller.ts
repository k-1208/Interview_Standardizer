import { sendError } from '../utils/httpError.js';
import type { Request, Response } from 'express';
import { registerUser, registerUserFromInvitation, loginUser, getMe, revokeUserTokens } from '../service/auth.service.js';
import {
  AUTH_COOKIE_CLEAR_OPTIONS,
  AUTH_COOKIE_NAME,
  AUTH_COOKIE_OPTIONS,
  verifyAuthToken,
} from '../config/auth.js';

export async function register(req: Request, res: Response): Promise<void> {
  const { organizationName, email, password, inviteToken } = req.body;
  let { name } = req.body;

  if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
    res.status(400).json({ success: false, message: 'email and password are required' });
    return;
  }

  if (inviteToken) {
    if (typeof inviteToken !== 'string') {
      res.status(400).json({ success: false, message: 'inviteToken must be a string' });
      return;
    }
    if (!name) {
      name = String(email).split('@')[0];
    }
  } else if (!name || !organizationName) {
    res.status(400).json({
      success: false,
      message: 'name and organizationName are required when not registering with an invite',
    });
    return;
  }

  try {
    const { user, token } = inviteToken
      ? await registerUserFromInvitation(name, email, password, inviteToken)
      : await registerUser(name, organizationName, email, password);
    res.cookie(AUTH_COOKIE_NAME, token, AUTH_COOKIE_OPTIONS);
    res.status(201).json({ success: true, data: { user } });
  } catch (err) {
    sendError(res, err, 'auth/register', 'Registration failed. Please try again.');
  }
}


export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body || {};

  if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
    res.status(400).json({ success: false, message: 'email and password are required' });
    return;
  }

  try {
    const { user, token } = await loginUser(email, password);
    res.cookie(AUTH_COOKIE_NAME, token, AUTH_COOKIE_OPTIONS);
    res.status(200).json({ success: true, data: { user } });
  } catch (err) {
    sendError(res, err, 'auth/login', 'Login failed. Please try again.');
  }
}

export async function logout(req: Request, res: Response): Promise<void> {
  const token: unknown = req.cookies?.[AUTH_COOKIE_NAME];
  if (typeof token === 'string' && token) {
    try {
      const { userId, tv } = verifyAuthToken(token);
      await revokeUserTokens(userId, tv);
    } catch {
      // expired/invalid token: nothing to revoke, still clear the cookie
    }
  }
  res.clearCookie(AUTH_COOKIE_NAME, AUTH_COOKIE_CLEAR_OPTIONS);
  res.status(200).json({ success: true, message: 'Logged out successfully' });
}

export async function me(req: Request, res: Response): Promise<void> {
  try {
    const user = await getMe(req.user!.userId);
    res.status(200).json({ success: true, data: user });
  } catch (err) {
    sendError(res, err, 'auth/me', 'Failed to load user');
  }
}
