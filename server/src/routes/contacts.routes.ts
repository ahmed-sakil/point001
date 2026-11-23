import { Router } from "express";
import { authenticateToken } from "../middlewares/auth.middleware.js";
import {
  getContacts,
  getContactById,
  createContact,
  updateContact,
  deleteContact,
  toggleStarContact,
  syncGoogleContacts,
  importContacts,
} from "../controllers/contacts.controller.js";

const router = Router();

router.use(authenticateToken);

router.get("/", getContacts);
router.get("/:id", getContactById);
router.post("/", createContact);
router.post("/import", importContacts);
router.put("/:id", updateContact);
router.delete("/:id", deleteContact);
router.post("/:id/star", toggleStarContact);
router.post("/sync", syncGoogleContacts);

export default router;
