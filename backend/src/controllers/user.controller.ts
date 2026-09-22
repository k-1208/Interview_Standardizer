import type { Request, Response } from "express";
import { getUser } from "../service/user.service.js";
import { inviteWorkspaceMember, validateInvitationToken, acceptInvitation } from "../service/invite.service.js";
import { prisma } from "../utils/prismaClient.js";
import { isInviteRole, memberErrorStatus } from "../service/workspace.service.js";

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
  } catch (error: any) {
    const message = error?.message || "Failed to load user profile";
    const statusCode =
      message === "User not found"
        ? 404
        : message === "User does not have access to this workspace"
          ? 403
          : 500;
    res.status(statusCode).json({ success: false, message });
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

  const inviteRole = typeof role === "string" && role.trim() ? role.trim() : "reviewer";
  if (!isInviteRole(inviteRole)) {
    res.status(400).json({ success: false, message: "Role must be admin or reviewer" });
    return;
  }

  try {
    const invitation = await inviteWorkspaceMember({
      email,
      role: inviteRole,
      workspaceId: Number(workspaceId),
      invitedById: req.user.userId,
    });

    res.status(201).json({ success: true, data: invitation });
  } catch (error: any) {
    const message = error?.message || "Failed to send invitation";
    res.status(memberErrorStatus(message)).json({ success: false, message });
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
  } catch (error: any) {
    const message = error?.message || "Invalid invitation";
    res.status(400).json({ success: false, message });
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
  } catch (error: any) {
    const message = error?.message || "Failed to accept invitation";
    res.status(400).json({ success: false, message });
  }
};