import {Router} from "express";
import { getProfile, inviteMember, validateInvite, acceptInvite } from "../controllers/user.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = Router();


router.get("/profile",requireAuth, getProfile);
router.post("/invite", requireAuth, inviteMember);
router.get("/invite/:token", validateInvite);
router.post("/invite/accept", requireAuth, acceptInvite);

export default router;