import type { Request, Response } from 'express';
import { createWorkspaceForUser } from '../service/workspace.service.js';

export async function createWorkspace(req: Request, res: Response): Promise<void> {
	if (!req.user?.userId) {
		res.status(401).json({ success: false, message: 'Unauthorized' });
		return;
	}

	const { name } = req.body || {};

	if (!name || typeof name !== 'string' || !name.trim()) {
		res.status(400).json({ success: false, message: 'name is required' });
		return;
	}

	try {
		const workspace = await createWorkspaceForUser(req.user.userId, name);
		res.status(201).json({ success: true, data: workspace });
	} catch (err: any) {
		res.status(400).json({ success: false, message: err?.message || 'Failed to create workspace' });
	}
}
