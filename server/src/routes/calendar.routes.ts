import { Router } from "express";
import { authenticateToken } from "../middlewares/auth.middleware.js";
import { getMonthCalendar, toggleDayLock } from "../controllers/calendar.controller.js";

const router = Router();

router.use(authenticateToken);

// Calendar endpoints
router.get("/month", getMonthCalendar);
router.post("/lock-day", toggleDayLock);

export default router;
