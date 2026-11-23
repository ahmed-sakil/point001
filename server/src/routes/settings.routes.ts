import { Router } from "express";
import { authenticateToken } from "../middlewares/auth.middleware.js";
import {
  getSettings,
  updateProfile,
  updateGoogleSettings,
  syncGoogle,
} from "../controllers/settings.controller.js";

const router = Router();

router.use(authenticateToken);

router.get("/", getSettings);
router.put("/profile", updateProfile);
router.put("/google", updateGoogleSettings);
router.post("/google/sync", syncGoogle);

export default router;
