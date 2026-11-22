import type { Request, Response, NextFunction } from 'express';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
// Server-to-server callers that don't use the auth cookie.
const EXEMPT_PREFIXES = ['/api/webhooks/'];

/**
 * CSRF guard for cookie-based auth. Browsers only let a page add a custom header
 * like X-Requested-With after a CORS preflight, and CORS only allows our own
 * frontend origins — so a forged cross-site form/fetch can't satisfy this check.
 */
export function requireCsrfHeader(req: Request, res: Response, next: NextFunction): void {
  if (SAFE_METHODS.has(req.method) || EXEMPT_PREFIXES.some((prefix) => req.path.startsWith(prefix))) {
    next();
    return;
  }

  if (req.get('X-Requested-With') !== 'XMLHttpRequest') {
    res.status(403).json({ success: false, message: 'Missing CSRF header' });
    return;
  }

  next();
}
