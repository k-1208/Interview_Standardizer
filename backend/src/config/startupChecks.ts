/**
 * Refuses to start the process when the environment is misconfigured in a way
 * that would silently weaken security. Called first thing by server.ts and worker.ts.
 *
 * Why NODE_ENV must be an exact known value: security behaviour keys off
 * `NODE_ENV === 'production'` (e.g. the Secure flag on the auth cookie). A typo
 * such as NODE_ENV=prod or NODE_ENV=Production would quietly fall back to
 * development behaviour in a real deployment, so unknown values are fatal.
 */
const KNOWN_ENVS = new Set(['development', 'test', 'production']);

const isLocalUrl = (value: string) => {
  try {
    const { hostname } = new URL(value);
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
  } catch {
    return false;
  }
};

export const assertStartupSettings = () => {
  const rawEnv = process.env.NODE_ENV;
  const problems: string[] = [];

  if (rawEnv !== undefined && !KNOWN_ENVS.has(rawEnv)) {
    problems.push(
      `NODE_ENV="${rawEnv}" is not recognised. Use exactly one of: ${[...KNOWN_ENVS].join(', ')}.`
    );
  }

  if (rawEnv === 'production') {
    const frontendUrl = process.env.FRONTEND_URL?.trim();
    if (!frontendUrl) {
      problems.push('FRONTEND_URL must be set in production (used for CORS and links in emails).');
    } else if (!frontendUrl.startsWith('https://') && !isLocalUrl(frontendUrl)) {
      // http is only acceptable for localhost (browsers treat it as a secure context,
      // which the local Docker setup relies on).
      problems.push(`FRONTEND_URL must use https:// in production (got "${frontendUrl}").`);
    }
  }

  if (problems.length > 0) {
    throw new Error(`Refusing to start: insecure configuration.\n  - ${problems.join('\n  - ')}`);
  }
};
