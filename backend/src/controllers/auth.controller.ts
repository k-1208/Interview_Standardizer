import { Request } from 'express';
import type { Response } from 'express';
import { registerUser, loginUser, getMe } from '../service/auth.service.js';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
};

export async function register(req: Request, res: Response): Promise<void> {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    res.status(400).json({ success: false, message: 'name, email and password are required' });
    return;
  }

  try {
    const { user, token } = await registerUser(name, email, password);
    res.cookie('token', token, COOKIE_OPTIONS);
    res.status(201).json({ success: true, data: { user, token } });
  } catch (err: any) {
    const isClientError = err.message === 'Email already in use';
    res.status(isClientError ? 409 : 500).json({ success: false, message: err.message });
  }
}


export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ success: false, message: 'email and password are required' });
    return;
  }

  try {
    const { user, token } = await loginUser(email, password);
    res.cookie('token', token, COOKIE_OPTIONS);
    res.status(200).json({ success: true, data: { user, token } });
  } catch (err: any) {
    res.status(401).json({ success: false, message: err.message });
  }
}

export function logout(_req: Request, res: Response): void {
  res.clearCookie('token');
  res.status(200).json({ success: true, message: 'Logged out successfully' });
}

export async function me(req: Request, res: Response): Promise<void> {
  try {
    const user = await getMe(req.user!.userId);
    res.status(200).json({ success: true, data: user });
  } catch (err: any) {
    res.status(404).json({ success: false, message: err.message });
  }
}
