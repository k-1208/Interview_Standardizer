import type { CookieOptions } from 'express';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

// ─── JWT secret: must be set, long and not a placeholder ─────────────────────
const KNOWN_PLACEHOLDERS = new Set([
  'changeme_use_strong_secret_in_env',
  'change-me-to-a-long-random-string',
  '<long_random_secret>',
  '<long random string>',
]);
const MIN_SECRET_LENGTH = 32;

const resolveJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET?.trim();
  if (!secret) {
    throw new Error('JWT_SECRET is not set. Generate one with: openssl rand -hex 32');
  }
  if (KNOWN_PLACEHOLDERS.has(secret)) {
    throw new Error('JWT_SECRET is still a placeholder value. Generate one with: openssl rand -hex 32');
  }
  if (secret.length < MIN_SECRET_LENGTH) {
    throw new Error(`JWT_SECRET must be at least ${MIN_SECRET_LENGTH} characters. Generate one with: openssl rand -hex 32`);
  }
  return secret;
};

const JWT_SECRET = resolveJwtSecret();
const JWT_EXPIRES_IN = '7d';
const JWT_ALGORITHM = 'HS256' as const;

export interface JwtPayload {
  userId: number;
  email: string;
  /** users.tokenVersion at sign-in; bumping it (logout) revokes every older token. */
  tv: number;
}

export const signAuthToken = (payload: JwtPayload) =>
  jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN, algorithm: JWT_ALGORITHM });

export const verifyAuthToken = (token: string): JwtPayload => {
  const decoded = jwt.verify(token, JWT_SECRET, { algorithms: [JWT_ALGORITHM] });
  if (
    !decoded ||
    typeof decoded !== 'object' ||
    typeof decoded.userId !== 'number' ||
    typeof decoded.tv !== 'number'
  ) {
    throw new Error('Malformed token');
  }
  return decoded as unknown as JwtPayload;
};

// ─── Auth cookie ─────────────────────────────────────────────────────────────
// Same-site deployments (e.g. app.example.com + api.example.com, or Docker on
// localhost) work with the default `lax`. If the frontend and API are on different
// sites, set COOKIE_SAME_SITE=none (requires HTTPS; forces Secure).
export const AUTH_COOKIE_NAME = 'token';

const sameSiteFromEnv = (): 'lax' | 'strict' | 'none' => {
  const value = (process.env.COOKIE_SAME_SITE || 'lax').toLowerCase();
  return value === 'strict' || value === 'none' ? value : 'lax';
};

const sameSite = sameSiteFromEnv();

const baseCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: sameSite === 'none' || process.env.NODE_ENV === 'production',
  sameSite,
  path: '/',
  ...(process.env.COOKIE_DOMAIN ? { domain: process.env.COOKIE_DOMAIN } : {}),
};

export const AUTH_COOKIE_OPTIONS: CookieOptions = {
  ...baseCookieOptions,
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

/** clearCookie must use the same attributes the cookie was set with. */
export const AUTH_COOKIE_CLEAR_OPTIONS: CookieOptions = baseCookieOptions;
