import type { Request, Response } from 'express';
import { handleRecallWebhook } from '../service/webhook.service.js';

export const recallWebhook = async (req: Request, res: Response): Promise<void> => {
	if (!req.body || typeof req.body !== 'object') {
		res.status(400).json({ success: false, message: 'Invalid webhook payload' });
		return;
	}

	try {
		const result = await handleRecallWebhook(req.body);
		res.status(200).json({ success: true, data: result });
	} catch (error: any) {
		res.status(500).json({
			success: false,
			message: error?.message || 'Failed to process webhook',
		});
	}
};
