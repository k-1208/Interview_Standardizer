import { sendError } from '../utils/httpError.js';
import type { Request, Response } from 'express';
import {
	createWorkspaceForUser,
	getWorkspaceMember,
	removeWorkspaceMember,
	updateWorkspaceMemberRole,
} from '../service/workspace.service.js';

const parseId = (value: unknown) => {
	const parsed = Number(Array.isArray(value) ? value[0] : value);
	return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

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
	} catch (err) {
		sendError(res, err, 'workspace/createWorkspace', 'Failed to create workspace');
	}
}

export async function getMember(req: Request, res: Response): Promise<void> {
	if (!req.user?.userId) {
		res.status(401).json({ success: false, message: 'Unauthorized' });
		return;
	}

	const workspaceId = parseId(req.params.workspaceId);
	const targetUserId = parseId(req.params.userId);

	if (!workspaceId || !targetUserId) {
		res.status(400).json({ success: false, message: 'Valid workspaceId and userId are required' });
		return;
	}

	try {
		const member = await getWorkspaceMember({
			actorUserId: req.user.userId,
			workspaceId,
			targetUserId,
		});
		res.status(200).json({ success: true, data: member });
	} catch (err) {
		sendError(res, err, 'workspace/getMember', 'Failed to load member');
	}
}

export async function updateMemberRole(req: Request, res: Response): Promise<void> {
	if (!req.user?.userId) {
		res.status(401).json({ success: false, message: 'Unauthorized' });
		return;
	}

	const workspaceId = parseId(req.params.workspaceId);
	const targetUserId = parseId(req.params.userId);
	const role = typeof req.body?.role === 'string' ? req.body.role : '';

	if (!workspaceId || !targetUserId) {
		res.status(400).json({ success: false, message: 'Valid workspaceId and userId are required' });
		return;
	}

	try {
		const member = await updateWorkspaceMemberRole({
			actorUserId: req.user.userId,
			workspaceId,
			targetUserId,
			role,
		});
		res.status(200).json({ success: true, data: member });
	} catch (err) {
		sendError(res, err, 'workspace/updateMemberRole', 'Failed to update member role');
	}
}

export async function removeMember(req: Request, res: Response): Promise<void> {
	if (!req.user?.userId) {
		res.status(401).json({ success: false, message: 'Unauthorized' });
		return;
	}

	const workspaceId = parseId(req.params.workspaceId);
	const targetUserId = parseId(req.params.userId);

	if (!workspaceId || !targetUserId) {
		res.status(400).json({ success: false, message: 'Valid workspaceId and userId are required' });
		return;
	}

	try {
		const result = await removeWorkspaceMember({
			actorUserId: req.user.userId,
			workspaceId,
			targetUserId,
		});
		res.status(200).json({ success: true, data: result });
	} catch (err) {
		sendError(res, err, 'workspace/removeMember', 'Failed to remove member');
	}
}
