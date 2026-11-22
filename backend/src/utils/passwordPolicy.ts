/**
 * Password rules (mirrored in frontend/app/lib/passwordPolicy.ts — keep in sync):
 * at least 8 characters, with an uppercase letter, a lowercase letter, a number
 * and a special character. Max 128 to bound bcrypt work.
 */
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

export const passwordProblems = (password: unknown): string[] => {
  if (typeof password !== 'string') return ['Password is required'];

  const problems: string[] = [];
  if (password.length < PASSWORD_MIN_LENGTH) problems.push(`at least ${PASSWORD_MIN_LENGTH} characters`);
  if (password.length > PASSWORD_MAX_LENGTH) problems.push(`at most ${PASSWORD_MAX_LENGTH} characters`);
  if (!/[A-Z]/.test(password)) problems.push('an uppercase letter');
  if (!/[a-z]/.test(password)) problems.push('a lowercase letter');
  if (!/[0-9]/.test(password)) problems.push('a number');
  if (!/[^A-Za-z0-9]/.test(password)) problems.push('a special character');
  return problems;
};

export const passwordPolicyMessage = (problems: string[]) =>
  `Password must contain ${problems.join(', ')}.`;
