import { Response } from "express";
import prisma from "../lib/prisma.js";
import { AuthenticatedRequest } from "../middlewares/auth.middleware.js";

// Helper to format Date to YYYY-MM-DD
function formatDateKey(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export const getMonthCalendar = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const now = new Date();
    const queryYear = req.query.year ? parseInt(req.query.year as string, 10) : now.getFullYear();
    const queryMonth = req.query.month ? parseInt(req.query.month as string, 10) : now.getMonth() + 1; // 1-indexed

    // Calculate grid start and end
    // First day of target month (00:00:00 UTC)
    const firstDayOfMonth = new Date(Date.UTC(queryYear, queryMonth - 1, 1));
    const dayOfWeek = firstDayOfMonth.getUTCDay(); // 0 is Sunday

    // Grid start: previous Sunday
    const gridStartDate = new Date(firstDayOfMonth.getTime() - dayOfWeek * 24 * 60 * 60 * 1000);

    // Total cells: 35 or 42 days (5 or 6 weeks)
    // Find last day of target month
    const lastDayOfMonth = new Date(Date.UTC(queryYear, queryMonth, 0));
    const totalDaysNeeded = dayOfWeek + lastDayOfMonth.getUTCDate();
    const totalCells = totalDaysNeeded > 35 ? 42 : 35;

    const gridEndDate = new Date(gridStartDate.getTime() + totalCells * 24 * 60 * 60 * 1000 - 1);

    // 1. Fetch Day Locks in Grid Range
    const dayLocks = await prisma.calendarDayLock.findMany({
      where: {
        userId,
        date: {
          gte: gridStartDate,
          lte: gridEndDate,
        },
        isLocked: true,
      },
    });

    const lockMap = new Map<string, typeof dayLocks[0]>();
    for (const lock of dayLocks) {
      lockMap.set(formatDateKey(new Date(lock.date)), lock);
    }

    // 2. Fetch Tasks in Grid Range
    const tasks = await prisma.task.findMany({
      where: {
        userId,
        dueDate: {
          gte: gridStartDate,
          lte: gridEndDate,
        },
      },
      orderBy: [{ dueTime: "asc" }, { createdAt: "asc" }],
    });

    // 3. Fetch Events
    const events = await prisma.calendarEvent.findMany({
      where: {
        userId,
        startDate: { lte: gridEndDate },
        OR: [
          { recurrenceEndDate: null },
          { recurrenceEndDate: { gte: gridStartDate } },
        ],
      },
      orderBy: [{ startDate: "asc" }],
    });

    // Today in UTC
    const todayKey = formatDateKey(new Date());

    // Build the grid array
    const calendarDays = [];

    for (let i = 0; i < totalCells; i++) {
      const cellDate = new Date(gridStartDate.getTime() + i * 24 * 60 * 60 * 1000);
      const cellDateKey = formatDateKey(cellDate);
      const cellDayNumber = cellDate.getUTCDate();
      const isCurrentMonth = cellDate.getUTCMonth() === (queryMonth - 1);
      const isToday = cellDateKey === todayKey;

      const lock = lockMap.get(cellDateKey);
      const isLocked = Boolean(lock && lock.isLocked);

      if (isLocked && lock) {
        // Use frozen snapshot
        const rawTasks = (lock.tasksSnapshot as any[]) || [];
        const rawEvents = (lock.eventsSnapshot as any[]) || [];

        calendarDays.push({
          dateStr: cellDateKey,
          dayNumber: cellDayNumber,
          isCurrentMonth,
          isToday,
          isLocked: true,
          tasks: rawTasks,
          events: rawEvents,
        });
      } else {
        // Calculate live tasks for this date
        const dayTasks = tasks
          .filter((t) => t.dueDate && formatDateKey(new Date(t.dueDate)) === cellDateKey)
          .map((t) => ({
            id: t.id,
            title: t.title,
            description: t.description || undefined,
            isCompleted: t.isCompleted,
            dueTime: t.dueTime || undefined,
            priority: t.priority,
          }));

        // Calculate live events for this date
        const cellDayOfWeek = cellDate.getUTCDay();
        const cellDayOfMonth = cellDate.getUTCDate();
        const cellMonth = cellDate.getUTCMonth();

        const dayEvents = [];

        for (const e of events) {
          const eStartDate = new Date(e.startDate);
          const eStartDateKey = formatDateKey(eStartDate);

          // Event hasn't started yet
          if (cellDateKey < eStartDateKey) continue;

          // Check if recurrence ended
          if (e.recurrenceEndDate) {
            const eCutoffKey = formatDateKey(new Date(e.recurrenceEndDate));
            if (cellDateKey > eCutoffKey) continue;
          }

          let matches = false;

          const evType = e.eventType;
          const recType = e.recurrenceType;

          if (recType === "WEEKLY" || evType === "WEEKLY") {
            matches = cellDayOfWeek === eStartDate.getUTCDay();
          } else if (recType === "MONTHLY" || evType === "MONTHLY") {
            matches = cellDayOfMonth === eStartDate.getUTCDate();
          } else if (
            recType === "YEARLY" ||
            evType === "YEARLY" ||
            evType === "BIRTHDAY" ||
            evType === "ANNIVERSARY"
          ) {
            matches = cellMonth === eStartDate.getUTCMonth() && cellDayOfMonth === eStartDate.getUTCDate();
          } else {
            // Standard one-time or date-range event
            const eEndDate = new Date(e.endDate);
            const eEndDateKey = formatDateKey(eEndDate);
            matches = cellDateKey >= eStartDateKey && cellDateKey <= eEndDateKey;
          }

          if (matches) {
            dayEvents.push({
              id: e.id,
              title: e.title,
              description: e.description || undefined,
              time: e.isAllDay
                ? undefined
                : e.startDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              isAllDay: e.isAllDay,
              color: e.color || "#3b82f6",
              eventType: e.eventType,
              location: e.location || undefined,
              recurrenceEndDate: e.recurrenceEndDate ? formatDateKey(new Date(e.recurrenceEndDate)) : undefined,
            });
          }
        }

        calendarDays.push({
          dateStr: cellDateKey,
          dayNumber: cellDayNumber,
          isCurrentMonth,
          isToday,
          isLocked: false,
          tasks: dayTasks,
          events: dayEvents,
        });
      }
    }

    res.json({
      year: queryYear,
      month: queryMonth,
      days: calendarDays,
    });
  } catch (error) {
    console.error("getMonthCalendar error:", error);
    res.status(500).json({ error: "Failed to fetch calendar" });
  }
};

export const toggleDayLock = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    const { date, isLocked } = req.body;

    if (!userId || !date) {
      res.status(400).json({ error: "Date is required" });
      return;
    }

    const targetDate = new Date(`${date}T00:00:00.000Z`);

    if (!isLocked) {
      // Unlock the day by removing or setting isLocked = false
      await prisma.calendarDayLock.deleteMany({
        where: { userId, date: targetDate },
      });
      res.json({ success: true, date, isLocked: false });
      return;
    }

    // LOCKING: Compute point-in-time snapshot
    const targetDateKey = date;

    // 1. Snapshot tasks
    const liveTasks = await prisma.task.findMany({
      where: { userId, dueDate: targetDate },
      orderBy: [{ dueTime: "asc" }, { createdAt: "asc" }],
    });

    const tasksSnapshot = liveTasks.map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description || undefined,
      isCompleted: t.isCompleted,
      dueTime: t.dueTime || undefined,
      priority: t.priority,
    }));

    // 2. Snapshot events (including recurring occurrences)
    const allEvents = await prisma.calendarEvent.findMany({
      where: {
        userId,
        startDate: { lte: new Date(`${date}T23:59:59.999Z`) },
        OR: [
          { recurrenceEndDate: null },
          { recurrenceEndDate: { gte: targetDate } },
        ],
      },
    });

    const targetDayOfWeek = targetDate.getUTCDay();
    const targetDayOfMonth = targetDate.getUTCDate();
    const targetMonth = targetDate.getUTCMonth();

    const eventsSnapshot = [];

    for (const e of allEvents) {
      const eStartDate = new Date(e.startDate);
      const eStartDateKey = formatDateKey(eStartDate);

      if (targetDateKey < eStartDateKey) continue;
      if (e.recurrenceEndDate) {
        const eCutoffKey = formatDateKey(new Date(e.recurrenceEndDate));
        if (targetDateKey > eCutoffKey) continue;
      }

      let matches = false;
      const evType = e.eventType;
      const recType = e.recurrenceType;

      if (recType === "WEEKLY" || evType === "WEEKLY") {
        matches = targetDayOfWeek === eStartDate.getUTCDay();
      } else if (recType === "MONTHLY" || evType === "MONTHLY") {
        matches = targetDayOfMonth === eStartDate.getUTCDate();
      } else if (
        recType === "YEARLY" ||
        evType === "YEARLY" ||
        evType === "BIRTHDAY" ||
        evType === "ANNIVERSARY"
      ) {
        matches = targetMonth === eStartDate.getUTCMonth() && targetDayOfMonth === eStartDate.getUTCDate();
      } else {
        const eEndDate = new Date(e.endDate);
        const eEndDateKey = formatDateKey(eEndDate);
        matches = targetDateKey >= eStartDateKey && targetDateKey <= eEndDateKey;
      }

      if (matches) {
        eventsSnapshot.push({
          id: e.id,
          title: e.title,
          description: e.description || undefined,
          time: e.isAllDay
            ? undefined
            : e.startDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          isAllDay: e.isAllDay,
          color: e.color || "#3b82f6",
          eventType: e.eventType,
          location: e.location || undefined,
          recurrenceEndDate: e.recurrenceEndDate ? formatDateKey(new Date(e.recurrenceEndDate)) : undefined,
        });
      }
    }

    // Upsert lock record
    const lock = await prisma.calendarDayLock.upsert({
      where: {
        userId_date: {
          userId,
          date: targetDate,
        },
      },
      update: {
        isLocked: true,
        tasksSnapshot,
        eventsSnapshot,
        lockedAt: new Date(),
      },
      create: {
        userId,
        date: targetDate,
        isLocked: true,
        tasksSnapshot,
        eventsSnapshot,
        lockedAt: new Date(),
      },
    });

    res.json({
      success: true,
      date,
      isLocked: true,
      tasks: tasksSnapshot,
      events: eventsSnapshot,
    });
  } catch (error) {
    console.error("toggleDayLock error:", error);
    res.status(500).json({ error: "Failed to lock/unlock day" });
  }
};
