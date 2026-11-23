import { Response } from "express";
import prisma from "../lib/prisma.js";
import { AuthenticatedRequest } from "../middlewares/auth.middleware.js";

// Helper to format Date to YYYY-MM-DD
const formatDateKey = (date: Date): string => {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

// Helper to convert 24h "HH:MM" to "hh:mm A"
const format12Hour = (time24: string): string => {
  if (!time24) return "";
  const [hStr, mStr] = time24.split(":");
  let h = parseInt(hStr, 10);
  const m = mStr || "00";
  if (isNaN(h)) return time24;
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  return `${String(h).padStart(2, "0")}:${m} ${ampm}`;
};

// Ensure default PrayerSettings exists for user
const getOrCreatePrayerSettings = async (userId: string) => {
  let settings = await prisma.prayerSettings.findUnique({
    where: { userId },
  });

  if (!settings) {
    settings = await prisma.prayerSettings.create({
      data: {
        userId,
        fajr: "04:58 AM",
        dhuhr: "11:47 AM",
        asr: "03:36 PM",
        maghrib: "05:12 PM",
        isha: "06:31 PM",
        city: "Dhaka",
        country: "Bangladesh",
      },
    });
  }
  return settings;
};

// GET /api/habits
export const getHabitsData = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const { startDate: qStart, endDate: qEnd } = req.query;

    const now = new Date();
    const todayUTC = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));

    // Window defaults: 10 days before today to 10 days after today (21 days total)
    let start = qStart
      ? new Date(`${qStart}T00:00:00.000Z`)
      : new Date(todayUTC.getTime() - 10 * 24 * 60 * 60 * 1000);
    let end = qEnd
      ? new Date(`${qEnd}T23:59:59.999Z`)
      : new Date(todayUTC.getTime() + 10 * 24 * 60 * 60 * 1000 + 86399999);

    // 1. Fetch Prayer Settings
    const prayerSettings = await getOrCreatePrayerSettings(userId);

    // 2. Fetch Prayer Logs in range
    const prayerLogs = await prisma.prayerLog.findMany({
      where: {
        userId,
        date: {
          gte: start,
          lte: end,
        },
      },
    });

    const prayerLogsMap: Record<string, { fajr: boolean; dhuhr: boolean; asr: boolean; maghrib: boolean; isha: boolean }> = {};
    for (const log of prayerLogs) {
      const key = formatDateKey(new Date(log.date));
      prayerLogsMap[key] = {
        fajr: log.fajr,
        dhuhr: log.dhuhr,
        asr: log.asr,
        maghrib: log.maghrib,
        isha: log.isha,
      };
    }

    // 3. Fetch Locked Dates in range
    const locks = await prisma.calendarDayLock.findMany({
      where: {
        userId,
        date: {
          gte: start,
          lte: end,
        },
        isLocked: true,
      },
      select: { date: true },
    });
    const lockedDates = locks.map((l) => formatDateKey(new Date(l.date)));

    // 4. Fetch Active Habits (both Forever and Challenges)
    const habits = await prisma.habit.findMany({
      where: {
        userId,
        isArchived: false,
      },
      include: {
        logs: {
          where: {
            date: {
              gte: start,
              lte: end,
            },
          },
        },
        _count: {
          select: {
            logs: {
              where: {
                status: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const todayKey = formatDateKey(todayUTC);

    // Separate into Forever and Challenge
    const foreverHabits = habits
      .filter((h) => h.type === "FOREVER" || h.type === "EVERGREEN")
      .map((h) => ({
        id: h.id,
        name: h.name,
        description: h.description,
        time: h.time || null,
        type: "FOREVER" as const,
        startDate: h.startDate ? formatDateKey(new Date(h.startDate)) : formatDateKey(new Date(h.createdAt)),
        createdAt: formatDateKey(new Date(h.createdAt)),
        logs: h.logs.reduce((acc, l) => {
          acc[formatDateKey(new Date(l.date))] = l.status;
          return acc;
        }, {} as Record<string, boolean>),
        completedTotal: h._count.logs,
      }));

    const challengeHabits = habits
      .filter((h) => h.type === "CHALLENGE" || h.type === "TIME_BOUND")
      .map((h) => ({
        id: h.id,
        name: h.name,
        description: h.description,
        time: h.time || null,
        type: "CHALLENGE" as const,
        targetDays: h.targetDays || 30,
        startDate: h.startDate ? formatDateKey(new Date(h.startDate)) : formatDateKey(new Date(h.createdAt)),
        endDate: h.endDate ? formatDateKey(new Date(h.endDate)) : null,
        createdAt: formatDateKey(new Date(h.createdAt)),
        logs: h.logs.reduce((acc, l) => {
          acc[formatDateKey(new Date(l.date))] = l.status;
          return acc;
        }, {} as Record<string, boolean>),
        completedTotal: h._count.logs,
      }));

    res.json({
      todayDate: todayKey,
      prayerTimes: {
        fajr: prayerSettings.fajr,
        dhuhr: prayerSettings.dhuhr,
        asr: prayerSettings.asr,
        maghrib: prayerSettings.maghrib,
        isha: prayerSettings.isha,
        city: prayerSettings.city || "Dhaka",
        country: prayerSettings.country || "Bangladesh",
      },
      prayerLogs: prayerLogsMap,
      lockedDates,
      foreverHabits,
      challengeHabits,
    });
  } catch (error) {
    console.error("getHabitsData error:", error);
    res.status(500).json({ error: "Failed to load habits data" });
  }
};

// POST /api/habits/:id/toggle
export const toggleHabitDay = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    const { id } = req.params;
    const { date } = req.body;

    if (!userId || !date) {
      res.status(400).json({ error: "Habit ID and date are required" });
      return;
    }

    const targetDate = new Date(`${date}T00:00:00.000Z`);

    // Verify Habit exists and belongs to user
    const habit = await prisma.habit.findFirst({
      where: { id, userId },
    });
    if (!habit) {
      res.status(404).json({ error: "Habit not found" });
      return;
    }

    // Check if day is locked in CalendarDayLock
    const isLocked = await prisma.calendarDayLock.findFirst({
      where: { userId, date: targetDate, isLocked: true },
    });
    if (isLocked) {
      res.status(400).json({ error: "Cannot modify habits on a locked day" });
      return;
    }

    // Toggle HabitLog
    const existingLog = await prisma.habitLog.findUnique({
      where: {
        habitId_date: {
          habitId: id,
          date: targetDate,
        },
      },
    });

    if (existingLog) {
      await prisma.habitLog.delete({
        where: { id: existingLog.id },
      });
      res.json({ success: true, date, status: false });
    } else {
      await prisma.habitLog.create({
        data: {
          habitId: id,
          date: targetDate,
          status: true,
        },
      });
      res.json({ success: true, date, status: true });
    }
  } catch (error) {
    console.error("toggleHabitDay error:", error);
    res.status(500).json({ error: "Failed to toggle habit" });
  }
};

// POST /api/habits/prayer/toggle
export const togglePrayerDay = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    const { date, waqt } = req.body;

    if (!userId || !date || !waqt) {
      res.status(400).json({ error: "Date and waqt (fajr, dhuhr, asr, maghrib, isha) are required" });
      return;
    }

    const validWaqts = ["fajr", "dhuhr", "asr", "maghrib", "isha"];
    const waqtKey = waqt.toLowerCase();
    if (!validWaqts.includes(waqtKey)) {
      res.status(400).json({ error: `Invalid waqt '${waqt}'. Must be one of: ${validWaqts.join(", ")}` });
      return;
    }

    const targetDate = new Date(`${date}T00:00:00.000Z`);

    // Check if day is locked
    const isLocked = await prisma.calendarDayLock.findFirst({
      where: { userId, date: targetDate, isLocked: true },
    });
    if (isLocked) {
      res.status(400).json({ error: "Cannot modify prayers on a locked day" });
      return;
    }

    const existing = await prisma.prayerLog.findUnique({
      where: {
        userId_date: {
          userId,
          date: targetDate,
        },
      },
    });

    if (!existing) {
      const created = await prisma.prayerLog.create({
        data: {
          userId,
          date: targetDate,
          [waqtKey]: true,
        },
      });
      res.json({
        success: true,
        date,
        waqt: waqtKey,
        status: true,
        prayerLog: {
          fajr: created.fajr,
          dhuhr: created.dhuhr,
          asr: created.asr,
          maghrib: created.maghrib,
          isha: created.isha,
        },
      });
      return;
    }

    const nextValue = !(existing as any)[waqtKey];
    const updated = await prisma.prayerLog.update({
      where: { id: existing.id },
      data: {
        [waqtKey]: nextValue,
      },
    });

    res.json({
      success: true,
      date,
      waqt: waqtKey,
      status: nextValue,
      prayerLog: {
        fajr: updated.fajr,
        dhuhr: updated.dhuhr,
        asr: updated.asr,
        maghrib: updated.maghrib,
        isha: updated.isha,
      },
    });
  } catch (error) {
    console.error("togglePrayerDay error:", error);
    res.status(500).json({ error: "Failed to toggle prayer" });
  }
};

// POST /api/habits
export const createHabit = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const { name, type, targetDays, time, description, startDate } = req.body;

    if (!name || !name.trim()) {
      res.status(400).json({ error: "Habit name is required" });
      return;
    }

    const habitType = type === "CHALLENGE" ? "CHALLENGE" : "FOREVER";
    const start = startDate ? new Date(`${startDate}T00:00:00.000Z`) : new Date();

    let end: Date | null = null;
    let days: number | null = null;

    if (habitType === "CHALLENGE") {
      days = targetDays ? parseInt(targetDays, 10) : 30;
      if (isNaN(days) || days < 1) days = 30;
      end = new Date(start.getTime() + days * 24 * 60 * 60 * 1000);
    }

    const habit = await prisma.habit.create({
      data: {
        userId,
        name: name.trim(),
        type: habitType,
        time: time?.trim() || null,
        description: description?.trim() || null,
        targetDays: days,
        startDate: habitType === "CHALLENGE" ? start : null,
        endDate: habitType === "CHALLENGE" ? end : null,
        isArchived: false,
        isCompleted: false,
      },
    });

    res.status(201).json({ habit });
  } catch (error) {
    console.error("createHabit error:", error);
    res.status(500).json({ error: "Failed to create habit" });
  }
};

// PUT /api/habits/:id
export const updateHabit = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    const { id } = req.params;
    const { name, time, description, targetDays } = req.body;

    const existing = await prisma.habit.findFirst({
      where: { id, userId },
    });
    if (!existing) {
      res.status(404).json({ error: "Habit not found" });
      return;
    }

    let updatedTargetDays = existing.targetDays;
    let updatedEndDate = existing.endDate;

    if (existing.type === "CHALLENGE" && targetDays) {
      const days = parseInt(targetDays, 10);
      if (!isNaN(days) && days > 0) {
        updatedTargetDays = days;
        if (existing.startDate) {
          updatedEndDate = new Date(existing.startDate.getTime() + days * 24 * 60 * 60 * 1000);
        }
      }
    }

    const updated = await prisma.habit.update({
      where: { id },
      data: {
        name: name !== undefined ? name.trim() : existing.name,
        time: time !== undefined ? (time ? time.trim() : null) : existing.time,
        description: description !== undefined ? (description ? description.trim() : null) : existing.description,
        targetDays: updatedTargetDays,
        endDate: updatedEndDate,
      },
    });

    res.json({ habit: updated });
  } catch (error) {
    console.error("updateHabit error:", error);
    res.status(500).json({ error: "Failed to update habit" });
  }
};

// DELETE /api/habits/:id
export const deleteHabit = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    const existing = await prisma.habit.findFirst({
      where: { id, userId },
    });
    if (!existing) {
      res.status(404).json({ error: "Habit not found" });
      return;
    }

    await prisma.habit.delete({
      where: { id },
    });

    res.json({ success: true, id });
  } catch (error) {
    console.error("deleteHabit error:", error);
    res.status(500).json({ error: "Failed to delete habit" });
  }
};

// POST /api/habits/:id/finish (early finish challenge)
export const finishChallenge = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    const existing = await prisma.habit.findFirst({
      where: { id, userId },
    });
    if (!existing) {
      res.status(404).json({ error: "Habit not found" });
      return;
    }

    const updated = await prisma.habit.update({
      where: { id },
      data: {
        isCompleted: true,
        isArchived: true,
        endDate: new Date(),
      },
    });

    res.json({ success: true, habit: updated });
  } catch (error) {
    console.error("finishChallenge error:", error);
    res.status(500).json({ error: "Failed to finish challenge" });
  }
};

// GET /api/habits/history
export const getHabitsHistory = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const archivedHabits = await prisma.habit.findMany({
      where: {
        userId,
        OR: [
          { isArchived: true },
          { isCompleted: true },
        ],
      },
      include: {
        _count: {
          select: {
            logs: {
              where: { status: true },
            },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    const history = archivedHabits.map((h) => {
      const completedDays = h._count.logs;
      const targetDays = h.targetDays || 30;
      const rate = targetDays > 0 ? Math.min(100, Math.round((completedDays / targetDays) * 100)) : 0;

      return {
        id: h.id,
        name: h.name,
        description: h.description,
        type: h.type,
        time: h.time,
        targetDays,
        completedDays,
        completionRate: rate,
        isCompleted: h.isCompleted,
        startDate: h.startDate ? formatDateKey(new Date(h.startDate)) : null,
        endDate: h.endDate ? formatDateKey(new Date(h.endDate)) : null,
        createdAt: h.createdAt.toISOString(),
      };
    });

    res.json({ history });
  } catch (error) {
    console.error("getHabitsHistory error:", error);
    res.status(500).json({ error: "Failed to load habits history" });
  }
};

// POST /api/habits/sync-prayers
export const syncPrayerTimes = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const { latitude, longitude, city, country } = req.body;

    let targetCity = city || "Dhaka";
    let targetCountry = country || "Bangladesh";

    let apiUrl = "";
    if (latitude !== undefined && longitude !== undefined && latitude !== null && longitude !== null) {
      apiUrl = `https://api.aladhan.com/v1/timings?latitude=${latitude}&longitude=${longitude}&method=2`;
    } else {
      apiUrl = `https://api.aladhan.com/v1/timingsByCity?city=${encodeURIComponent(targetCity)}&country=${encodeURIComponent(targetCountry)}&method=2`;
    }

    let fajr = "04:58 AM";
    let dhuhr = "11:47 AM";
    let asr = "03:36 PM";
    let maghrib = "05:12 PM";
    let isha = "06:31 PM";
    let syncedCity = targetCity;

    try {
      const response = await fetch(apiUrl, { signal: AbortSignal.timeout(6000) });
      if (response.ok) {
        const data = (await response.json()) as any;
        const timings = data?.data?.timings;
        if (timings) {
          fajr = format12Hour(timings.Fajr);
          dhuhr = format12Hour(timings.Dhuhr);
          asr = format12Hour(timings.Asr);
          maghrib = format12Hour(timings.Maghrib);
          isha = format12Hour(timings.Isha);
          if (data?.data?.meta?.timezone) {
            syncedCity = data.data.meta.timezone.split("/")[1]?.replace("_", " ") || targetCity;
          }
        }
      }
    } catch (fetchErr) {
      console.warn("AlAdhan API fetch failed, using fallback calculation/defaults:", fetchErr);
    }

    const settings = await prisma.prayerSettings.upsert({
      where: { userId },
      update: {
        fajr,
        dhuhr,
        asr,
        maghrib,
        isha,
        latitude: latitude || null,
        longitude: longitude || null,
        city: syncedCity,
        country: targetCountry,
      },
      create: {
        userId,
        fajr,
        dhuhr,
        asr,
        maghrib,
        isha,
        latitude: latitude || null,
        longitude: longitude || null,
        city: syncedCity,
        country: targetCountry,
      },
    });

    res.json({
      success: true,
      prayerTimes: {
        fajr: settings.fajr,
        dhuhr: settings.dhuhr,
        asr: settings.asr,
        maghrib: settings.maghrib,
        isha: settings.isha,
        city: settings.city,
        country: settings.country,
      },
      message: `Prayer times synchronized for ${syncedCity}`,
    });
  } catch (error) {
    console.error("syncPrayerTimes error:", error);
    res.status(500).json({ error: "Failed to sync prayer times" });
  }
};
