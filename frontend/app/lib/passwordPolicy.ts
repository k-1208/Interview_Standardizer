/**
 * Password rules — mirrors backend/src/utils/passwordPolicy.ts (keep in sync).
 * The backend enforces them; this copy drives the live checklist in the UI.
 */
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

export const PASSWORD_RULES: Array<{ id: string; label: string; test: (password: string) => boolean }> = [
  { id: "length", label: `At least ${PASSWORD_MIN_LENGTH} characters`, test: (p) => p.length >= PASSWORD_MIN_LENGTH && p.length <= PASSWORD_MAX_LENGTH },
  { id: "upper", label: "One uppercase letter (A–Z)", test: (p) => /[A-Z]/.test(p) },
  { id: "lower", label: "One lowercase letter (a–z)", test: (p) => /[a-z]/.test(p) },
  { id: "number", label: "One number (0–9)", test: (p) => /[0-9]/.test(p) },
  { id: "special", label: "One special character (e.g. ! @ # $)", test: (p) => /[^A-Za-z0-9]/.test(p) },
];

export const isPasswordValid = (password: string) => PASSWORD_RULES.every((rule) => rule.test(password));

export const PASSWORD_POLICY_ERROR =
  "Password must be at least 8 characters and include an uppercase letter, a lowercase letter, a number and a special character.";
