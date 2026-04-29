import {Router} from "express";
import { getProfile } from "../controllers/user.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = Router();


router.get("/profile",requireAuth, getProfile);

export default router;