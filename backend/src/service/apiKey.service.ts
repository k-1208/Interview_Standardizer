import { prisma } from '../utils/prismaClient.js';
import { HttpError } from '../utils/httpError.js';
import { decryptSecret, encryptSecret, isSecretBoxConfigured } from '../utils/secretBox.js';
import type { ApiKeyProvider } from '../../generated/prisma/enums.js';

export type { ApiKeyProvider };

type ProviderMeta = {
  label: string;
  description: string;
  envVar: string;
};

export const API_KEY_PROVIDERS: Record<ApiKeyProvider, ProviderMeta> = {
  gemini: {
    label: 'Google Gemini',
    description: 'Resume parsing, AI summaries, interview questions and transcript analysis.',
    envVar: 'GEMINI_API_KEY',
  },
  recall: {
    label: 'Recall.ai',
    description: 'Meeting bots that record interviews and capture transcripts.',
    envVar: 'RECALL_API_KEY',
  },
};

export const isApiKeyProvider = (value: unknown): value is ApiKeyProvider =>
  typeof value === 'string' && Object.prototype.hasOwnProperty.call(API_KEY_PROVIDERS, value);

const MIN_KEY_LENGTH = 16;
const MAX_KEY_LENGTH = 300;

/** "AIzaSyD...xyz9" -> "AIza••••••••xyz9". Short values reveal only the last 2 chars. */
export const maskApiKey = (value: string) => {
  if (value.length <= 12) return `••••••••${value.slice(-2)}`;
  return `${value.slice(0, 4)}••••••••${value.slice(-4)}`;
};

const normalizeKeyInput = (value: unknown) => {
  if (typeof value !== 'string') throw new HttpError(400, 'API key is required');
  const trimmed = value.trim();
  if (trimmed.length < MIN_KEY_LENGTH || trimmed.length > MAX_KEY_LENGTH) {
    throw new HttpError(400, `API key must be between ${MIN_KEY_LENGTH} and ${MAX_KEY_LENGTH} characters`);
  }
  // Printable ASCII only: keys go into HTTP headers, so no spaces/newlines/control chars
  // (a leading "Token " scheme for Recall is the one allowed space).
  if (!/^(Token )?[\x21-\x7E]+$/.test(trimmed)) {
    throw new HttpError(400, 'API key contains invalid characters');
  }
  return trimmed;
};

const requireEncryption = () => {
  if (!isSecretBoxConfigured()) {
    throw new HttpError(
      503,
      'Workspace API keys are disabled on this server (SETTINGS_ENCRYPTION_KEY is not set). Ask your server administrator to configure it.'
    );
  }
};

// ─── Admin-facing: list / set / remove (never returns the secret) ────────────

export async function listWorkspaceApiKeys(workspaceId: number) {
  const rows = await prisma.workspaceApiKey.findMany({
    where: { workspaceId },
    select: {
      provider: true,
      maskedValue: true,
      updatedAt: true,
      updatedBy: { select: { id: true, name: true } },
    },
  });
  const byProvider = new Map(rows.map((row) => [row.provider, row]));

  return {
    encryptionConfigured: isSecretBoxConfigured(),
    keys: (Object.keys(API_KEY_PROVIDERS) as ApiKeyProvider[]).map((provider) => {
      const meta = API_KEY_PROVIDERS[provider];
      const row = byProvider.get(provider);
      const hasServerDefault = Boolean(process.env[meta.envVar]?.trim());
      return {
        provider,
        label: meta.label,
        description: meta.description,
        // 'workspace' = this workspace's own key; 'server' = falls back to the server's
        // key (deliberately not shown, it isn't the workspace's secret); 'none' = missing.
        source: row ? 'workspace' : hasServerDefault ? 'server' : 'none',
        maskedValue: row?.maskedValue ?? null,
        updatedAt: row?.updatedAt ?? null,
        updatedBy: row?.updatedBy ?? null,
      };
    }),
  };
}

export async function setWorkspaceApiKey(workspaceId: number, provider: ApiKeyProvider, value: unknown, userId: number) {
  requireEncryption();
  const key = normalizeKeyInput(value);
  const data = { encryptedValue: encryptSecret(key), maskedValue: maskApiKey(key), updatedById: userId };

  await prisma.workspaceApiKey.upsert({
    where: { workspaceId_provider: { workspaceId, provider } },
    update: data,
    create: { workspaceId, provider, ...data },
  });
  invalidateCachedKey(workspaceId, provider);
  console.log('[apiKeys] key updated', { workspaceId, provider, userId });

  return { provider, maskedValue: data.maskedValue };
}

export async function removeWorkspaceApiKey(workspaceId: number, provider: ApiKeyProvider, userId: number) {
  const result = await prisma.workspaceApiKey.deleteMany({ where: { workspaceId, provider } });
  invalidateCachedKey(workspaceId, provider);
  if (result.count === 0) {
    throw new HttpError(404, 'No workspace key is set for this provider');
  }
  console.log('[apiKeys] key removed', { workspaceId, provider, userId });
  return { provider, removed: true };
}

// ─── Runtime: resolve the key to use for a workspace ────────────────────────

const CACHE_TTL_MS = 60_000; // other processes (workers) pick up changes within a minute
const cache = new Map<string, { value: string | null; expiresAt: number }>();
const cacheKey = (workspaceId: number, provider: ApiKeyProvider) => `${workspaceId}:${provider}`;
const invalidateCachedKey = (workspaceId: number, provider: ApiKeyProvider) =>
  cache.delete(cacheKey(workspaceId, provider));

const loadWorkspaceKey = async (workspaceId: number, provider: ApiKeyProvider): Promise<string | null> => {
  const id = cacheKey(workspaceId, provider);
  const hit = cache.get(id);
  if (hit && hit.expiresAt > Date.now()) return hit.value;

  const row = await prisma.workspaceApiKey.findUnique({
    where: { workspaceId_provider: { workspaceId, provider } },
    select: { encryptedValue: true },
  });

  let value: string | null = null;
  if (row && isSecretBoxConfigured()) {
    try {
      value = decryptSecret(row.encryptedValue);
    } catch (error) {
      console.error('[apiKeys] failed to decrypt workspace key; falling back to server key', {
        workspaceId,
        provider,
        error: error instanceof Error ? error.message : error,
      });
    }
  }

  cache.set(id, { value, expiresAt: Date.now() + CACHE_TTL_MS });
  return value;
};

/**
 * The workspace's own key if set, otherwise the server default from the environment.
 * Throws a clear, user-facing error if neither exists.
 */
export async function resolveApiKey(workspaceId: number, provider: ApiKeyProvider): Promise<string> {
  const workspaceKey = await loadWorkspaceKey(workspaceId, provider);
  if (workspaceKey) return workspaceKey;

  const serverKey = process.env[API_KEY_PROVIDERS[provider].envVar]?.trim();
  if (serverKey) return serverKey;

  throw new HttpError(
    400,
    `${API_KEY_PROVIDERS[provider].label} API key is not configured. An admin can add it in Settings → API keys.`
  );
}
