import { sendError } from '../utils/httpError.js';
import type { Request, Response } from "express";
import { getUser } from "../service/user.service.js";
import { inviteWorkspaceMember, validateInvitationToken, acceptInvitation } from "../service/invite.service.js";
import { prisma } from "../utils/prismaClient.js";

export const getProfile = async (req: Request, res: Response): Promise<void> => {
  if (!req.user?.userId) {
    res.status(401).json({ success: false, message: "Unauthorized" });
    return;
  }

  let workspaceId = Number(req.query.workspaceId);

  try {
    // Fall back to the user's first workspace when the client omits/sends an invalid workspaceId
    // (e.g. race before WorkspaceContext hydrates, or stale localStorage).
    if (!Number.isFinite(workspaceId) || workspaceId <= 0) {
      const membership = await prisma.workspaceMember.findFirst({
        where: { userId: req.user.userId },
        orderBy: { joinedAt: "asc" },
        select: { workspaceId: true },
      });

      if (!membership) {
        res.status(400).json({
          success: false,
          message: "Valid workspaceId is required — user has no workspace memberships",
        });
        return;
      }

      workspaceId = membership.workspaceId;
    }

    const data = await getUser(req.user.userId, workspaceId);
    res.status(200).json({ success: true, data });
  } catch (error) {
    sendError(res, error, 'user/getProfile', 'Failed to load user profile');
  }
};

export const inviteMember = async (req: Request, res: Response): Promise<void> => {
  if (!req.user?.userId) {
    res.status(401).json({ success: false, message: "Unauthorized" });
    return;
  }

  const { email, role, workspaceId } = req.body || {};

  if (!email || !workspaceId) {
    res.status(400).json({ success: false, message: "email and workspaceId are required" });
    return;
  }

  try {
    const invitation = await inviteWorkspaceMember({
      email,
      role: role || "reviewer",
      workspaceId: Number(workspaceId),
      invitedById: req.user.userId,
    });

    res.status(201).json({ success: true, data: invitation });
  } catch (error) {
    sendError(res, error, 'user/inviteMember', 'Failed to send invitation');
  }
};

export const validateInvite = async (req: Request, res: Response): Promise<void> => {
  const { token } = req.params as { token?: string | string[] };
  const tokenValue = Array.isArray(token) ? token[0] : token;

  if (!tokenValue) {
    res.status(400).json({ success: false, message: "token is required" });
    return;
  }

  try {
    const data = await validateInvitationToken(tokenValue);
    res.status(200).json({ success: true, data });
  } catch (error) {
    sendError(res, error, 'user/validateInvite', 'Invalid invitation');
  }
};

export const acceptInvite = async (req: Request, res: Response): Promise<void> => {
  if (!req.user?.userId) {
    res.status(401).json({ success: false, message: "Unauthorized" });
    return;
  }

  const { token } = req.body || {};

  if (!token || typeof token !== "string") {
    res.status(400).json({ success: false, message: "token is required" });
    return;
  }

  try {
    const data = await acceptInvitation(token, req.user.userId);
    res.status(200).json({ success: true, data });
  } catch (error) {
    sendError(res, error, 'user/acceptInvite', 'Failed to accept invitation');
  }
};