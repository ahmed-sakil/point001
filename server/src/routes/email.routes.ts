import { Router } from "express";
import { authenticateToken } from "../middlewares/auth.middleware.js";
import {
  getEmailAccounts,
  connectEmailAccount,
  disconnectEmailAccount,
  syncEmailAccountHandler,
  getEmailMessages,
  markEmailAsRead,
  toggleEmailStar,
} from "../controllers/email.controller.js";

const router = Router();

// All email routes require an authenticated user session
router.use(authenticateToken);

// Accounts
router.get("/accounts", getEmailAccounts);
router.post("/accounts", connectEmailAccount);
router.delete("/accounts/:id", disconnectEmailAccount);
router.post("/accounts/:id/sync", syncEmailAccountHandler);

// Messages
router.get("/messages", getEmailMessages);
router.patch("/messages/:id/read", markEmailAsRead);
router.patch("/messages/:id/star", toggleEmailStar);

export default router;
