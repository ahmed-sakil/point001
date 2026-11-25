import { Response } from "express";
import prisma from "../lib/prisma.js";
import { AuthenticatedRequest } from "../middlewares/auth.middleware.js";

export const getCommandCenterData = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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

    const future = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const fy = future.getFullYear();
    const fm = String(future.getMonth() + 1).padStart(2, "0");
    const fd = String(future.getDate()).padStart(2, "0");
    const nextSevenDaysEnd = new Date(`${fy}-${fm}-${fd}T23:59:59.999Z`);

    // 1. Today's Tasks
    const todayTasks = await prisma.task.findMany({
      where: {
        userId,
        dueDate: {
          gte: todayStart,
          lte: todayEnd,
        },
        isCompleted: false,
      },
      orderBy: { createdAt: "asc" },
    });

    // 2. Today's Events
    const todayEvents = await prisma.calendarEvent.findMany({
      where: {
        userId,
        startDate: { lte: todayEnd },
        endDate: { gte: todayStart },
      },
      orderBy: { startDate: "asc" },
    });

    // 3. Next 7 days tasks & events count
    const nextSevenDaysTasksCount = await prisma.task.count({
      where: {
        userId,
        dueDate: {
          gte: todayStart,
          lte: nextSevenDaysEnd,
        },
        isCompleted: false,
      },
    });

    const nextSevenDaysEventsCount = await prisma.calendarEvent.count({
      where: {
        userId,
        startDate: { lte: nextSevenDaysEnd },
        endDate: { gte: todayStart },
      },
    });

    // 4. Habits & Today's Logs
    const habits = await prisma.habit.findMany({
      where: {
        userId,
        isArchived: false,
      },
      include: {
        logs: {
          where: {
            date: {
              gte: todayStart,
              lte: todayEnd,
            },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    // 5. Clipboard Notes
    const notes = await prisma.clipboardNote.findMany({
      where: { userId },
      orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    });

    // 6. Financial Snapshot
    const accounts = await prisma.financialAccount.findMany({
      where: { userId },
    });
    const liquidBalance = accounts.reduce((acc, curr) => acc + Number(curr.balance), 0);

    const vaults = await prisma.savingsGoal.findMany({
      where: { userId },
    });
    const totalVaultSavings = vaults.reduce((acc, curr) => acc + Number(curr.currentAmount), 0);

    const debts = await prisma.debtRecord.findMany({
      where: {
        userId,
        status: { not: "SETTLED" },
      },
    });

    let totalDena = 0;
    let totalPaona = 0;

    const toPayList: Array<{
      id: string;
      title: string;
      source: "DENA" | "MONTHLY_COST";
      amount: number;
      dueDate: string;
      isOverdue: boolean;
    }> = [];

    const toReceiveList: Array<{
      id: string;
      title: string;
      source: "PAONA" | "INFLOW";
      amount: number;
      dueDate: string;
      isOverdue: boolean;
    }> = [];

    for (const debt of debts) {
      const remaining = Number(debt.totalAmount) - Number(debt.paidAmount);
      if (debt.type === "I_OWE") {
        totalDena += remaining;
        if (debt.dueDate && debt.dueDate <= nextSevenDaysEnd) {
          const isOverdue = debt.dueDate < todayStart;
          toPayList.push({
            id: debt.id,
            title: debt.personName,
            source: "DENA",
            amount: remaining,
            dueDate: debt.dueDate.toISOString().split("T")[0],
            isOverdue,
          });
        }
      } else {
        totalPaona += remaining;
        if (debt.dueDate && debt.dueDate <= nextSevenDaysEnd) {
          const isOverdue = debt.dueDate < todayStart;
          toReceiveList.push({
            id: debt.id,
            title: debt.personName,
            source: "PAONA",
            amount: remaining,
            dueDate: debt.dueDate.toISOString().split("T")[0],
            isOverdue,
          });
        }
      }
    }

    // Monthly commitments (Recurring costs) to pay in next 7 days
    const monthlyCommitments = await prisma.monthlyCommitment.findMany({
      where: {
        userId,
        isActive: true,
      },
      include: {
        payments: true,
      },
    });

    const currentMonthYear = `${y}-${m}`;
    const todayDateNum = now.getDate();

    for (const c of monthlyCommitments) {
      const start = new Date(c.startDate);
      const end = c.endDate ? new Date(c.endDate) : null;

      // Overdue from earlier this month
      const maxDaysInCurMonth = new Date(Date.UTC(y, now.getMonth() + 1, 0)).getUTCDate();
      const actualDueDayCurMonth = Math.min(c.dueDayOfMonth, maxDaysInCurMonth);
      if (actualDueDayCurMonth < todayDateNum && now >= start && (!end || now <= end)) {
        const payment = c.payments.find((p) => p.monthYear === currentMonthYear && p.isPaid);
        if (!payment) {
          toPayList.push({
            id: `${c.id}-${currentMonthYear}`,
            title: c.title,
            source: "MONTHLY_COST",
            amount: Number(c.amount),
            dueDate: `${currentMonthYear}-${String(actualDueDayCurMonth).padStart(2, "0")}`,
            isOverdue: true,
          });
        }
      }

      // Next 7 days
      for (let offset = 0; offset <= 7; offset++) {
        const checkDate = new Date(now.getTime() + offset * 24 * 60 * 60 * 1000);
        if (checkDate < start || (end && checkDate > end)) continue;

        const cy = checkDate.getFullYear();
        const cm = checkDate.getMonth() + 1;
        const cd = checkDate.getDate();
        const monthYearStr = `${cy}-${String(cm).padStart(2, "0")}`;

        const maxDays = new Date(Date.UTC(cy, cm, 0)).getUTCDate();
        const actualDueDay = Math.min(c.dueDayOfMonth, maxDays);
        if (actualDueDay === cd) {
          const payment = c.payments.find((p) => p.monthYear === monthYearStr && p.isPaid);
          if (!payment) {
            toPayList.push({
              id: `${c.id}-${monthYearStr}`,
              title: c.title,
              source: "MONTHLY_COST",
              amount: Number(c.amount),
              dueDate: `${monthYearStr}-${String(cd).padStart(2, "0")}`,
              isOverdue: false,
            });
          }
        }
      }
    }

    // Expected inflows (to receive in next 7 days)
    const expectedInflows = await prisma.expectedInflow.findMany({
      where: {
        userId,
        isReceived: false,
      },
    });

    for (const inf of expectedInflows) {
      if (inf.inflowType === "ONE_TIME") {
        if (inf.expectedDate && inf.expectedDate <= nextSevenDaysEnd) {
          toReceiveList.push({
            id: inf.id,
            title: inf.title,
            source: "INFLOW",
            amount: Number(inf.amount),
            dueDate: inf.expectedDate.toISOString().split("T")[0],
            isOverdue: inf.expectedDate < todayStart,
          });
        }
      } else {
        // Monthly inflow
        const start = inf.startDate ? new Date(inf.startDate) : new Date(inf.createdAt);
        const end = inf.endDate ? new Date(inf.endDate) : null;
        const infDueDay = inf.dueDay || 1;

        // Overdue earlier this month
        const maxDaysCur = new Date(Date.UTC(y, now.getMonth() + 1, 0)).getUTCDate();
        const actualDueDayCur = Math.min(infDueDay, maxDaysCur);
        if (actualDueDayCur < todayDateNum && now >= start && (!end || now <= end)) {
          toReceiveList.push({
            id: `${inf.id}-${currentMonthYear}`,
            title: inf.title,
            source: "INFLOW",
            amount: Number(inf.amount),
            dueDate: `${currentMonthYear}-${String(actualDueDayCur).padStart(2, "0")}`,
            isOverdue: true,
          });
        }

        // Next 7 days
        for (let offset = 0; offset <= 7; offset++) {
          const checkDate = new Date(now.getTime() + offset * 24 * 60 * 60 * 1000);
          if (checkDate < start || (end && checkDate > end)) continue;

          const cy = checkDate.getFullYear();
          const cm = checkDate.getMonth() + 1;
          const cd = checkDate.getDate();
          const monthYearStr = `${cy}-${String(cm).padStart(2, "0")}`;

          const maxDays = new Date(Date.UTC(cy, cm, 0)).getUTCDate();
          const actualDueDay = Math.min(infDueDay, maxDays);
          if (actualDueDay === cd) {
            toReceiveList.push({
              id: `${inf.id}-${monthYearStr}`,
              title: inf.title,
              source: "INFLOW",
              amount: Number(inf.amount),
              dueDate: `${monthYearStr}-${String(cd).padStart(2, "0")}`,
              isOverdue: false,
            });
          }
        }
      }
    }

    toPayList.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    toReceiveList.sort((a, b) => a.dueDate.localeCompare(b.dueDate));

    const nextSevenDaysToPayTotal = toPayList.reduce((sum, item) => sum + item.amount, 0);
    const nextSevenDaysToReceiveTotal = toReceiveList.reduce((sum, item) => sum + item.amount, 0);
    const netAmount = liquidBalance + totalVaultSavings + totalPaona - totalDena;

    // Check if today is locked
    const todayLock = await prisma.calendarDayLock.findFirst({
      where: {
        userId,
        date: todayStart,
        isLocked: true,
      },
    });

    // Prayer settings & Today's Prayer log
    let prayerSettings = await prisma.prayerSettings.findUnique({
      where: { userId },
    });
    if (!prayerSettings) {
      prayerSettings = await prisma.prayerSettings.create({
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

    const todayPrayerLog = await prisma.prayerLog.findUnique({
      where: {
        userId_date: {
          userId,
          date: todayStart,
        },
      },
    });

    const prayers = [
      { key: "fajr", name: "Fajr", time: prayerSettings.fajr, isDone: Boolean(todayPrayerLog?.fajr) },
      { key: "dhuhr", name: "Dhuhr", time: prayerSettings.dhuhr, isDone: Boolean(todayPrayerLog?.dhuhr) },
      { key: "asr", name: "Asr", time: prayerSettings.asr, isDone: Boolean(todayPrayerLog?.asr) },
      { key: "maghrib", name: "Maghrib", time: prayerSettings.maghrib, isDone: Boolean(todayPrayerLog?.maghrib) },
      { key: "isha", name: "Isha", time: prayerSettings.isha, isDone: Boolean(todayPrayerLog?.isha) },
    ];

    res.json({
      isTodayLocked: Boolean(todayLock),
      todayDate: `${y}-${m}-${d}`,
      summary: {
        nextSevenDaysTasks: nextSevenDaysTasksCount,
        nextSevenDaysEvents: nextSevenDaysEventsCount,
      },
      schedule: [
        ...todayTasks.map((t) => ({
          id: t.id,
          type: "TASK" as const,
          title: t.title,
          time: t.dueTime || "Today",
        })),
        ...todayEvents.map((e) => ({
          id: e.id,
          type: "EVENT" as const,
          title: e.title,
          time: e.startDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        })),
      ],
      prayers,
      habits: habits.map((h) => ({
        id: h.id,
        name: h.name,
        isDone: h.logs.length > 0 && h.logs[0].status,
      })),
      notes: notes.map((n) => ({
        id: n.id,
        title: n.title,
        elements: (Array.isArray(n.elements) ? n.elements : []) as Array<{ id: string; text: string }>,
      })),
      finance: {
        hasData: accounts.length > 0 || debts.length > 0 || monthlyCommitments.length > 0 || expectedInflows.length > 0 || vaults.length > 0,
        netAmount,
        totalDena,
        totalPaona,
        nextSevenDaysToPayTotal,
        nextSevenDaysToReceiveTotal,
        toPayList,
        toReceiveList,
        upcomingDenaList: toPayList.map((item) => ({
          id: item.id,
          personName: item.title,
          type: item.source === "DENA" ? "DENA" : "MONTHLY_COST",
          amount: item.amount,
          dueDate: item.dueDate,
        })),
      },
    });
  } catch (error) {
    console.error("getCommandCenterData error:", error);
    res.status(500).json({ error: "Failed to load command center data" });
  }
};

export const completeTask = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const task = await prisma.task.findFirst({
      where: { id, userId },
    });

    if (!task) {
      res.status(404).json({ error: "Task not found" });
      return;
    }

    if (task.dueDate) {
      const dayLock = await prisma.calendarDayLock.findFirst({
        where: { userId, date: task.dueDate, isLocked: true },
      });
      if (dayLock) {
        res.status(400).json({ error: "Cannot modify tasks on a locked day" });
        return;
      }
    }

    await prisma.task.update({
      where: { id: task.id },
      data: { isCompleted: true, completedAt: new Date() },
    });

    res.json({ success: true });
  } catch (error) {
    console.error("completeTask error:", error);
    res.status(500).json({ error: "Failed to complete task" });
  }
};

export const toggleHabit = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const habit = await prisma.habit.findFirst({
      where: { id, userId },
    });

    if (!habit) {
      res.status(404).json({ error: "Habit not found" });
      return;
    }

    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    const today = new Date(`${y}-${m}-${d}T00:00:00.000Z`);

    // Check if day is locked
    const dayLock = await prisma.calendarDayLock.findFirst({
      where: { userId, date: today, isLocked: true },
    });
    if (dayLock) {
      res.status(400).json({ error: "Cannot modify habits on a locked day" });
      return;
    }

    const existingLog = await prisma.habitLog.findUnique({
      where: {
        habitId_date: {
          habitId: id,
          date: today,
        },
      },
    });

    if (existingLog) {
      await prisma.habitLog.delete({
        where: { id: existingLog.id },
      });
      res.json({ isDone: false });
    } else {
      await prisma.habitLog.create({
        data: {
          habitId: id,
          date: today,
          status: true,
        },
      });
      res.json({ isDone: true });
    }
  } catch (error) {
    console.error("toggleHabit error:", error);
    res.status(500).json({ error: "Failed to toggle habit" });
  }
};

export const togglePrayer = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    const { waqt } = req.body;

    if (!userId || !waqt) {
      res.status(400).json({ error: "Waqt is required" });
      return;
    }

    const validWaqts = ["fajr", "dhuhr", "asr", "maghrib", "isha"];
    const waqtKey = waqt.toLowerCase();
    if (!validWaqts.includes(waqtKey)) {
      res.status(400).json({ error: `Invalid waqt '${waqt}'` });
      return;
    }

    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    const today = new Date(`${y}-${m}-${d}T00:00:00.000Z`);

    // Check if day is locked
    const dayLock = await prisma.calendarDayLock.findFirst({
      where: { userId, date: today, isLocked: true },
    });
    if (dayLock) {
      res.status(400).json({ error: "Cannot modify prayers on a locked day" });
      return;
    }

    const existing = await prisma.prayerLog.findUnique({
      where: {
        userId_date: {
          userId,
          date: today,
        },
      },
    });

    if (!existing) {
      const created = await prisma.prayerLog.create({
        data: {
          userId,
          date: today,
          [waqtKey]: true,
        },
      });
      res.json({ isDone: true, waqt: waqtKey, status: created[waqtKey as keyof typeof created] });
      return;
    }

    const nextValue = !(existing as any)[waqtKey];
    await prisma.prayerLog.update({
      where: { id: existing.id },
      data: {
        [waqtKey]: nextValue,
      },
    });

    res.json({ isDone: nextValue, waqt: waqtKey });
  } catch (error) {
    console.error("togglePrayer error:", error);
    res.status(500).json({ error: "Failed to toggle prayer" });
  }
};

export const createNote = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { title } = req.body;
    const userId = req.userId;

    if (!title || !userId) {
      res.status(400).json({ error: "Title is required" });
      return;
    }

    const note = await prisma.clipboardNote.create({
      data: {
        userId,
        title: title.trim(),
        elements: [],
      },
    });

    res.status(201).json({ note });
  } catch (error) {
    console.error("createNote error:", error);
    res.status(500).json({ error: "Failed to create note" });
  }
};

export const updateNote = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { title } = req.body;
    const userId = req.userId;

    const note = await prisma.clipboardNote.updateMany({
      where: { id, userId },
      data: { title: title.trim() },
    });

    res.json({ success: true, count: note.count });
  } catch (error) {
    console.error("updateNote error:", error);
    res.status(500).json({ error: "Failed to update note" });
  }
};

export const deleteNote = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    await prisma.clipboardNote.deleteMany({
      where: { id, userId },
    });

    res.json({ success: true });
  } catch (error) {
    console.error("deleteNote error:", error);
    res.status(500).json({ error: "Failed to delete note" });
  }
};

export const addNoteElement = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { text } = req.body;
    const userId = req.userId;

    const note = await prisma.clipboardNote.findFirst({
      where: { id, userId },
    });

    if (!note) {
      res.status(404).json({ error: "Note not found" });
      return;
    }

    const elements = (Array.isArray(note.elements) ? note.elements : []) as Array<{ id: string; text: string }>;
    const newElement = {
      id: "elem_" + Date.now(),
      text: text.trim(),
    };
    elements.push(newElement);

    await prisma.clipboardNote.update({
      where: { id: note.id },
      data: { elements },
    });

    res.status(201).json({ element: newElement });
  } catch (error) {
    console.error("addNoteElement error:", error);
    res.status(500).json({ error: "Failed to add element" });
  }
};

export const deleteNoteElement = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id, elemId } = req.params;
    const userId = req.userId;

    const note = await prisma.clipboardNote.findFirst({
      where: { id, userId },
    });

    if (!note) {
      res.status(404).json({ error: "Note not found" });
      return;
    }

    const elements = (Array.isArray(note.elements) ? note.elements : []) as Array<{ id: string; text: string }>;
    const filtered = elements.filter((e) => e.id !== elemId);

    await prisma.clipboardNote.update({
      where: { id: note.id },
      data: { elements: filtered },
    });

    res.json({ success: true });
  } catch (error) {
    console.error("deleteNoteElement error:", error);
    res.status(500).json({ error: "Failed to delete element" });
  }
};
