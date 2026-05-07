import type { Request, Response } from "express";
import { getUser } from "../service/user.service.js";
import { inviteWorkspaceMember, validateInvitationToken, acceptInvitation } from "../service/invite.service.js";

export const getProfile = async (req: Request, res: Response): Promise<void> => {
  if (!req.user?.userId) {
    res.status(401).json({ success: false, message: "Unauthorized" });
    return;
  }

  try {
    const data = await getUser(req.user.userId);
    res.status(200).json({ success: true, data });
  } catch (error: any) {
    const message = error?.message || "Failed to load user profile";
    const statusCode = message === "User not found" ? 404 : 500;
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

  try {
    const invitation = await inviteWorkspaceMember({
      email,
      role: role || "reviewer",
      workspaceId: Number(workspaceId),
      invitedById: req.user.userId,
    });

    res.status(201).json({ success: true, data: invitation });
  } catch (error: any) {
    const message = error?.message || "Failed to send invitation";
    res.status(500).json({ success: false, message });
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