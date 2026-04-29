import type { Request, Response } from "express";
import { getUser } from "../service/user.service.js";

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