import { Response } from "express";
import { Prisma } from "@prisma/client";
import prisma from "../lib/prisma.js";
import { AuthenticatedRequest } from "../middlewares/auth.middleware.js";

// Helper to format Date to YYYY-MM-DD in UTC
const formatDateKey = (date: Date): string => {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

// =========================================================================
// 1. GET /api/finance/overview
// =========================================================================
export const getFinanceOverview = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const now = new Date();
    const currentMonthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const selectedMonthYear = (req.query.monthYear as string) || currentMonthYear;

    const [yearStr, monthStr] = selectedMonthYear.split("-");
    const selYear = parseInt(yearStr, 10);
    const selMonth = parseInt(monthStr, 10); // 1-12

    const monthStart = new Date(Date.UTC(selYear, selMonth - 1, 1));
    const monthEnd = new Date(Date.UTC(selYear, selMonth, 0, 23, 59, 59, 999));

    // A. Accounts
    const accounts = await prisma.financialAccount.findMany({
      where: { userId },
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    });
    const totalLiquidBalance = accounts.reduce((acc, curr) => acc + Number(curr.balance), 0);

    // B. Debts (Dena & Paona)
    const debts = await prisma.debtRecord.findMany({
      where: { userId },
      include: {
        paymentLogs: {
          orderBy: { date: "desc" },
        },
      },
      orderBy: [{ status: "asc" }, { createdAt: "asc" }],
    });

    let totalDena = 0;
    let totalDenaPaid = 0;
    let totalPaona = 0;
    let totalPaonaPaid = 0;

    const denaList: any[] = [];
    const paonaList: any[] = [];

    for (const d of debts) {
      const total = Number(d.totalAmount);
      const paid = Number(d.paidAmount);
      const remaining = Math.max(0, total - paid);

      const formatted = {
        id: d.id,
        type: d.type,
        personName: d.personName,
        contactNumber: d.contactNumber,
        totalAmount: total,
        paidAmount: paid,
        remainingAmount: remaining,
        dueDate: d.dueDate ? formatDateKey(new Date(d.dueDate)) : null,
        status: d.status,
        notes: d.notes,
        createdAt: formatDateKey(new Date(d.createdAt)),
        paymentLogs: d.paymentLogs.map((p) => ({
          id: p.id,
          amount: Number(p.amount),
          date: formatDateKey(new Date(p.date)),
          accountId: p.accountId,
          notes: p.notes,
        })),
      };

      if (d.type === "I_OWE") {
        totalDena += total;
        totalDenaPaid += paid;
        denaList.push(formatted);
      } else {
        totalPaona += total;
        totalPaonaPaid += paid;
        paonaList.push(formatted);
      }
    }

    // C. Monthly Commitments for selected month
    const allCommitments = await prisma.monthlyCommitment.findMany({
      where: { userId },
      include: {
        payments: {
          where: { monthYear: selectedMonthYear },
        },
      },
      orderBy: [{ dueDayOfMonth: "asc" }, { createdAt: "asc" }],
    });

    const activeMonthlyCosts: any[] = [];
    let totalMonthlyRepeatingCosts = 0;
    let totalMonthlyRepeatingPaid = 0;
    let totalMonthlyCostDue = 0;

    for (const c of allCommitments) {
      // Check if this commitment is active in selectedMonthYear
      const start = new Date(c.startDate);
      const end = c.endDate ? new Date(c.endDate) : null;

      const isStarted = monthEnd >= start;
      const isNotEnded = !end || monthStart <= end;

      if (isStarted && isNotEnded && c.isActive) {
        const payment = c.payments[0] || null;
        const isPaid = Boolean(payment?.isPaid);
        const amount = Number(c.amount);
        const amountPaid = payment ? Number(payment.amountPaid) : (isPaid ? amount : 0);

        totalMonthlyRepeatingCosts += amount;
        if (isPaid) {
          totalMonthlyRepeatingPaid += amountPaid;
        } else {
          totalMonthlyCostDue += amount;
        }

        // Formatted due date for the selected month
        const maxDaysInMonth = new Date(Date.UTC(selYear, selMonth, 0)).getUTCDate();
        const actualDueDay = Math.min(c.dueDayOfMonth, maxDaysInMonth);
        const dueDateStr = `${selYear}-${String(selMonth).padStart(2, "0")}-${String(actualDueDay).padStart(2, "0")}`;

        activeMonthlyCosts.push({
          id: c.id,
          title: c.title,
          amount,
          dueDayOfMonth: c.dueDayOfMonth,
          dueDateStr,
          startDate: formatDateKey(start),
          endDate: end ? formatDateKey(end) : null,
          category: c.category,
          defaultAccountId: c.defaultAccountId,
          notes: c.notes,
          isPaid,
          paidDate: payment?.paidDate ? formatDateKey(new Date(payment.paidDate)) : null,
          paidFromAccountId: payment?.paidFromAccountId || null,
          amountPaid,
          costType: "MONTHLY_REPEATING",
          isQuickCost: false,
        });
      }
    }

    // Direct logged expenses (Daily Costs from Quick Cost) for selected month
    const quickExpenses = await prisma.financialTransaction.findMany({
      where: {
        userId,
        type: "EXPENSE",
        date: {
          gte: monthStart,
          lte: monthEnd,
        },
      },
      include: {
        fromAccount: { select: { id: true, name: true } },
      },
      orderBy: { date: "asc" },
    });

    let totalDailyCosts = 0;
    for (const exp of quickExpenses) {
      const amount = Number(exp.amount);
      totalDailyCosts += amount;

      activeMonthlyCosts.push({
        id: exp.id,
        title: exp.notes || exp.category || "Daily Cost",
        amount,
        dueDayOfMonth: exp.date.getDate(),
        dueDateStr: formatDateKey(exp.date),
        startDate: formatDateKey(exp.date),
        endDate: null,
        category: exp.category || "Daily Expense",
        defaultAccountId: exp.fromAccountId,
        notes: exp.notes,
        isPaid: true,
        paidDate: formatDateKey(exp.date),
        paidFromAccountId: exp.fromAccountId,
        paidFromAccountName: exp.fromAccount?.name || null,
        amountPaid: amount,
        costType: "DAILY_COST",
        isQuickCost: true,
      });
    }

    // Sort activeMonthlyCosts by oldest first
    activeMonthlyCosts.sort((a, b) => {
      const dateA = a.dueDateStr || a.startDate || "";
      const dateB = b.dueDateStr || b.startDate || "";
      return dateA.localeCompare(dateB);
    });

    const totalMonthlyCostPaid = totalMonthlyRepeatingPaid + totalDailyCosts;
    const totalMonthCosts = totalMonthlyRepeatingCosts + totalDailyCosts;

    // D. Expected Inflows for selected month
    const allInflows = await prisma.expectedInflow.findMany({
      where: { userId },
      orderBy: [{ isReceived: "asc" }, { expectedDate: "asc" }, { createdAt: "desc" }],
    });

    const activeInflows: any[] = [];
    let totalExpectedInflows = 0;
    let totalCertainInflows = 0;

    for (const inf of allInflows) {
      const amount = Number(inf.amount);
      if (inf.inflowType === "MONTHLY") {
        const start = inf.startDate ? new Date(inf.startDate) : new Date(inf.createdAt);
        const end = inf.endDate ? new Date(inf.endDate) : null;

        const isStarted = monthEnd >= start;
        const isNotEnded = !end || monthStart <= end;

        if (isStarted && isNotEnded) {
          const maxDays = new Date(Date.UTC(selYear, selMonth, 0)).getUTCDate();
          const day = Math.min(inf.dueDay || 1, maxDays);
          const dateStr = `${selYear}-${String(selMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

          activeInflows.push({
            id: inf.id,
            title: inf.title,
            amount,
            inflowType: inf.inflowType,
            dueDay: inf.dueDay,
            expectedDateStr: dateStr,
            confidence: inf.confidence,
            isReceived: inf.isReceived,
            receivedDate: inf.receivedDate ? formatDateKey(new Date(inf.receivedDate)) : null,
            depositToAccountId: inf.depositToAccountId,
            notes: inf.notes,
          });

          if (!inf.isReceived) {
            totalExpectedInflows += amount;
            if (inf.confidence === "CERTAIN") totalCertainInflows += amount;
          }
        }
      } else {
        // ONE_TIME
        const expDate = inf.expectedDate ? new Date(inf.expectedDate) : null;
        const inThisMonth = expDate ? (expDate >= monthStart && expDate <= monthEnd) : true;

        if (inThisMonth || !inf.isReceived) {
          activeInflows.push({
            id: inf.id,
            title: inf.title,
            amount,
            inflowType: inf.inflowType,
            expectedDateStr: expDate ? formatDateKey(expDate) : null,
            confidence: inf.confidence,
            isReceived: inf.isReceived,
            receivedDate: inf.receivedDate ? formatDateKey(new Date(inf.receivedDate)) : null,
            depositToAccountId: inf.depositToAccountId,
            notes: inf.notes,
          });

          if (!inf.isReceived) {
            totalExpectedInflows += amount;
            if (inf.confidence === "CERTAIN") totalCertainInflows += amount;
          }
        }
      }
    }

    // Direct logged incomes (from Quick Add Money) for selected month
    const quickIncomes = await prisma.financialTransaction.findMany({
      where: {
        userId,
        type: "INCOME",
        date: {
          gte: monthStart,
          lte: monthEnd,
        },
      },
      include: {
        toAccount: { select: { id: true, name: true } },
      },
      orderBy: { date: "desc" },
    });

    for (const inc of quickIncomes) {
      const amount = Number(inc.amount);
      totalExpectedInflows += amount;
      totalCertainInflows += amount;

      activeInflows.push({
        id: inc.id,
        title: inc.notes || inc.category || "Quick Income",
        amount,
        inflowType: "ONE_TIME",
        dueDay: inc.date.getDate(),
        expectedDateStr: formatDateKey(inc.date),
        confidence: "CERTAIN",
        isReceived: true,
        receivedDate: formatDateKey(inc.date),
        depositToAccountId: inc.toAccountId,
        depositToAccountName: inc.toAccount?.name || null,
        notes: inc.notes,
        isQuickInflow: true,
      });
    }

    // E. Savings Vaults
    const vaults = await prisma.savingsGoal.findMany({
      where: { userId },
      include: {
        vaultLogs: {
          orderBy: { date: "desc" },
        },
      },
      orderBy: [{ isCompleted: "asc" }, { createdAt: "asc" }],
    });

    let totalVaultSavings = 0;
    const formattedVaults = vaults.map((v) => {
      const target = Number(v.targetAmount);
      const current = Number(v.currentAmount);
      totalVaultSavings += current;
      const progressPercent = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;

      return {
        id: v.id,
        title: v.title,
        targetAmount: target,
        currentAmount: current,
        monthlyTarget: v.monthlyAmount ? Number(v.monthlyAmount) : 0,
        targetDate: v.targetDate ? formatDateKey(new Date(v.targetDate)) : null,
        progressPercent,
        remainingAmount: Math.max(0, target - current),
        color: v.color || "#f4f4f6",
        isCompleted: v.isCompleted,
        notes: v.notes,
        createdAt: formatDateKey(new Date(v.createdAt)),
        logs: v.vaultLogs.map((l) => ({
          id: l.id,
          type: l.type,
          amount: Number(l.amount),
          sourceAccountId: l.sourceAccountId,
          date: formatDateKey(new Date(l.date)),
          notes: l.notes,
        })),
      };
    });

    // Net Summary Calculations
    const remainingDena = Math.max(0, totalDena - totalDenaPaid);
    const remainingPaona = Math.max(0, totalPaona - totalPaonaPaid);
    const safeToSpend = totalLiquidBalance - totalMonthlyCostDue - remainingDena + totalCertainInflows;

    res.json({
      selectedMonthYear,
      summary: {
        totalLiquidBalance,
        totalVaultSavings,
        totalDena,
        totalDenaPaid,
        remainingDena,
        totalPaona,
        totalPaonaPaid,
        remainingPaona,
        totalMonthlyRepeatingCosts,
        totalMonthlyRepeatingPaid,
        totalMonthlyCostDue,
        totalDailyCosts,
        totalMonthCosts,
        totalMonthlyCostPaid,
        totalExpectedInflows,
        totalCertainInflows,
        safeToSpend,
      },
      accounts: accounts.map((a) => ({
        id: a.id,
        name: a.name,
        accountType: a.accountType,
        accountNumber: a.accountNumber,
        balance: Number(a.balance),
        color: a.color,
        isDefault: a.isDefault,
      })),
      denaList,
      paonaList,
      monthlyCosts: activeMonthlyCosts,
      expectedInflows: activeInflows,
      savingsVaults: formattedVaults,
    });
  } catch (error) {
    console.error("getFinanceOverview error:", error);
    res.status(500).json({ error: "Failed to load finance overview" });
  }
};

// =========================================================================
// 2. ACCOUNTS CRUD & TRANSFERS
// =========================================================================
export const createAccount = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    const { name, accountType, accountNumber, balance, color, isDefault } = req.body;

    if (!userId || !name) {
      res.status(400).json({ error: "Account name is required" });
      return;
    }

    if (balance !== undefined && Number(balance) < 0) {
      res.status(400).json({ error: "Account balance cannot be negative" });
      return;
    }

    if (isDefault) {
      await prisma.financialAccount.updateMany({
        where: { userId },
        data: { isDefault: false },
      });
    }

    const account = await prisma.financialAccount.create({
      data: {
        userId,
        name: name.trim(),
        accountType: accountType || "CASH",
        accountNumber: accountNumber?.trim() || null,
        balance: new Prisma.Decimal(balance || 0),
        color: color || "#f4f4f6",
        isDefault: Boolean(isDefault),
      },
    });

    res.status(201).json({ account });
  } catch (error) {
    console.error("createAccount error:", error);
    res.status(500).json({ error: "Failed to create account" });
  }
};

export const updateAccount = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    const { id } = req.params;
    const { name, accountType, accountNumber, balance, color, isDefault } = req.body;

    const existing = await prisma.financialAccount.findFirst({
      where: { id, userId },
    });
    if (!existing) {
      res.status(404).json({ error: "Account not found" });
      return;
    }

    if (balance !== undefined && Number(balance) < 0) {
      res.status(400).json({ error: "Account balance cannot be negative" });
      return;
    }

    if (isDefault) {
      await prisma.financialAccount.updateMany({
        where: { userId, id: { not: id } },
        data: { isDefault: false },
      });
    }

    const updated = await prisma.financialAccount.update({
      where: { id },
      data: {
        name: name ? name.trim() : existing.name,
        accountType: accountType || existing.accountType,
        accountNumber: accountNumber !== undefined ? accountNumber?.trim() || null : existing.accountNumber,
        balance: balance !== undefined ? new Prisma.Decimal(balance) : existing.balance,
        color: color || existing.color,
        isDefault: isDefault !== undefined ? Boolean(isDefault) : existing.isDefault,
      },
    });

    res.json({ account: updated });
  } catch (error) {
    console.error("updateAccount error:", error);
    res.status(500).json({ error: "Failed to update account" });
  }
};

export const deleteAccount = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    const existing = await prisma.financialAccount.findFirst({
      where: { id, userId },
    });
    if (!existing) {
      res.status(404).json({ error: "Account not found" });
      return;
    }

    await prisma.financialAccount.delete({
      where: { id },
    });

    res.json({ success: true });
  } catch (error) {
    console.error("deleteAccount error:", error);
    res.status(500).json({ error: "Failed to delete account" });
  }
};

export const transferFunds = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    const { fromAccountId, toAccountId, amount, fee, notes } = req.body;

    const numAmount = Number(amount);
    const numFee = Number(fee || 0);

    if (!userId || !fromAccountId || !toAccountId || isNaN(numAmount) || numAmount <= 0) {
      res.status(400).json({ error: "Valid accounts and transfer amount are required" });
      return;
    }

    if (fromAccountId === toAccountId) {
      res.status(400).json({ error: "Source and destination accounts must be different" });
      return;
    }

    const fromAcc = await prisma.financialAccount.findFirst({ where: { id: fromAccountId, userId } });
    const toAcc = await prisma.financialAccount.findFirst({ where: { id: toAccountId, userId } });

    if (!fromAcc || !toAcc) {
      res.status(404).json({ error: "One or both accounts not found" });
      return;
    }

    const totalDeduction = numAmount + numFee;
    if (Number(fromAcc.balance) < totalDeduction) {
      res.status(400).json({ error: `Insufficient funds in ${fromAcc.name}` });
      return;
    }

    await prisma.$transaction([
      prisma.financialAccount.update({
        where: { id: fromAccountId },
        data: { balance: { decrement: totalDeduction } },
      }),
      prisma.financialAccount.update({
        where: { id: toAccountId },
        data: { balance: { increment: numAmount } },
      }),
      prisma.financialTransaction.create({
        data: {
          userId,
          type: "TRANSFER",
          amount: new Prisma.Decimal(numAmount),
          fee: new Prisma.Decimal(numFee),
          fromAccountId,
          toAccountId,
          category: "Transfer",
          date: new Date(),
          notes: notes?.trim() || `Transfer from ${fromAcc.name} to ${toAcc.name}`,
        },
      }),
    ]);

    res.json({ success: true });
  } catch (error) {
    console.error("transferFunds error:", error);
    res.status(500).json({ error: "Failed to execute transfer" });
  }
};

export const createQuickTransaction = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    const { type, amount, title, accountId } = req.body;

    const numAmount = Number(amount);
    if (!userId || !type || isNaN(numAmount) || numAmount <= 0 || !title || !accountId) {
      res.status(400).json({ error: "Type, valid amount, title, and account are required" });
      return;
    }

    const account = await prisma.financialAccount.findFirst({
      where: { id: accountId, userId },
    });
    if (!account) {
      res.status(404).json({ error: "Account not found" });
      return;
    }

    const now = new Date();

    if (type === "EXPENSE") {
      const currentBalance = Number(account.balance);
      if (currentBalance < numAmount) {
        res.status(400).json({
          error: `Insufficient balance in ${account.name} (৳${currentBalance}). Account cannot go negative.`,
        });
        return;
      }

      await prisma.$transaction([
        prisma.financialAccount.update({
          where: { id: accountId },
          data: { balance: { decrement: numAmount } },
        }),
        prisma.financialTransaction.create({
          data: {
            userId,
            type: "EXPENSE",
            amount: new Prisma.Decimal(numAmount),
            fromAccountId: accountId,
            category: title.trim(),
            date: now,
            notes: title.trim(),
          },
        }),
      ]);
    } else {
      // INCOME
      await prisma.$transaction([
        prisma.financialAccount.update({
          where: { id: accountId },
          data: { balance: { increment: numAmount } },
        }),
        prisma.financialTransaction.create({
          data: {
            userId,
            type: "INCOME",
            amount: new Prisma.Decimal(numAmount),
            toAccountId: accountId,
            category: title.trim(),
            date: now,
            notes: title.trim(),
          },
        }),
      ]);
    }

    res.json({ success: true });
  } catch (error) {
    console.error("createQuickTransaction error:", error);
    res.status(500).json({ error: "Failed to record quick transaction" });
  }
};

export const deleteQuickTransaction = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const tx = await prisma.financialTransaction.findFirst({
      where: { id, userId },
    });

    if (!tx) {
      res.status(404).json({ error: "Transaction not found" });
      return;
    }

    const amount = Number(tx.amount);

    if (tx.type === "EXPENSE" && tx.fromAccountId) {
      await prisma.$transaction([
        prisma.financialAccount.update({
          where: { id: tx.fromAccountId },
          data: { balance: { increment: amount } },
        }),
        prisma.financialTransaction.delete({
          where: { id },
        }),
      ]);
    } else if (tx.type === "INCOME" && tx.toAccountId) {
      const acc = await prisma.financialAccount.findFirst({
        where: { id: tx.toAccountId, userId },
      });
      if (acc && Number(acc.balance) < amount) {
        res.status(400).json({
          error: `Cannot delete income: ${acc.name} balance (৳${acc.balance}) is less than ৳${amount} and would go negative.`,
        });
        return;
      }

      await prisma.$transaction([
        prisma.financialAccount.update({
          where: { id: tx.toAccountId },
          data: { balance: { decrement: amount } },
        }),
        prisma.financialTransaction.delete({
          where: { id },
        }),
      ]);
    } else {
      await prisma.financialTransaction.delete({
        where: { id },
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error("deleteQuickTransaction error:", error);
    res.status(500).json({ error: "Failed to delete quick transaction" });
  }
};

// =========================================================================
// 3. DENA & PAONA (DEBTS) CRUD & PAYMENTS
// =========================================================================
export const createDebt = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    const { type, personName, contactNumber, totalAmount, dueDate, notes } = req.body;

    if (!userId || !type || !personName || !totalAmount || !dueDate) {
      res.status(400).json({ error: "Type, person name, total amount, and due date are required" });
      return;
    }

    const debt = await prisma.debtRecord.create({
      data: {
        userId,
        type: type === "OWES_ME" ? "OWES_ME" : "I_OWE",
        personName: personName.trim(),
        contactNumber: contactNumber?.trim() || null,
        totalAmount: new Prisma.Decimal(totalAmount),
        dueDate: new Date(`${dueDate}T00:00:00.000Z`),
        notes: notes?.trim() || null,
        status: "PENDING",
      },
    });

    res.status(201).json({ debt });
  } catch (error) {
    console.error("createDebt error:", error);
    res.status(500).json({ error: "Failed to create debt record" });
  }
};

export const updateDebt = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    const { id } = req.params;
    const { type, personName, contactNumber, totalAmount, dueDate, notes, status } = req.body;

    if (dueDate !== undefined && !dueDate) {
      res.status(400).json({ error: "Due date is required" });
      return;
    }

    const existing = await prisma.debtRecord.findFirst({
      where: { id, userId },
    });
    if (!existing) {
      res.status(404).json({ error: "Debt record not found" });
      return;
    }

    const updated = await prisma.debtRecord.update({
      where: { id },
      data: {
        type: type ? (type === "OWES_ME" ? "OWES_ME" : "I_OWE") : existing.type,
        personName: personName ? personName.trim() : existing.personName,
        contactNumber: contactNumber !== undefined ? contactNumber?.trim() || null : existing.contactNumber,
        totalAmount: totalAmount ? new Prisma.Decimal(totalAmount) : existing.totalAmount,
        dueDate: dueDate ? new Date(`${dueDate}T00:00:00.000Z`) : existing.dueDate,
        notes: notes !== undefined ? notes?.trim() || null : existing.notes,
        status: status || existing.status,
      },
    });

    res.json({ debt: updated });
  } catch (error) {
    console.error("updateDebt error:", error);
    res.status(500).json({ error: "Failed to update debt record" });
  }
};

export const deleteDebt = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    const existing = await prisma.debtRecord.findFirst({
      where: { id, userId },
    });
    if (!existing) {
      res.status(404).json({ error: "Debt record not found" });
      return;
    }

    await prisma.debtRecord.delete({
      where: { id },
    });

    res.json({ success: true });
  } catch (error) {
    console.error("deleteDebt error:", error);
    res.status(500).json({ error: "Failed to delete debt record" });
  }
};

export const recordDebtPayment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    const { id } = req.params;
    const { amount, date, accountId, notes } = req.body;

    const numAmount = Number(amount);
    if (!userId || isNaN(numAmount) || numAmount <= 0) {
      res.status(400).json({ error: "Valid payment amount is required" });
      return;
    }

    const debt = await prisma.debtRecord.findFirst({
      where: { id, userId },
    });
    if (!debt) {
      res.status(404).json({ error: "Debt record not found" });
      return;
    }

    const payDate = date ? new Date(`${date}T00:00:00.000Z`) : new Date();
    const newPaidTotal = Number(debt.paidAmount) + numAmount;
    const total = Number(debt.totalAmount);
    const newStatus = newPaidTotal >= total ? "SETTLED" : "PARTIAL";

    const operations: any[] = [
      prisma.debtPaymentLog.create({
        data: {
          debtId: id,
          amount: new Prisma.Decimal(numAmount),
          date: payDate,
          accountId: accountId || null,
          notes: notes?.trim() || null,
        },
      }),
      prisma.debtRecord.update({
        where: { id },
        data: {
          paidAmount: new Prisma.Decimal(newPaidTotal),
          status: newStatus,
        },
      }),
    ];

    if (accountId) {
      const acc = await prisma.financialAccount.findFirst({ where: { id: accountId, userId } });
      if (acc) {
        if (debt.type === "I_OWE") {
          const currentBal = Number(acc.balance);
          if (currentBal < numAmount) {
            res.status(400).json({
              error: `Insufficient balance in ${acc.name} (৳${currentBal}). Account cannot go negative.`,
            });
            return;
          }
          // Paying someone else: balance decreases
          operations.push(
            prisma.financialAccount.update({
              where: { id: accountId },
              data: { balance: { decrement: numAmount } },
            }),
            prisma.financialTransaction.create({
              data: {
                userId,
                type: "EXPENSE",
                amount: new Prisma.Decimal(numAmount),
                fromAccountId: accountId,
                category: "Debt Payment",
                date: payDate,
                linkedDebtId: id,
                notes: `Repaid debt to ${debt.personName}`,
              },
            })
          );
        } else {
          // Collecting from someone: balance increases
          operations.push(
            prisma.financialAccount.update({
              where: { id: accountId },
              data: { balance: { increment: numAmount } },
            }),
            prisma.financialTransaction.create({
              data: {
                userId,
                type: "INCOME",
                amount: new Prisma.Decimal(numAmount),
                toAccountId: accountId,
                category: "Debt Collection",
                date: payDate,
                linkedDebtId: id,
                notes: `Collected receivable from ${debt.personName}`,
              },
            })
          );
        }
      }
    }

    await prisma.$transaction(operations);

    res.json({ success: true, paidAmount: newPaidTotal, status: newStatus });
  } catch (error) {
    console.error("recordDebtPayment error:", error);
    res.status(500).json({ error: "Failed to record payment" });
  }
};

export const deleteDebtPaymentLog = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    const { id, paymentId } = req.params;

    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const debt = await prisma.debtRecord.findFirst({
      where: { id, userId },
      include: { paymentLogs: true },
    });
    if (!debt) {
      res.status(404).json({ error: "Debt record not found" });
      return;
    }

    const paymentLog = debt.paymentLogs.find((p) => p.id === paymentId);
    if (!paymentLog) {
      res.status(404).json({ error: "Payment log not found" });
      return;
    }

    const payAmount = Number(paymentLog.amount);
    const newPaidTotal = Math.max(0, Number(debt.paidAmount) - payAmount);
    const newStatus =
      newPaidTotal <= 0
        ? "PENDING"
        : newPaidTotal >= Number(debt.totalAmount)
        ? "SETTLED"
        : "PARTIAL";

    const operations: any[] = [
      prisma.debtPaymentLog.delete({
        where: { id: paymentId },
      }),
      prisma.debtRecord.update({
        where: { id },
        data: {
          paidAmount: new Prisma.Decimal(newPaidTotal),
          status: newStatus,
        },
      }),
    ];

    if (paymentLog.accountId) {
      if (debt.type === "I_OWE") {
        // Was paid out: refund/increment balance
        operations.push(
          prisma.financialAccount.update({
            where: { id: paymentLog.accountId },
            data: { balance: { increment: payAmount } },
          })
        );
      } else {
        // Was received: decrement balance
        operations.push(
          prisma.financialAccount.update({
            where: { id: paymentLog.accountId },
            data: { balance: { decrement: payAmount } },
          })
        );
      }

      // Delete matching financial transaction
      operations.push(
        prisma.financialTransaction.deleteMany({
          where: {
            userId,
            linkedDebtId: id,
            amount: new Prisma.Decimal(payAmount),
            date: paymentLog.date,
          },
        })
      );
    }

    await prisma.$transaction(operations);

    res.json({ success: true, paidAmount: newPaidTotal, status: newStatus });
  } catch (error) {
    console.error("deleteDebtPaymentLog error:", error);
    res.status(500).json({ error: "Failed to delete debt payment log" });
  }
};

// =========================================================================
// 4. MONTHLY COMMITMENTS & PER-MONTH SETTLEMENT
// =========================================================================
export const createMonthlyCommitment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    const { title, amount, dueDayOfMonth, startDate, endDate, category, defaultAccountId, notes } = req.body;

    if (!userId || !title || !amount || !dueDayOfMonth || !startDate) {
      res.status(400).json({ error: "Title, amount, due day, and start date are required" });
      return;
    }

    const commitment = await prisma.monthlyCommitment.create({
      data: {
        userId,
        title: title.trim(),
        amount: new Prisma.Decimal(amount),
        dueDayOfMonth: Math.min(31, Math.max(1, parseInt(dueDayOfMonth, 10))),
        startDate: new Date(`${startDate}T00:00:00.000Z`),
        endDate: endDate ? new Date(`${endDate}T00:00:00.000Z`) : null,
        category: category?.trim() || "OTHER",
        defaultAccountId: defaultAccountId || null,
        notes: notes?.trim() || null,
        isActive: true,
      },
    });

    res.status(201).json({ commitment });
  } catch (error) {
    console.error("createMonthlyCommitment error:", error);
    res.status(500).json({ error: "Failed to create monthly commitment" });
  }
};

export const updateMonthlyCommitment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    const { id } = req.params;
    const { title, amount, dueDayOfMonth, startDate, endDate, category, defaultAccountId, notes, isActive } = req.body;

    const existing = await prisma.monthlyCommitment.findFirst({
      where: { id, userId },
    });
    if (!existing) {
      res.status(404).json({ error: "Commitment not found" });
      return;
    }

    const updated = await prisma.monthlyCommitment.update({
      where: { id },
      data: {
        title: title ? title.trim() : existing.title,
        amount: amount !== undefined ? new Prisma.Decimal(amount) : existing.amount,
        dueDayOfMonth: dueDayOfMonth !== undefined ? Math.min(31, Math.max(1, parseInt(dueDayOfMonth, 10))) : existing.dueDayOfMonth,
        startDate: startDate ? new Date(`${startDate}T00:00:00.000Z`) : existing.startDate,
        endDate: endDate !== undefined ? (endDate ? new Date(`${endDate}T00:00:00.000Z`) : null) : existing.endDate,
        category: category ? category.trim() : existing.category,
        defaultAccountId: defaultAccountId !== undefined ? defaultAccountId : existing.defaultAccountId,
        notes: notes !== undefined ? notes?.trim() || null : existing.notes,
        isActive: isActive !== undefined ? Boolean(isActive) : existing.isActive,
      },
    });

    res.json({ commitment: updated });
  } catch (error) {
    console.error("updateMonthlyCommitment error:", error);
    res.status(500).json({ error: "Failed to update monthly commitment" });
  }
};

export const deleteMonthlyCommitment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    const existing = await prisma.monthlyCommitment.findFirst({
      where: { id, userId },
    });
    if (!existing) {
      res.status(404).json({ error: "Commitment not found" });
      return;
    }

    await prisma.monthlyCommitment.delete({
      where: { id },
    });

    res.json({ success: true });
  } catch (error) {
    console.error("deleteMonthlyCommitment error:", error);
    res.status(500).json({ error: "Failed to delete monthly commitment" });
  }
};

export const toggleMonthlyCostPayment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    const { id } = req.params; // commitmentId
    const { monthYear, isPaid, accountId, amountPaid, notes } = req.body;

    if (!userId || !monthYear) {
      res.status(400).json({ error: "MonthYear (YYYY-MM) is required" });
      return;
    }

    const commitment = await prisma.monthlyCommitment.findFirst({
      where: { id, userId },
    });
    if (!commitment) {
      res.status(404).json({ error: "Commitment not found" });
      return;
    }

    const payAmount = amountPaid ? Number(amountPaid) : Number(commitment.amount);
    const existingPayment = await prisma.monthlyCostPayment.findUnique({
      where: {
        commitmentId_monthYear: {
          commitmentId: id,
          monthYear,
        },
      },
    });

    const targetIsPaid = isPaid !== undefined ? Boolean(isPaid) : !(existingPayment?.isPaid);

    if (!targetIsPaid) {
      // Revert payment
      const ops: any[] = [];
      if (existingPayment?.paidFromAccountId && existingPayment.isPaid) {
        // Refund back to account
        ops.push(
          prisma.financialAccount.update({
            where: { id: existingPayment.paidFromAccountId },
            data: { balance: { increment: Number(existingPayment.amountPaid) } },
          })
        );
      }
      ops.push(
        prisma.monthlyCostPayment.deleteMany({
          where: { commitmentId: id, monthYear },
        })
      );
      await prisma.$transaction(ops);
      res.json({ isPaid: false, monthYear });
      return;
    }

    // Mark as paid
    const chosenAccountId = accountId || commitment.defaultAccountId || null;
    if (chosenAccountId) {
      const chosenAcc = await prisma.financialAccount.findFirst({
        where: { id: chosenAccountId, userId },
      });
      if (!chosenAcc) {
        res.status(404).json({ error: "Selected payment account not found" });
        return;
      }
      const currentBal = Number(chosenAcc.balance);
      if (currentBal < payAmount) {
        res.status(400).json({
          error: `Insufficient balance in ${chosenAcc.name} (৳${currentBal}). Account cannot go negative.`,
        });
        return;
      }
    }

    const ops: any[] = [
      prisma.monthlyCostPayment.upsert({
        where: {
          commitmentId_monthYear: { commitmentId: id, monthYear },
        },
        create: {
          commitmentId: id,
          monthYear,
          isPaid: true,
          paidDate: new Date(),
          amountPaid: new Prisma.Decimal(payAmount),
          paidFromAccountId: chosenAccountId,
          notes: notes?.trim() || null,
        },
        update: {
          isPaid: true,
          paidDate: new Date(),
          amountPaid: new Prisma.Decimal(payAmount),
          paidFromAccountId: chosenAccountId,
          notes: notes?.trim() || null,
        },
      }),
    ];

    if (chosenAccountId) {
      ops.push(
        prisma.financialAccount.update({
          where: { id: chosenAccountId },
          data: { balance: { decrement: payAmount } },
        }),
        prisma.financialTransaction.create({
          data: {
            userId,
            type: "EXPENSE",
            amount: new Prisma.Decimal(payAmount),
            fromAccountId: chosenAccountId,
            category: commitment.category || "Monthly Cost",
            date: new Date(),
            notes: `Paid ${commitment.title} for ${monthYear}`,
          },
        })
      );
    }

    await prisma.$transaction(ops);
    res.json({ isPaid: true, monthYear, amountPaid: payAmount });
  } catch (error) {
    console.error("toggleMonthlyCostPayment error:", error);
    res.status(500).json({ error: "Failed to toggle monthly cost payment" });
  }
};

// =========================================================================
// 5. EXPECTED INFLOWS
// =========================================================================
export const createExpectedInflow = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    const { title, amount, inflowType, dueDay, startDate, endDate, expectedDate, confidence, notes } = req.body;

    if (!userId || !title || !amount) {
      res.status(400).json({ error: "Title and amount are required" });
      return;
    }

    const type = inflowType === "MONTHLY" ? "MONTHLY" : "ONE_TIME";

    const inflow = await prisma.expectedInflow.create({
      data: {
        userId,
        title: title.trim(),
        amount: new Prisma.Decimal(amount),
        inflowType: type,
        dueDay: dueDay ? Math.min(31, Math.max(1, parseInt(dueDay, 10))) : null,
        startDate: startDate ? new Date(`${startDate}T00:00:00.000Z`) : null,
        endDate: endDate ? new Date(`${endDate}T00:00:00.000Z`) : null,
        expectedDate: expectedDate ? new Date(`${expectedDate}T00:00:00.000Z`) : null,
        confidence: confidence || "PROBABLE",
        notes: notes?.trim() || null,
      },
    });

    res.status(201).json({ inflow });
  } catch (error) {
    console.error("createExpectedInflow error:", error);
    res.status(500).json({ error: "Failed to create expected inflow" });
  }
};

export const updateExpectedInflow = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    const { id } = req.params;
    const { title, amount, inflowType, dueDay, startDate, endDate, expectedDate, confidence, notes } = req.body;

    const existing = await prisma.expectedInflow.findFirst({
      where: { id, userId },
    });
    if (!existing) {
      res.status(404).json({ error: "Inflow not found" });
      return;
    }

    const updated = await prisma.expectedInflow.update({
      where: { id },
      data: {
        title: title ? title.trim() : existing.title,
        amount: amount !== undefined ? new Prisma.Decimal(amount) : existing.amount,
        inflowType: inflowType ? (inflowType === "MONTHLY" ? "MONTHLY" : "ONE_TIME") : existing.inflowType,
        dueDay: dueDay !== undefined ? (dueDay ? Math.min(31, Math.max(1, parseInt(dueDay, 10))) : null) : existing.dueDay,
        startDate: startDate !== undefined ? (startDate ? new Date(`${startDate}T00:00:00.000Z`) : null) : existing.startDate,
        endDate: endDate !== undefined ? (endDate ? new Date(`${endDate}T00:00:00.000Z`) : null) : existing.endDate,
        expectedDate: expectedDate !== undefined ? (expectedDate ? new Date(`${expectedDate}T00:00:00.000Z`) : null) : existing.expectedDate,
        confidence: confidence || existing.confidence,
        notes: notes !== undefined ? notes?.trim() || null : existing.notes,
      },
    });

    res.json({ inflow: updated });
  } catch (error) {
    console.error("updateExpectedInflow error:", error);
    res.status(500).json({ error: "Failed to update expected inflow" });
  }
};

export const deleteExpectedInflow = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    const existing = await prisma.expectedInflow.findFirst({
      where: { id, userId },
    });
    if (!existing) {
      res.status(404).json({ error: "Inflow not found" });
      return;
    }

    await prisma.expectedInflow.delete({
      where: { id },
    });

    res.json({ success: true });
  } catch (error) {
    console.error("deleteExpectedInflow error:", error);
    res.status(500).json({ error: "Failed to delete expected inflow" });
  }
};

export const markInflowReceived = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    const { id } = req.params;
    const { accountId, receivedDate, amount } = req.body;

    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const inflow = await prisma.expectedInflow.findFirst({
      where: { id, userId },
    });
    if (!inflow) {
      res.status(404).json({ error: "Inflow not found" });
      return;
    }

    const numAmount = amount ? Number(amount) : Number(inflow.amount);
    const recDate = receivedDate ? new Date(`${receivedDate}T00:00:00.000Z`) : new Date();

    const ops: any[] = [
      prisma.expectedInflow.update({
        where: { id },
        data: {
          isReceived: true,
          receivedDate: recDate,
          depositToAccountId: accountId || null,
        },
      }),
    ];

    if (accountId) {
      ops.push(
        prisma.financialAccount.update({
          where: { id: accountId },
          data: { balance: { increment: numAmount } },
        }),
        prisma.financialTransaction.create({
          data: {
            userId,
            type: "INCOME",
            amount: new Prisma.Decimal(numAmount),
            toAccountId: accountId,
            category: "Expected Inflow",
            date: recDate,
            notes: `Received: ${inflow.title}`,
          },
        })
      );
    }

    await prisma.$transaction(ops);

    res.json({ success: true, isReceived: true });
  } catch (error) {
    console.error("markInflowReceived error:", error);
    res.status(500).json({ error: "Failed to mark inflow as received" });
  }
};

export const revertInflowReceived = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const inflow = await prisma.expectedInflow.findFirst({
      where: { id, userId },
    });
    if (!inflow) {
      res.status(404).json({ error: "Inflow not found" });
      return;
    }

    if (!inflow.isReceived) {
      res.json({ success: true, isReceived: false });
      return;
    }

    const numAmount = Number(inflow.amount);
    const ops: any[] = [
      prisma.expectedInflow.update({
        where: { id },
        data: {
          isReceived: false,
          receivedDate: null,
          depositToAccountId: null,
        },
      }),
    ];

    if (inflow.depositToAccountId) {
      ops.push(
        prisma.financialAccount.update({
          where: { id: inflow.depositToAccountId },
          data: { balance: { decrement: numAmount } },
        })
      );
      ops.push(
        prisma.financialTransaction.deleteMany({
          where: {
            userId,
            toAccountId: inflow.depositToAccountId,
            type: "INCOME",
            category: "Expected Inflow",
            amount: new Prisma.Decimal(numAmount),
          },
        })
      );
    }

    await prisma.$transaction(ops);

    res.json({ success: true, isReceived: false });
  } catch (error) {
    console.error("revertInflowReceived error:", error);
    res.status(500).json({ error: "Failed to revert expected inflow" });
  }
};

// =========================================================================
// 6. SAVINGS VAULTS (e.g. PS5)
// =========================================================================
export const createSavingsVault = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    const { title, targetAmount, targetDate, monthlyAmount, color, notes } = req.body;

    if (!userId || !title || !targetAmount) {
      res.status(400).json({ error: "Title and target amount are required" });
      return;
    }

    const vault = await prisma.savingsGoal.create({
      data: {
        userId,
        title: title.trim(),
        targetAmount: new Prisma.Decimal(targetAmount),
        currentAmount: new Prisma.Decimal(0),
        monthlyAmount: monthlyAmount ? new Prisma.Decimal(monthlyAmount) : new Prisma.Decimal(0),
        targetDate: targetDate ? new Date(`${targetDate}T00:00:00.000Z`) : null,
        color: color || "#f4f4f6",
        notes: notes?.trim() || null,
        isCompleted: false,
      },
    });

    res.status(201).json({ vault });
  } catch (error) {
    console.error("createSavingsVault error:", error);
    res.status(500).json({ error: "Failed to create savings vault" });
  }
};

export const updateSavingsVault = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    const { id } = req.params;
    const { title, targetAmount, targetDate, monthlyAmount, color, notes, isCompleted } = req.body;

    const existing = await prisma.savingsGoal.findFirst({
      where: { id, userId },
    });
    if (!existing) {
      res.status(404).json({ error: "Vault not found" });
      return;
    }

    const updated = await prisma.savingsGoal.update({
      where: { id },
      data: {
        title: title ? title.trim() : existing.title,
        targetAmount: targetAmount !== undefined ? new Prisma.Decimal(targetAmount) : existing.targetAmount,
        monthlyAmount: monthlyAmount !== undefined ? new Prisma.Decimal(monthlyAmount) : existing.monthlyAmount,
        targetDate: targetDate !== undefined ? (targetDate ? new Date(`${targetDate}T00:00:00.000Z`) : null) : existing.targetDate,
        color: color || existing.color,
        notes: notes !== undefined ? notes?.trim() || null : existing.notes,
        isCompleted: isCompleted !== undefined ? Boolean(isCompleted) : existing.isCompleted,
      },
    });

    res.json({ vault: updated });
  } catch (error) {
    console.error("updateSavingsVault error:", error);
    res.status(500).json({ error: "Failed to update savings vault" });
  }
};

export const deleteSavingsVault = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    const existing = await prisma.savingsGoal.findFirst({
      where: { id, userId },
    });
    if (!existing) {
      res.status(404).json({ error: "Vault not found" });
      return;
    }

    await prisma.savingsGoal.delete({
      where: { id },
    });

    res.json({ success: true });
  } catch (error) {
    console.error("deleteSavingsVault error:", error);
    res.status(500).json({ error: "Failed to delete savings vault" });
  }
};

export const transactVault = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    const { id } = req.params; // vaultId
    const { type, amount, sourceAccountId, notes } = req.body;

    const numAmount = Number(amount);
    if (!userId || !type || isNaN(numAmount) || numAmount <= 0) {
      res.status(400).json({ error: "Valid transaction type and amount are required" });
      return;
    }

    const vault = await prisma.savingsGoal.findFirst({
      where: { id, userId },
    });
    if (!vault) {
      res.status(404).json({ error: "Vault not found" });
      return;
    }

    const current = Number(vault.currentAmount);
    const target = Number(vault.targetAmount);

    if (type === "WITHDRAWAL" && current < numAmount) {
      res.status(400).json({ error: "Insufficient balance in vault" });
      return;
    }

    const newBalance = type === "DEPOSIT" ? current + numAmount : Math.max(0, current - numAmount);
    const isCompleted = target > 0 && newBalance >= target;

    const ops: any[] = [
      prisma.savingsVaultLog.create({
        data: {
          goalId: id,
          type: type === "DEPOSIT" ? "DEPOSIT" : "WITHDRAWAL",
          amount: new Prisma.Decimal(numAmount),
          sourceAccountId: sourceAccountId || null,
          date: new Date(),
          notes: notes?.trim() || null,
        },
      }),
      prisma.savingsGoal.update({
        where: { id },
        data: {
          currentAmount: new Prisma.Decimal(newBalance),
          isCompleted,
        },
      }),
    ];

    if (sourceAccountId) {
      const acc = await prisma.financialAccount.findFirst({ where: { id: sourceAccountId, userId } });
      if (acc) {
        if (type === "DEPOSIT") {
          const currentBal = Number(acc.balance);
          if (currentBal < numAmount) {
            res.status(400).json({
              error: `Insufficient balance in ${acc.name} (৳${currentBal}). Account cannot go negative.`,
            });
            return;
          }
          // Money leaves liquid account into Vault
          ops.push(
            prisma.financialAccount.update({
              where: { id: sourceAccountId },
              data: { balance: { decrement: numAmount } },
            }),
            prisma.financialTransaction.create({
              data: {
                userId,
                type: "TRANSFER",
                amount: new Prisma.Decimal(numAmount),
                fromAccountId: sourceAccountId,
                category: "Vault Stash",
                date: new Date(),
                linkedGoalId: id,
                notes: `Deposited into vault: ${vault.title}`,
              },
            })
          );
        } else {
          // Money withdrawn from Vault into liquid account
          ops.push(
            prisma.financialAccount.update({
              where: { id: sourceAccountId },
              data: { balance: { increment: numAmount } },
            }),
            prisma.financialTransaction.create({
              data: {
                userId,
                type: "TRANSFER",
                amount: new Prisma.Decimal(numAmount),
                toAccountId: sourceAccountId,
                category: "Vault Withdrawal",
                date: new Date(),
                linkedGoalId: id,
                notes: `Withdrawn from vault: ${vault.title}`,
              },
            })
          );
        }
      }
    }

    await prisma.$transaction(ops);

    res.json({ success: true, currentAmount: newBalance, isCompleted });
  } catch (error) {
    console.error("transactVault error:", error);
    res.status(500).json({ error: "Failed to transact with vault" });
  }
};
