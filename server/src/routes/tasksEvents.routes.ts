import { Router } from "express";
import {
  getTasksAndEvents,
  createTask,
  updateTask,
  deleteTask,
  toggleTask,
  createEvent,
  updateEvent,
  deleteEvent,
} from "../controllers/tasksEvents.controller.js";
import { authenticateToken } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(authenticateToken);

router.get("/", getTasksAndEvents);

// Tasks
router.post("/tasks", createTask);
router.put("/tasks/:id", updateTask);
router.delete("/tasks/:id", deleteTask);
router.post("/tasks/:id/toggle", toggleTask);

// Events
router.post("/events", createEvent);
router.put("/events/:id", updateEvent);
router.delete("/events/:id", deleteEvent);

export default router;
