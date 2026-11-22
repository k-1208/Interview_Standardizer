import type { Request, Response, NextFunction } from 'express';
import { AUTH_COOKIE_NAME, verifyAuthToken, type JwtPayload } from '../config/auth.js';
import { prisma } from '../utils/prismaClient.js';

// Extend Express Request to carry the decoded user
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

/**
 * Authenticates via the httpOnly auth cookie only (the token is never exposed to
 * page scripts). The token's version must match users.tokenVersion, so logging out
 * revokes every token issued before it.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const token: unknown = req.cookies?.[AUTH_COOKIE_NAME];

  if (typeof token !== 'string' || !token) {
    res.status(401).json({ success: false, message: 'Unauthorized — no token provided' });
    return;
  }

  let decoded: JwtPayload;
  try {
    decoded = verifyAuthToken(token);
  } catch {
    res.status(401).json({ success: false, message: 'Unauthorized — invalid or expired token' });
    return;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { tokenVersion: true },
    });

    if (!user || user.tokenVersion !== decoded.tv) {
      res.status(401).json({ success: false, message: 'Unauthorized — session has ended' });
      return;
    }
  } catch (error) {
    console.error('[requireAuth] Failed to verify session:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
    return;
  }

  req.user = decoded;
  next();
}
