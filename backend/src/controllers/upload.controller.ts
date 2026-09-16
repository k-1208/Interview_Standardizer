import type { Request, Response } from 'express';
import { processUploadedPdf } from '../service/upload.service.js';
import { requireWorkspaceMembership } from '../service/workspace.service.js';

export const uploadPdf = async (req: Request, res: Response): Promise<void> => {
  if (!req.user?.userId) {
    res.status(401).json({ success: false, message: 'Unauthorized' });
    return;
  }

  if (!req.file) {
    res.status(400).json({ success: false, message: 'PDF file is required' });
    return;
  }

  const workspaceId = Number(req.query.workspaceId ?? req.body?.workspaceId);

  if (!Number.isFinite(workspaceId) || workspaceId <= 0) {
    res.status(400).json({ success: false, message: 'Valid workspaceId is required' });
    return;
  }

  try {
    await requireWorkspaceMembership(req.user.userId, workspaceId);
    const result = await processUploadedPdf([req.file], workspaceId);
    res.status(201).json({ success: true, data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err?.message || 'Failed to process uploaded file' });
  }
};
