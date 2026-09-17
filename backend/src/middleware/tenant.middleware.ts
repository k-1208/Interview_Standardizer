import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prismaClient.js';

export type WorkspaceRole = 'super_admin' | 'admin' | 'reviewer';

export interface WorkspaceMembershipInfo {
  userId: number;
  workspaceId: number;
  role: WorkspaceRole;
}

declare global {
  namespace Express {
    interface Request {
      membership?: WorkspaceMembershipInfo;
    }
  }
}

/**
 * Ensures the authenticated user is a member of the requested workspace.
 * Resolves workspaceId from req.body, req.query, req.params, or X-Workspace-Id header.
 */
export async function requireWorkspaceAccess(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.user?.userId) {
    res.status(401).json({ success: false, message: 'Unauthorized — user not authenticated' });
    return;
  }

  const rawWorkspaceId =
    req.body?.workspaceId ||
    req.query?.workspaceId ||
    req.params?.workspaceId ||
    req.headers['x-workspace-id'];

  const workspaceId = Number(rawWorkspaceId);

  if (!Number.isFinite(workspaceId) || workspaceId <= 0) {
    res.status(400).json({ success: false, message: 'Valid workspaceId is required' });
    return;
  }

  try {
    const membership = await prisma.workspaceMember.findFirst({
      where: {
        userId: req.user.userId,
        workspaceId,
      },
      select: {
        userId: true,
        workspaceId: true,
        role: true,
      },
    });

    if (!membership) {
      res.status(403).json({
        success: false,
        message: `Forbidden — user ${req.user.userId} does not have access to workspace ${workspaceId}`,
      });
      return;
    }

    req.membership = {
      userId: membership.userId,
      workspaceId: membership.workspaceId,
      role: membership.role as WorkspaceRole,
    };

    next();
  } catch (error: any) {
    console.error('[tenantMiddleware] Failed to check workspace membership:', error);
    res.status(500).json({ success: false, message: 'Internal server error validating tenant access' });
  }
}

/**
 * Enforces that the user has one of the required roles within the workspace.
 * Must be placed AFTER requireWorkspaceAccess in the route chain.
 */
export function requireWorkspaceRole(allowedRoles: WorkspaceRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.membership) {
      res.status(500).json({
        success: false,
        message: 'Internal configuration error — requireWorkspaceAccess must precede requireWorkspaceRole',
      });
      return;
    }

    if (!allowedRoles.includes(req.membership.role)) {
      res.status(403).json({
        success: false,
        message: `Forbidden — action requires one of the following roles: [${allowedRoles.join(', ')}]. Current role: ${req.membership.role}`,
      });
      return;
    }

    next();
  };
}
