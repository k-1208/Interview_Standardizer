import type { Request, Response } from 'express';
import { sendError } from '../utils/httpError.js';
import {
  isApiKeyProvider,
  listWorkspaceApiKeys,
  removeWorkspaceApiKey,
  setWorkspaceApiKey,
} from '../service/apiKey.service.js';

// Routes are guarded by requireAuth + requireWorkspaceAccess + requireWorkspaceRole(admin),
// so req.membership is the caller's verified admin/super_admin membership.

export async function listApiKeys(req: Request, res: Response): Promise<void> {
  try {
    const data = await listWorkspaceApiKeys(req.membership!.workspaceId);
    res.status(200).json({ success: true, data });
  } catch (error) {
    sendError(res, error, 'apiKeys/list', 'Failed to load API keys');
  }
}

export async function updateApiKey(req: Request, res: Response): Promise<void> {
  const { provider } = req.params;
  if (!isApiKeyProvider(provider)) {
    res.status(404).json({ success: false, message: 'Unknown API key provider' });
    return;
  }

  try {
    const data = await setWorkspaceApiKey(req.membership!.workspaceId, provider, req.body?.value, req.user!.userId);
    res.status(200).json({ success: true, data });
  } catch (error) {
    sendError(res, error, 'apiKeys/update', 'Failed to save API key');
  }
}

export async function deleteApiKey(req: Request, res: Response): Promise<void> {
  const { provider } = req.params;
  if (!isApiKeyProvider(provider)) {
    res.status(404).json({ success: false, message: 'Unknown API key provider' });
    return;
  }

  try {
    const data = await removeWorkspaceApiKey(req.membership!.workspaceId, provider, req.user!.userId);
    res.status(200).json({ success: true, data });
  } catch (error) {
    sendError(res, error, 'apiKeys/delete', 'Failed to remove API key');
  }
}
