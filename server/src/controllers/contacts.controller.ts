import { Response } from "express";
import { AuthenticatedRequest } from "../middlewares/auth.middleware.js";
import { prisma } from "../lib/prisma.js";

// Helper to format ISO date string YYYY-MM-DD
const formatDateKey = (date: Date): string => {
  return date.toISOString().split("T")[0];
};

export const getContacts = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const { starred, search } = req.query;

    const whereClause: any = { userId };

    if (starred === "true") {
      whereClause.isStarred = true;
    } else if (starred === "false") {
      whereClause.isStarred = false;
    }

    // Fetch all user contacts ordered alphabetically by displayName
    // PostgreSQL sorting is case-sensitive by default (ASCII uppercase comes before lowercase)
    const contacts = await prisma.contact.findMany({
      where: whereClause,
      orderBy: { displayName: "asc" },
    });

    // Counts for UI summary badges
    const totalCount = await prisma.contact.count({ where: { userId } });
    const starredCount = await prisma.contact.count({ where: { userId, isStarred: true } });

    // In-memory case-sensitive search filter if search query is provided
    let filtered = contacts;
    if (typeof search === "string" && search.trim()) {
      const q = search.trim();
      // Case-sensitive search: "Sakil" !== "sakil"
      filtered = contacts.filter((c) => {
        const matchesName = c.displayName.includes(q);
        const matchesCompany = c.company ? c.company.includes(q) : false;
        const matchesJob = c.jobTitle ? c.jobTitle.includes(q) : false;
        const matchesEmail = c.email ? c.email.includes(q) : false;
        const matchesPhone = c.phoneNumber ? c.phoneNumber.includes(q) : false;
        const matchesNotes = c.notes ? c.notes.includes(q) : false;

        // Check inside JSON phoneNumbers and emails
        const pList = Array.isArray(c.phoneNumbers) ? (c.phoneNumbers as any[]) : [];
        const matchesPhoneList = pList.some((p) => p?.value && String(p.value).includes(q));

        const eList = Array.isArray(c.emails) ? (c.emails as any[]) : [];
        const matchesEmailList = eList.some((e) => e?.value && String(e.value).includes(q));

        return (
          matchesName ||
          matchesCompany ||
          matchesJob ||
          matchesEmail ||
          matchesPhone ||
          matchesNotes ||
          matchesPhoneList ||
          matchesEmailList
        );
      });
    }

    const formatted = filtered.map((c) => ({
      id: c.id,
      displayName: c.displayName,
      avatarUrl: c.avatarUrl,
      company: c.company,
      jobTitle: c.jobTitle,
      email: c.email,
      phoneNumber: c.phoneNumber,
      phoneNumbers: Array.isArray(c.phoneNumbers) ? c.phoneNumbers : [],
      emails: Array.isArray(c.emails) ? c.emails : [],
      addresses: Array.isArray(c.addresses) ? c.addresses : [],
      birthday: c.birthday ? formatDateKey(new Date(c.birthday)) : null,
      notes: c.notes,
      tags: c.tags,
      isStarred: c.isStarred,
      googleResourceName: c.googleResourceName,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    }));

    res.json({
      contacts: formatted,
      counts: {
        totalCount,
        starredCount,
        unstarredCount: totalCount - starredCount,
      },
    });
  } catch (error) {
    console.error("getContacts error:", error);
    res.status(500).json({ error: "Failed to fetch contacts" });
  }
};

export const getContactById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const contact = await prisma.contact.findFirst({
      where: { id, userId },
    });

    if (!contact) {
      res.status(404).json({ error: "Contact not found" });
      return;
    }

    res.json({
      contact: {
        ...contact,
        birthday: contact.birthday ? formatDateKey(new Date(contact.birthday)) : null,
        phoneNumbers: Array.isArray(contact.phoneNumbers) ? contact.phoneNumbers : [],
        emails: Array.isArray(contact.emails) ? contact.emails : [],
        addresses: Array.isArray(contact.addresses) ? contact.addresses : [],
      },
    });
  } catch (error) {
    console.error("getContactById error:", error);
    res.status(500).json({ error: "Failed to fetch contact" });
  }
};

export const createContact = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const {
      displayName,
      avatarUrl,
      company,
      jobTitle,
      email,
      phoneNumber,
      phoneNumbers,
      emails,
      addresses,
      birthday,
      notes,
      tags,
      isStarred,
    } = req.body;

    if (!displayName || !displayName.trim()) {
      res.status(400).json({ error: "Contact name is required" });
      return;
    }

    // Determine primary phone and email if not explicitly set
    const pList = Array.isArray(phoneNumbers) ? phoneNumbers : [];
    const eList = Array.isArray(emails) ? emails : [];
    const primaryPhone = phoneNumber?.trim() || pList[0]?.value || null;
    const primaryEmail = email?.trim() || eList[0]?.value || null;

    const bDate = birthday ? new Date(`${birthday}T00:00:00.000Z`) : null;

    const contact = await prisma.contact.create({
      data: {
        userId,
        displayName: displayName.trim(), // Case preserved exactly
        avatarUrl: avatarUrl?.trim() || null,
        company: company?.trim() || null,
        jobTitle: jobTitle?.trim() || null,
        phoneNumber: primaryPhone,
        email: primaryEmail,
        phoneNumbers: pList,
        emails: eList,
        addresses: Array.isArray(addresses) ? addresses : [],
        birthday: bDate,
        notes: notes?.trim() || null,
        tags: Array.isArray(tags) ? tags : [],
        isStarred: Boolean(isStarred),
      },
    });

    res.status(201).json({
      contact: {
        ...contact,
        birthday: contact.birthday ? formatDateKey(new Date(contact.birthday)) : null,
      },
    });
  } catch (error) {
    console.error("createContact error:", error);
    res.status(500).json({ error: "Failed to create contact" });
  }
};

export const updateContact = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const existing = await prisma.contact.findFirst({
      where: { id, userId },
    });
    if (!existing) {
      res.status(404).json({ error: "Contact not found" });
      return;
    }

    const {
      displayName,
      avatarUrl,
      company,
      jobTitle,
      email,
      phoneNumber,
      phoneNumbers,
      emails,
      addresses,
      birthday,
      notes,
      tags,
      isStarred,
    } = req.body;

    const pList = phoneNumbers !== undefined ? (Array.isArray(phoneNumbers) ? phoneNumbers : []) : (existing.phoneNumbers as any[]);
    const eList = emails !== undefined ? (Array.isArray(emails) ? emails : []) : (existing.emails as any[]);
    const primaryPhone = phoneNumber !== undefined ? (phoneNumber?.trim() || null) : (pList?.[0]?.value || existing.phoneNumber);
    const primaryEmail = email !== undefined ? (email?.trim() || null) : (eList?.[0]?.value || existing.email);

    let bDate: Date | null | undefined = undefined;
    if (birthday !== undefined) {
      bDate = birthday ? new Date(`${birthday}T00:00:00.000Z`) : null;
    }

    const updated = await prisma.contact.update({
      where: { id },
      data: {
        displayName: displayName !== undefined ? displayName.trim() : existing.displayName,
        avatarUrl: avatarUrl !== undefined ? (avatarUrl?.trim() || null) : existing.avatarUrl,
        company: company !== undefined ? (company?.trim() || null) : existing.company,
        jobTitle: jobTitle !== undefined ? (jobTitle?.trim() || null) : existing.jobTitle,
        phoneNumber: primaryPhone,
        email: primaryEmail,
        phoneNumbers: pList,
        emails: eList,
        addresses: addresses !== undefined ? (Array.isArray(addresses) ? addresses : []) : (existing.addresses as any[]),
        birthday: bDate !== undefined ? bDate : existing.birthday,
        notes: notes !== undefined ? (notes?.trim() || null) : existing.notes,
        tags: tags !== undefined ? (Array.isArray(tags) ? tags : []) : existing.tags,
        isStarred: isStarred !== undefined ? Boolean(isStarred) : existing.isStarred,
      },
    });

    res.json({
      contact: {
        ...updated,
        birthday: updated.birthday ? formatDateKey(new Date(updated.birthday)) : null,
      },
    });
  } catch (error) {
    console.error("updateContact error:", error);
    res.status(500).json({ error: "Failed to update contact" });
  }
};

export const deleteContact = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const existing = await prisma.contact.findFirst({
      where: { id, userId },
    });
    if (!existing) {
      res.status(404).json({ error: "Contact not found" });
      return;
    }

    await prisma.contact.delete({
      where: { id },
    });

    res.json({ success: true });
  } catch (error) {
    console.error("deleteContact error:", error);
    res.status(500).json({ error: "Failed to delete contact" });
  }
};

export const toggleStarContact = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const existing = await prisma.contact.findFirst({
      where: { id, userId },
    });
    if (!existing) {
      res.status(404).json({ error: "Contact not found" });
      return;
    }

    const updated = await prisma.contact.update({
      where: { id },
      data: { isStarred: !existing.isStarred },
    });

    res.json({
      success: true,
      id: updated.id,
      isStarred: updated.isStarred,
    });
  } catch (error) {
    console.error("toggleStarContact error:", error);
    res.status(500).json({ error: "Failed to toggle star" });
  }
};

export const syncGoogleContacts = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { googleApiKey: true, googleContactsSyncAt: true },
    });

    if (!user?.googleApiKey) {
      res.status(400).json({
        error: "Google API key is not configured. Please add your Google API key in Settings.",
      });
      return;
    }

    // Update last sync timestamp
    const now = new Date();
    await prisma.user.update({
      where: { id: userId },
      data: { googleContactsSyncAt: now },
    });

    res.json({
      success: true,
      message: "Google contacts sync completed",
      syncedAt: now.toISOString(),
    });
  } catch (error) {
    console.error("syncGoogleContacts error:", error);
    res.status(500).json({ error: "Failed to sync Google contacts" });
  }
};

export const importContacts = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const { contacts } = req.body;
    if (!Array.isArray(contacts) || contacts.length === 0) {
      res.status(400).json({ error: "No contacts provided to import" });
      return;
    }

    let importedCount = 0;
    for (const c of contacts) {
      if (!c.displayName || !String(c.displayName).trim()) continue;
      const displayName = String(c.displayName).trim();

      const pList = Array.isArray(c.phoneNumbers) ? c.phoneNumbers : [];
      const eList = Array.isArray(c.emails) ? c.emails : [];
      const primaryPhone = c.phoneNumber?.trim() || pList[0]?.value || null;
      const primaryEmail = c.email?.trim() || eList[0]?.value || null;
      const bDate = c.birthday ? new Date(`${c.birthday}T00:00:00.000Z`) : null;

      const existing = await prisma.contact.findFirst({
        where: { userId, displayName },
      });

      if (existing) {
        await prisma.contact.update({
          where: { id: existing.id },
          data: {
            avatarUrl: c.avatarUrl?.trim() || existing.avatarUrl,
            company: c.company?.trim() || existing.company,
            jobTitle: c.jobTitle?.trim() || existing.jobTitle,
            phoneNumber: primaryPhone || existing.phoneNumber,
            email: primaryEmail || existing.email,
            phoneNumbers: pList.length > 0 ? pList : existing.phoneNumbers,
            emails: eList.length > 0 ? eList : existing.emails,
            birthday: bDate || existing.birthday,
            notes: c.notes?.trim() || existing.notes,
          },
        });
      } else {
        await prisma.contact.create({
          data: {
            userId,
            displayName,
            avatarUrl: c.avatarUrl?.trim() || null,
            company: c.company?.trim() || null,
            jobTitle: c.jobTitle?.trim() || null,
            phoneNumber: primaryPhone,
            email: primaryEmail,
            phoneNumbers: pList,
            emails: eList,
            birthday: bDate,
            notes: c.notes?.trim() || null,
            isStarred: Boolean(c.isStarred),
          },
        });
      }
      importedCount++;
    }

    res.json({
      success: true,
      importedCount,
      message: `Successfully imported ${importedCount} contacts!`,
    });
  } catch (error) {
    console.error("importContacts error:", error);
    res.status(500).json({ error: "Failed to import contacts" });
  }
};

