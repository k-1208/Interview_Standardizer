import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

/**
 * AES-256-GCM encryption for secrets stored in the database (workspace API keys).
 * Key: SETTINGS_ENCRYPTION_KEY — 32 bytes as 64 hex chars (openssl rand -hex 32)
 * or base64. Ciphertext format: v1.<iv>.<authTag>.<ciphertext> (base64url parts).
 */
const VERSION = 'v1';
const IV_BYTES = 12;

const loadKey = (): Buffer | null => {
  const raw = process.env.SETTINGS_ENCRYPTION_KEY?.trim();
  if (!raw) return null;
  const key = /^[0-9a-fA-F]{64}$/.test(raw) ? Buffer.from(raw, 'hex') : Buffer.from(raw, 'base64');
  if (key.length !== 32) {
    throw new Error('SETTINGS_ENCRYPTION_KEY must be 32 bytes (generate with: openssl rand -hex 32)');
  }
  return key;
};

const KEY = loadKey();

export const isSecretBoxConfigured = () => KEY !== null;

const requireKey = () => {
  if (!KEY) throw new Error('SETTINGS_ENCRYPTION_KEY is not configured');
  return KEY;
};

export const encryptSecret = (plaintext: string): string => {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv('aes-256-gcm', requireKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv.toString('base64url'), tag.toString('base64url'), ciphertext.toString('base64url')].join('.');
};

export const decryptSecret = (payload: string): string => {
  const [version, iv, tag, ciphertext] = payload.split('.');
  if (version !== VERSION || !iv || !tag || ciphertext === undefined) {
    throw new Error('Unrecognised encrypted secret format');
  }
  const decipher = createDecipheriv('aes-256-gcm', requireKey(), Buffer.from(iv, 'base64url'));
  decipher.setAuthTag(Buffer.from(tag, 'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(ciphertext, 'base64url')), decipher.final()]).toString('utf8');
};
