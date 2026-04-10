import type { Request, Response } from 'express';
import { processUploadedPdf } from '../service/upload.service.js';

export const uploadPdf = async (req: Request, res: Response): Promise<void> => {
  if (!req.user?.userId) {
    res.status(401).json({ success: false, message: 'Unauthorized' });
    return;
  }

  const candidateId = String(req.body?.candidateId || '').trim();
  if (!candidateId) {
    res.status(400).json({ success: false, message: 'candidateId is required' });
    return;
  }

  if (!req.file) {
    res.status(400).json({ success: false, message: 'PDF file is required' });
    return;
  }

  try {
    const result = await processUploadedPdf(req.file, candidateId);
    res.status(201).json({ success: true, data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err?.message || 'Failed to process uploaded file' });
  }
};
