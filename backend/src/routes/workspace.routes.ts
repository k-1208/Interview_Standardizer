import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requireWorkspaceAccess, requireWorkspaceRole } from '../middleware/tenant.middleware.js';
import {
	createWorkspace,
	getMember,
	removeMember,
	updateMemberRole,
} from '../controllers/workspace.controller.js';
import { deleteApiKey, listApiKeys, updateApiKey } from '../controllers/apiKey.controller.js';

const router = Router();

router.post('/', requireAuth, createWorkspace);

router.get(
	'/:workspaceId/members/:userId',
	requireAuth,
	requireWorkspaceAccess,
	requireWorkspaceRole(['super_admin', 'admin']),
	getMember
);

router.patch(
	'/:workspaceId/members/:userId',
	requireAuth,
	requireWorkspaceAccess,
	requireWorkspaceRole(['super_admin', 'admin']),
	updateMemberRole
);

router.delete(
	'/:workspaceId/members/:userId',
	requireAuth,
	requireWorkspaceAccess,
	requireWorkspaceRole(['super_admin', 'admin']),
	removeMember
);

// ─── Workspace API keys (admin, super_admin) ─────────────────────────────────
// The URL's workspaceId is the one checked; a body/query workspaceId is rejected
// if it disagrees, so the check and the action can't target different workspaces.
const requireUrlWorkspace: import('express').RequestHandler = (req, res, next) => {
	const urlId = Number(req.params.workspaceId);
	if (!Number.isFinite(urlId) || urlId !== req.membership?.workspaceId) {
		res.status(400).json({ success: false, message: 'workspaceId mismatch' });
		return;
	}
	next();
};
const adminOnly = [
	requireAuth,
	requireWorkspaceAccess,
	requireWorkspaceRole(['super_admin', 'admin']),
	requireUrlWorkspace,
];

router.get('/:workspaceId/api-keys', ...adminOnly, listApiKeys);
router.put('/:workspaceId/api-keys/:provider', ...adminOnly, updateApiKey);
router.delete('/:workspaceId/api-keys/:provider', ...adminOnly, deleteApiKey);

export default router;
