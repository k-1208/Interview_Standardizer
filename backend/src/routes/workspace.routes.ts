import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requireWorkspaceAccess, requireWorkspaceRole } from '../middleware/tenant.middleware.js';
import {
	createWorkspace,
	getMember,
	removeMember,
	updateMemberRole,
} from '../controllers/workspace.controller.js';

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

export default router;
