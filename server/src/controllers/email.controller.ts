import { Response } from "express";
import { AuthenticatedRequest } from "../middlewares/auth.middleware.js";
import { prisma } from "../lib/prisma.js";
import { encryptCredential } from "../lib/crypto.js";
import {
  testImapConnection,
  syncEmailAccount,
  updateRemoteMessageRead,
  updateRemoteMessageStarred,
} from "../services/emailSync.service.js";

/**
 * Get all connected email accounts for current user
 */
export const getEmailAccounts = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const accounts = await prisma.emailAccount.findMany({
      where: { userId },
      select: {
        id: true,
        email: true,
        label: true,
        color: true,
        provider: true,
        authType: true,
        isActive: true,
        lastSyncedAt: true,
        syncStatus: true,
        errorMessage: true,
        createdAt: true,
        _count: {
          select: { messages: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    res.json(accounts);
  } catch (error) {
    console.error("[getEmailAccounts] Error:", error);
    res.status(500).json({ error: "Failed to load email accounts" });
  }
};

/**
 * Connect a new email account via 16-digit App Password
 */
export const connectEmailAccount = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const { email, appPassword, label, color } = req.body;

    if (!email || typeof email !== "string" || !email.includes("@")) {
      res.status(400).json({ error: "Please provide a valid email address" });
      return;
    }

    if (!appPassword || typeof appPassword !== "string") {
      res.status(400).json({ error: "Please provide the 16-digit Google App Password" });
      return;
    }

    const cleanPass = appPassword.replace(/\s+/g, "");
    if (cleanPass.length < 16) {
      res.status(400).json({
        error: "App Password must be at least 16 characters. Generate one at myaccount.google.com/apppasswords",
      });
      return;
    }

    // 1. Verify IMAP handshake with Gmail
    const testResult = await testImapConnection(email.trim(), cleanPass);
    if (!testResult.success) {
      res.status(400).json({
        error: `Could not connect to Gmail: ${testResult.error || "Authentication failed. Check your email and 16-digit app password."}`,
      });
      return;
    }

    // 2. Encrypt credentials at rest
    const encrypted = encryptCredential(cleanPass);
    const accountLabel = label && String(label).trim() ? String(label).trim() : email.split("@")[0];
    const badgeColor = color || "#3b82f6";

    // 3. Upsert account in DB
    const existing = await prisma.emailAccount.findFirst({
      where: { userId, email: email.trim().toLowerCase() },
    });

    let account;
    if (existing) {
      account = await prisma.emailAccount.update({
        where: { id: existing.id },
        data: {
          label: accountLabel,
          credentials: encrypted,
          color: badgeColor,
          isActive: true,
          errorMessage: null,
          syncStatus: "IDLE",
        },
      });
    } else {
      account = await prisma.emailAccount.create({
        data: {
          userId,
          email: email.trim().toLowerCase(),
          label: accountLabel,
          color: badgeColor,
          provider: "GMAIL",
          authType: "APP_PASSWORD",
          credentials: encrypted,
          isActive: true,
          syncStatus: "IDLE",
        },
      });
    }

    // 4. Trigger initial background sync
    syncEmailAccount(account.id).catch((err) => {
      console.error(`[connectEmailAccount] Initial sync failed for ${account.id}:`, err);
    });

    res.status(201).json({
      message: "Email account connected successfully. Sync in progress.",
      account: {
        id: account.id,
        email: account.email,
        label: account.label,
        color: account.color,
        syncStatus: "SYNCING",
      },
    });
  } catch (error: any) {
    console.error("[connectEmailAccount] Error:", error);
    res.status(500).json({ error: error?.message || "Failed to connect email account" });
  }
};

/**
 * Disconnect/delete an email account
 */
export const disconnectEmailAccount = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const account = await prisma.emailAccount.findFirst({
      where: { id, userId },
    });

    if (!account) {
      res.status(404).json({ error: "Account not found" });
      return;
    }

    await prisma.emailAccount.delete({
      where: { id },
    });

    res.json({ message: "Email account disconnected successfully" });
  } catch (error) {
    console.error("[disconnectEmailAccount] Error:", error);
    res.status(500).json({ error: "Failed to disconnect email account" });
  }
};

/**
 * Trigger manual sync for an account or all user accounts
 */
export const syncEmailAccountHandler = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    if (id === "all") {
      const accounts = await prisma.emailAccount.findMany({
        where: { userId, isActive: true },
      });

      let totalSynced = 0;
      for (const acc of accounts) {
        try {
          const res = await syncEmailAccount(acc.id);
          totalSynced += res.syncedCount;
        } catch (e) {
          console.error(`[syncAll] Failed syncing account ${acc.id}:`, e);
        }
      }
      res.json({ message: "Sync complete for all accounts", syncedCount: totalSynced });
      return;
    }

    const account = await prisma.emailAccount.findFirst({
      where: { id, userId },
    });

    if (!account) {
      res.status(404).json({ error: "Account not found" });
      return;
    }

    const syncResult = await syncEmailAccount(account.id);
    res.json({ message: "Sync completed", syncedCount: syncResult.syncedCount });
  } catch (error: any) {
    console.error("[syncEmailAccountHandler] Error:", error);
    res.status(500).json({ error: error?.message || "Sync failed" });
  }
};

/**
 * Get emails with pagination, search, and category counts
 */
export const getEmailMessages = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const {
      accountId,
      search,
      isUnread,
      isStarred,
      limit = "50",
      offset = "0",
    } = req.query;

    // Accounts owned by this user
    const userAccounts = await prisma.emailAccount.findMany({
      where: { userId },
      select: { id: true },
    });

    const userAccountIds = userAccounts.map((a) => a.id);
    if (userAccountIds.length === 0) {
      res.json({
        messages: [],
        counts: { total: 0, unread: 0, today: 0, yesterday: 0 },
        hasMore: false,
      });
      return;
    }

    const whereClause: any = {
      accountId: { in: userAccountIds },
    };

    if (accountId && typeof accountId === "string" && accountId !== "all") {
      if (userAccountIds.includes(accountId)) {
        whereClause.accountId = accountId;
      }
    }

    if (isUnread === "true") {
      whereClause.isUnread = true;
    } else if (isUnread === "false") {
      whereClause.isUnread = false;
    }

    if (isStarred === "true") {
      whereClause.isStarred = true;
    }

    if (search && typeof search === "string" && search.trim()) {
      const q = search.trim();
      whereClause.OR = [
        { subject: { contains: q, mode: "insensitive" } },
        { senderName: { contains: q, mode: "insensitive" } },
        { senderEmail: { contains: q, mode: "insensitive" } },
        { snippet: { contains: q, mode: "insensitive" } },
      ];
    }

    const take = Math.min(Math.max(parseInt(String(limit), 10) || 50, 1), 100);
    const skip = Math.max(parseInt(String(offset), 10) || 0, 0);

    const [messages, totalCount] = await Promise.all([
      prisma.emailMessage.findMany({
        where: whereClause,
        orderBy: { date: "desc" },
        take,
        skip,
        include: {
          account: {
            select: {
              id: true,
              email: true,
              label: true,
              color: true,
            },
          },
        },
      }),
      prisma.emailMessage.count({ where: whereClause }),
    ]);

    // Compute Date Boundaries for Today and Yesterday
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfYesterday = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000);

    const [unreadCount, todayCount, yesterdayCount] = await Promise.all([
      prisma.emailMessage.count({
        where: {
          accountId: { in: userAccountIds },
          isUnread: true,
        },
      }),
      prisma.emailMessage.count({
        where: {
          accountId: { in: userAccountIds },
          date: { gte: startOfToday },
        },
      }),
      prisma.emailMessage.count({
        where: {
          accountId: { in: userAccountIds },
          date: { gte: startOfYesterday, lt: startOfToday },
        },
      }),
    ]);

    // Resolve any missing avatars
    const enrichedMessages = await Promise.all(
      messages.map(async (msg) => {
        if (msg.senderAvatarUrl) return msg;

        const contact = await prisma.contact.findFirst({
          where: {
            userId,
            email: { equals: msg.senderEmail, mode: "insensitive" },
          },
          select: { avatarUrl: true },
        });

        if (contact?.avatarUrl) {
          return { ...msg, senderAvatarUrl: contact.avatarUrl };
        }

        if (msg.senderEmail.includes("@")) {
          const domain = msg.senderEmail.split("@")[1]?.toLowerCase();
          if (domain && !["gmail.com", "yahoo.com", "hotmail.com", "outlook.com"].includes(domain)) {
            return {
              ...msg,
              senderAvatarUrl: `https://www.google.com/s2/favicons?domain=${domain}&sz=128`,
            };
          }
        }

        return msg;
      })
    );

    res.json({
      messages: enrichedMessages,
      counts: {
        total: totalCount,
        unread: unreadCount,
        today: todayCount,
        yesterday: yesterdayCount,
      },
      hasMore: skip + messages.length < totalCount,
    });
  } catch (error) {
    console.error("[getEmailMessages] Error:", error);
    res.status(500).json({ error: "Failed to load emails" });
  }
};

/**
 * Mark email message as read or unread
 */
export const markEmailAsRead = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    const { id } = req.params;
    const { isUnread = false } = req.body;

    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const message = await prisma.emailMessage.findUnique({
      where: { id },
      include: { account: true },
    });

    if (!message || message.account.userId !== userId) {
      res.status(404).json({ error: "Message not found" });
      return;
    }

    const updated = await prisma.emailMessage.update({
      where: { id },
      data: { isUnread: Boolean(isUnread) },
    });

    // Sync flag to Gmail IMAP in background
    updateRemoteMessageRead(message.accountId, message.messageId, Boolean(isUnread)).catch((err) => {
      console.warn(`[markEmailAsRead] Remote sync error:`, err);
    });

    res.json({ message: "Updated", isUnread: updated.isUnread });
  } catch (error) {
    console.error("[markEmailAsRead] Error:", error);
    res.status(500).json({ error: "Failed to update email read status" });
  }
};

/**
 * Toggle email starred status
 */
export const toggleEmailStar = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const message = await prisma.emailMessage.findUnique({
      where: { id },
      include: { account: true },
    });

    if (!message || message.account.userId !== userId) {
      res.status(404).json({ error: "Message not found" });
      return;
    }

    const newStarred = !message.isStarred;
    const updated = await prisma.emailMessage.update({
      where: { id },
      data: { isStarred: newStarred },
    });

    // Sync flag to Gmail IMAP in background
    updateRemoteMessageStarred(message.accountId, message.messageId, newStarred).catch((err) => {
      console.warn(`[toggleEmailStar] Remote sync error:`, err);
    });

    res.json({ isStarred: updated.isStarred });
  } catch (error) {
    console.error("[toggleEmailStar] Error:", error);
    res.status(500).json({ error: "Failed to toggle star" });
  }
};

/**
 * Get total unread email count across all accounts for current user
 */
export const getUnreadEmailCount = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const unreadCount = await prisma.emailMessage.count({
      where: {
        account: { userId },
        isUnread: true,
      },
    });

    res.json({ unreadCount });
  } catch (error) {
    console.error("[getUnreadEmailCount] Error:", error);
    res.status(500).json({ error: "Failed to load unread email count" });
  }
};

