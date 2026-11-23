import { Response } from "express";
import prisma from "../lib/prisma.js";
import { AuthenticatedRequest } from "../middlewares/auth.middleware.js";

export const getTasksAndEvents = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");

    const todayStart = new Date(`${y}-${m}-${d}T00:00:00.000Z`);
    const todayEnd = new Date(`${y}-${m}-${d}T23:59:59.999Z`);

    // All active tasks for user
    const tasks = await prisma.task.findMany({
      where: { userId },
      orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
    });

    // All events for user
    const events = await prisma.calendarEvent.findMany({
      where: { userId },
      orderBy: { startDate: "asc" },
    });

    // Partition into Upcoming vs History
    const upcomingTasks: typeof tasks = [];
    const historyTasks: typeof tasks = [];

    for (const t of tasks) {
      if (t.isCompleted) {
        historyTasks.push(t);
      } else if (!t.dueDate || t.dueDate >= todayStart) {
        upcomingTasks.push(t);
      } else {
        // Overdue past tasks count into history / past
        historyTasks.push(t);
      }
    }

    const upcomingEvents: typeof events = [];
    const historyEvents: typeof events = [];

    for (const e of events) {
      if (e.endDate >= todayStart) {
        upcomingEvents.push(e);
      } else {
        historyEvents.push(e);
      }
    }

    // Build Date Groups for Upcoming (Today, Tomorrow, Future)
    const dateMap = new Map<
      string,
      {
        dateStr: string; // YYYY-MM-DD
        isToday: boolean;
        isTomorrow: boolean;
        formattedLabel: string;
        items: Array<{
          id: string;
          type: "TASK" | "EVENT";
          title: string;
          description?: string;
          time?: string;
          priority?: string;
          isCompleted?: boolean;
          dueDate?: string;
          startDate?: string;
          endDate?: string;
          isAllDay?: boolean;
          recurrenceEndDate?: string;
          eventType?: string;
          recurrenceType?: string;
          color?: string;
          location?: string;
        }>;
      }
    >();

    const getOrCreateGroup = (dateKey: string, dateObj: Date) => {
      if (!dateMap.has(dateKey)) {
        const isToday = dateKey === `${y}-${m}-${d}`;

        const tomorrowDate = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
        const ty = tomorrowDate.getFullYear();
        const tm = String(tomorrowDate.getMonth() + 1).padStart(2, "0");
        const td = String(tomorrowDate.getDate()).padStart(2, "0");
        const isTomorrow = dateKey === `${ty}-${tm}-${td}`;

        const formattedLabel = dateObj.toLocaleDateString("en-US", {
          weekday: "short",
          day: "2-digit",
          month: "short",
          year: "numeric",
        }).toUpperCase();

        dateMap.set(dateKey, {
          dateStr: dateKey,
          isToday,
          isTomorrow,
          formattedLabel,
          items: [],
        });
      }
      return dateMap.get(dateKey)!;
    };

    // Add upcoming tasks into date map
    for (const t of upcomingTasks) {
      const taskDate = t.dueDate ? new Date(t.dueDate) : todayStart;
      const dy = taskDate.getFullYear();
      const dm = String(taskDate.getMonth() + 1).padStart(2, "0");
      const dd = String(taskDate.getDate()).padStart(2, "0");
      const key = `${dy}-${dm}-${dd}`;

      const group = getOrCreateGroup(key, taskDate);
      group.items.push({
        id: t.id,
        type: "TASK",
        title: t.title,
        description: t.description || undefined,
        time: t.dueTime || undefined,
        dueDate: t.dueDate ? t.dueDate.toISOString().split("T")[0] : undefined,
        priority: t.priority,
        isCompleted: t.isCompleted,
      });
    }

    // Add upcoming events into date map
    for (const e of upcomingEvents) {
      const evDate = new Date(e.startDate);
      const dy = evDate.getFullYear();
      const dm = String(evDate.getMonth() + 1).padStart(2, "0");
      const dd = String(evDate.getDate()).padStart(2, "0");
      const key = `${dy}-${dm}-${dd}`;

      const group = getOrCreateGroup(key, evDate);
      group.items.push({
        id: e.id,
        type: "EVENT",
        title: e.title,
        description: e.description || undefined,
        time: e.isAllDay
          ? undefined
          : e.startDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        startDate: e.startDate.toISOString(),
        endDate: e.endDate.toISOString(),
        isAllDay: e.isAllDay,
        recurrenceEndDate: e.recurrenceEndDate ? e.recurrenceEndDate.toISOString().split("T")[0] : undefined,
        eventType: e.eventType,
        recurrenceType: e.recurrenceType,
        color: e.color || "#3b82f6",
        location: e.location || undefined,
      });
    }

    // Sort date groups ascending
    const sortedUpcoming = Array.from(dateMap.values()).sort((a, b) =>
      a.dateStr.localeCompare(b.dateStr)
    );

    // Format history list
    const formattedHistory = [
      ...historyTasks.map((t) => ({
        id: t.id,
        type: "TASK" as const,
        title: t.title,
        description: t.description || undefined,
        date: t.dueDate ? t.dueDate.toISOString().split("T")[0] : undefined,
        time: t.dueTime || undefined,
        priority: t.priority,
        isCompleted: t.isCompleted,
        completedAt: t.completedAt ? t.completedAt.toISOString() : undefined,
      })),
      ...historyEvents.map((e) => ({
        id: e.id,
        type: "EVENT" as const,
        title: e.title,
        description: e.description || undefined,
        date: e.startDate.toISOString().split("T")[0],
        time: e.isAllDay
          ? undefined
          : e.startDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        recurrenceEndDate: e.recurrenceEndDate ? e.recurrenceEndDate.toISOString().split("T")[0] : undefined,
        eventType: e.eventType,
        color: e.color || "#3b82f6",
        location: e.location || undefined,
      })),
    ].sort((a, b) => (b.date || "").localeCompare(a.date || ""));

    res.json({
      upcoming: sortedUpcoming,
      history: formattedHistory,
      counts: {
        upcomingTasksCount: upcomingTasks.length,
        upcomingEventsCount: upcomingEvents.length,
        historyCount: formattedHistory.length,
      },
    });
  } catch (error) {
    console.error("getTasksAndEvents error:", error);
    res.status(500).json({ error: "Failed to fetch tasks and events" });
  }
};

export const createTask = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    const { title, description, dueDate, dueTime, priority } = req.body;

    if (!title || !userId) {
      res.status(400).json({ error: "Title is required" });
      return;
    }

    let parsedDueDate: Date;
    if (dueDate) {
      parsedDueDate = new Date(`${dueDate}T00:00:00.000Z`);
    } else {
      const now = new Date();
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, "0");
      const d = String(now.getDate()).padStart(2, "0");
      parsedDueDate = new Date(`${y}-${m}-${d}T00:00:00.000Z`);
    }

    // Check if day is locked
    const dayLock = await prisma.calendarDayLock.findFirst({
      where: { userId, date: parsedDueDate, isLocked: true },
    });
    if (dayLock) {
      res.status(400).json({ error: "This day is locked and immutable" });
      return;
    }

    const task = await prisma.task.create({
      data: {
        userId,
        title: title.trim(),
        description: description?.trim() || null,
        dueDate: parsedDueDate,
        dueTime: dueTime?.trim() || null,
        priority: priority || "MEDIUM",
        isCompleted: false,
      },
    });

    res.status(201).json({ task });
  } catch (error) {
    console.error("createTask error:", error);
    res.status(500).json({ error: "Failed to create task" });
  }
};

export const updateTask = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    const { id } = req.params;
    const { title, description, dueDate, dueTime, priority } = req.body;

    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const existing = await prisma.task.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      res.status(404).json({ error: "Task not found" });
      return;
    }

    // Check if current task's dueDate is locked
    if (existing.dueDate) {
      const currentDayLock = await prisma.calendarDayLock.findFirst({
        where: { userId, date: existing.dueDate, isLocked: true },
      });
      if (currentDayLock) {
        res.status(400).json({ error: "Cannot modify tasks on a locked day" });
        return;
      }
    }

    // Check if new target dueDate is locked
    let targetDueDate: Date | null | undefined = undefined;
    if (dueDate !== undefined) {
      targetDueDate = dueDate ? new Date(`${dueDate}T00:00:00.000Z`) : null;
      if (targetDueDate) {
        const targetDayLock = await prisma.calendarDayLock.findFirst({
          where: { userId, date: targetDueDate, isLocked: true },
        });
        if (targetDayLock) {
          res.status(400).json({ error: "Cannot move tasks to a locked day" });
          return;
        }
      }
    }

    const data: any = {};
    if (title !== undefined) data.title = title.trim();
    if (description !== undefined) data.description = description ? description.trim() : null;
    if (dueTime !== undefined) data.dueTime = dueTime ? dueTime.trim() : null;
    if (priority !== undefined) data.priority = priority;
    if (dueDate !== undefined) data.dueDate = targetDueDate;

    const updated = await prisma.task.update({
      where: { id: existing.id },
      data,
    });

    res.json({ success: true, count: 1, task: updated });
  } catch (error) {
    console.error("updateTask error:", error);
    res.status(500).json({ error: "Failed to update task" });
  }
};

export const deleteTask = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const existing = await prisma.task.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      res.status(404).json({ error: "Task not found" });
      return;
    }

    if (existing.dueDate) {
      const dayLock = await prisma.calendarDayLock.findFirst({
        where: { userId, date: existing.dueDate, isLocked: true },
      });
      if (dayLock) {
        res.status(400).json({ error: "Cannot delete tasks from a locked day" });
        return;
      }
    }

    await prisma.task.delete({
      where: { id: existing.id },
    });

    res.json({ success: true });
  } catch (error) {
    console.error("deleteTask error:", error);
    res.status(500).json({ error: "Failed to delete task" });
  }
};

export const toggleTask = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    const existing = await prisma.task.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      res.status(404).json({ error: "Task not found" });
      return;
    }

    if (existing.dueDate) {
      const dayLock = await prisma.calendarDayLock.findFirst({
        where: { userId, date: existing.dueDate, isLocked: true },
      });
      if (dayLock) {
        res.status(400).json({ error: "Cannot modify tasks on a locked day" });
        return;
      }
    }

    const nextCompleted = !existing.isCompleted;

    const updated = await prisma.task.update({
      where: { id: existing.id },
      data: {
        isCompleted: nextCompleted,
        completedAt: nextCompleted ? new Date() : null,
      },
    });

    res.json({ task: updated });
  } catch (error) {
    console.error("toggleTask error:", error);
    res.status(500).json({ error: "Failed to toggle task" });
  }
};

export const createEvent = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    const {
      title,
      description,
      startDate,
      endDate,
      isAllDay,
      eventType,
      recurrenceType,
      recurrenceEndDate,
      color,
      location,
    } = req.body;

    if (!title || !startDate || !userId) {
      res.status(400).json({ error: "Title and start date are required" });
      return;
    }

    const parsedStart = new Date(startDate);
    const parsedEnd = endDate ? new Date(endDate) : new Date(parsedStart.getTime() + 60 * 60 * 1000);

    const eventDayKey = parsedStart.toISOString().split("T")[0];
    const dayLock = await prisma.calendarDayLock.findFirst({
      where: {
        userId,
        date: new Date(`${eventDayKey}T00:00:00.000Z`),
        isLocked: true,
      },
    });
    if (dayLock) {
      res.status(400).json({ error: "Cannot schedule events on a locked day" });
      return;
    }

    let recType = recurrenceType || "NONE";
    const evType = eventType || "STANDARD";
    if (evType === "BIRTHDAY" || evType === "ANNIVERSARY" || evType === "YEARLY") {
      recType = "YEARLY";
    } else if (evType === "WEEKLY") {
      recType = "WEEKLY";
    } else if (evType === "MONTHLY") {
      recType = "MONTHLY";
    }

    let parsedRecurrenceEndDate: Date | null = null;
    if (recurrenceEndDate) {
      parsedRecurrenceEndDate = new Date(`${recurrenceEndDate}T00:00:00.000Z`);
    }

    const event = await prisma.calendarEvent.create({
      data: {
        userId,
        title: title.trim(),
        description: description?.trim() || null,
        startDate: parsedStart,
        endDate: parsedEnd,
        isAllDay: Boolean(isAllDay),
        eventType: evType,
        recurrenceType: recType,
        recurrenceEndDate: parsedRecurrenceEndDate,
        color: color?.trim() || "#3b82f6",
        location: location?.trim() || null,
      },
    });

    res.status(201).json({ event });
  } catch (error) {
    console.error("createEvent error:", error);
    res.status(500).json({ error: "Failed to create event" });
  }
};

export const updateEvent = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    const { id } = req.params;
    const {
      title,
      description,
      startDate,
      endDate,
      isAllDay,
      eventType,
      recurrenceType,
      recurrenceEndDate,
      color,
      location,
    } = req.body;

    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const existing = await prisma.calendarEvent.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      res.status(404).json({ error: "Event not found" });
      return;
    }

    // Check if original event date is locked
    const origDayKey = existing.startDate.toISOString().split("T")[0];
    const origDayLock = await prisma.calendarDayLock.findFirst({
      where: {
        userId,
        date: new Date(`${origDayKey}T00:00:00.000Z`),
        isLocked: true,
      },
    });
    if (origDayLock) {
      res.status(400).json({ error: "Cannot modify events on a locked day" });
      return;
    }

    // Check if new start date is locked
    if (startDate) {
      const newDayKey = new Date(startDate).toISOString().split("T")[0];
      const newDayLock = await prisma.calendarDayLock.findFirst({
        where: {
          userId,
          date: new Date(`${newDayKey}T00:00:00.000Z`),
          isLocked: true,
        },
      });
      if (newDayLock) {
        res.status(400).json({ error: "Cannot move events to a locked day" });
        return;
      }
    }

    const data: any = {};
    if (title !== undefined) data.title = title.trim();
    if (description !== undefined) data.description = description ? description.trim() : null;
    if (startDate) data.startDate = new Date(startDate);
    if (endDate) data.endDate = new Date(endDate);
    if (isAllDay !== undefined) data.isAllDay = Boolean(isAllDay);
    if (location !== undefined) data.location = location ? location.trim() : null;
    if (color !== undefined) data.color = color ? color.trim() : "#3b82f6";
    if (eventType !== undefined) {
      data.eventType = eventType;
      if (eventType === "BIRTHDAY" || eventType === "ANNIVERSARY" || eventType === "YEARLY") {
        data.recurrenceType = "YEARLY";
      } else if (eventType === "WEEKLY") {
        data.recurrenceType = "WEEKLY";
      } else if (eventType === "MONTHLY") {
        data.recurrenceType = "MONTHLY";
      }
    }
    if (recurrenceType !== undefined) data.recurrenceType = recurrenceType;
    if (recurrenceEndDate !== undefined) {
      data.recurrenceEndDate = recurrenceEndDate ? new Date(`${recurrenceEndDate}T00:00:00.000Z`) : null;
    }

    const updated = await prisma.calendarEvent.update({
      where: { id: existing.id },
      data,
    });

    res.json({ success: true, count: 1, event: updated });
  } catch (error) {
    console.error("updateEvent error:", error);
    res.status(500).json({ error: "Failed to update event" });
  }
};

export const deleteEvent = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const existing = await prisma.calendarEvent.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      res.status(404).json({ error: "Event not found" });
      return;
    }

    const eventDayKey = existing.startDate.toISOString().split("T")[0];
    const dayLock = await prisma.calendarDayLock.findFirst({
      where: {
        userId,
        date: new Date(`${eventDayKey}T00:00:00.000Z`),
        isLocked: true,
      },
    });
    if (dayLock) {
      res.status(400).json({ error: "Cannot delete events from a locked day" });
      return;
    }

    await prisma.calendarEvent.delete({
      where: { id: existing.id },
    });

    res.json({ success: true });
  } catch (error) {
    console.error("deleteEvent error:", error);
    res.status(500).json({ error: "Failed to delete event" });
  }
};
