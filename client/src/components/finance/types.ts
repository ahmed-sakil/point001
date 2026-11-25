import React from "react";
import { Landmark, Smartphone, Banknote, Building } from "lucide-react";

export type TabType = "overview" | "accounts" | "debts" | "monthly" | "inflows" | "vaults";

export interface AccountItem {
  id: string;
  name: string;
  accountType: "CASH" | "BKASH" | "NAGAD" | "ROCKET" | "BANK" | "OTHER";
  accountNumber?: string | null;
  balance: number;
  color?: string | null;
  isDefault: boolean;
}

export interface PaymentLog {
  id: string;
  amount: number;
  date: string;
  accountId?: string | null;
  notes?: string | null;
}

export interface DebtItem {
  id: string;
  type: "I_OWE" | "OWES_ME";
  personName: string;
  contactNumber?: string | null;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  dueDate?: string | null;
  status: "PENDING" | "PARTIAL" | "SETTLED";
  notes?: string | null;
  createdAt: string;
  paymentLogs: PaymentLog[];
}

export interface MonthlyCostItem {
  id: string;
  title: string;
  amount: number;
  dueDayOfMonth: number;
  dueDateStr: string;
  startDate: string;
  endDate?: string | null;
  category: string;
  defaultAccountId?: string | null;
  notes?: string | null;
  isPaid: boolean;
  paidDate?: string | null;
  paidFromAccountId?: string | null;
  paidFromAccountName?: string | null;
  amountPaid: number;
  costType?: "MONTHLY_REPEATING" | "DAILY_COST";
  isQuickCost?: boolean;
}

export interface ExpectedInflowItem {
  id: string;
  title: string;
  amount: number;
  inflowType: "MONTHLY" | "ONE_TIME";
  dueDay?: number | null;
  expectedDateStr?: string | null;
  confidence: "CERTAIN" | "PROBABLE" | "TENTATIVE";
  isReceived: boolean;
  receivedDate?: string | null;
  depositToAccountId?: string | null;
  depositToAccountName?: string | null;
  notes?: string | null;
  isQuickInflow?: boolean;
}

export interface VaultLogItem {
  id: string;
  type: "DEPOSIT" | "WITHDRAWAL";
  amount: number;
  sourceAccountId?: string | null;
  date: string;
  notes?: string | null;
}

export interface SavingsVaultItem {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  monthlyTarget: number;
  targetDate?: string | null;
  progressPercent: number;
  remainingAmount: number;
  color?: string | null;
  isCompleted: boolean;
  notes?: string | null;
  createdAt?: string;
  logs: VaultLogItem[];
}

export interface FinanceOverviewResponse {
  selectedMonthYear: string;
  summary: {
    totalLiquidBalance: number;
    totalVaultSavings: number;
    totalDena: number;
    totalDenaPaid: number;
    remainingDena: number;
    totalPaona: number;
    totalPaonaPaid: number;
    remainingPaona: number;
    totalMonthlyRepeatingCosts?: number;
    totalMonthlyRepeatingPaid?: number;
    totalMonthlyCostDue: number;
    totalDailyCosts?: number;
    totalMonthCosts?: number;
    totalMonthlyCostPaid: number;
    totalExpectedInflows: number;
    totalCertainInflows: number;
    safeToSpend: number;
  };
  accounts: AccountItem[];
  denaList: DebtItem[];
  paonaList: DebtItem[];
  monthlyCosts: MonthlyCostItem[];
  expectedInflows: ExpectedInflowItem[];
  savingsVaults: SavingsVaultItem[];
}

export const formatCurrency = (val: number): string => {
  return `৳ ${val.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
};

export const getMonthDisplayName = (monthYearStr: string): string => {
  const [y, m] = monthYearStr.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1, 1));
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
};

export const getAccountIcon = (type: string) => {
  switch (type) {
    case "BANK":
      return React.createElement(Landmark, { className: "w-4 h-4 text-text" });
    case "BKASH":
    case "NAGAD":
    case "ROCKET":
      return React.createElement(Smartphone, { className: "w-4 h-4 text-text" });
    case "CASH":
      return React.createElement(Banknote, { className: "w-4 h-4 text-text" });
    default:
      return React.createElement(Building, { className: "w-4 h-4 text-text" });
  }
};
