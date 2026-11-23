import { Router } from "express";
import { authenticateToken } from "../middlewares/auth.middleware.js";
import {
  getHabitsData,
  toggleHabitDay,
  togglePrayerDay,
  createHabit,
  updateHabit,
  deleteHabit,
  finishChallenge,
  getHabitsHistory,
  syncPrayerTimes,
} from "../controllers/habits.controller.js";

const router = Router();

router.use(authenticateToken);

router.get("/", getHabitsData);
router.get("/history", getHabitsHistory);
router.post("/sync-prayers", syncPrayerTimes);
router.post("/prayer/toggle", togglePrayerDay);
router.post("/", createHabit);
router.put("/:id", updateHabit);
router.delete("/:id", deleteHabit);
router.post("/:id/toggle", toggleHabitDay);
router.post("/:id/finish", finishChallenge);

export default router;
