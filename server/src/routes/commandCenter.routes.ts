import { Router } from "express";
import {
  getCommandCenterData,
  completeTask,
  toggleHabit,
  togglePrayer,
  createNote,
  updateNote,
  deleteNote,
  addNoteElement,
  deleteNoteElement,
} from "../controllers/commandCenter.controller.js";
import { authenticateToken } from "../middlewares/auth.middleware.js";

const router = Router();

// All command-center routes require active authentication
router.use(authenticateToken);

router.get("/", getCommandCenterData);
router.post("/tasks/:id/complete", completeTask);
router.post("/habits/:id/toggle", toggleHabit);
router.post("/prayers/toggle", togglePrayer);
router.post("/notes", createNote);
router.put("/notes/:id", updateNote);
router.delete("/notes/:id", deleteNote);
router.post("/notes/:id/elements", addNoteElement);
router.delete("/notes/:id/elements/:elemId", deleteNoteElement);

export default router;
