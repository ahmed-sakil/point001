import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Wallet,
  ArrowRightLeft,
  ArrowDownLeft,
  ArrowUpRight,
  Plus,
  Trash2,
  Edit3,
  Check,
  ChevronLeft,
  ChevronRight,
  PiggyBank,
  Calendar as CalendarIcon,
  X,
  Loader2,
  Building,
  Smartphone,
  Landmark,
  Banknote,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "../lib/api";
import { ActionDrawer } from "../components/ui/ActionDrawer";
import { AnimatedSlideView } from "../components/ui/AnimatedSlideView";

// =========================================================================
// TYPES
// =========================================================================
export type TabType = "overview" | "accounts" | "debts" | "monthly" | "inflows" | "vaults";

interface AccountItem {
  id: string;
  name: string;
  accountType: "CASH" | "BKASH" | "NAGAD" | "ROCKET" | "BANK" | "OTHER";
  accountNumber?: string | null;
  balance: number;
  color?: string | null;
  isDefault: boolean;
}

interface PaymentLog {
  id: string;
  amount: number;
  date: string;
  accountId?: string | null;
  notes?: string | null;
}

interface DebtItem {
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

interface MonthlyCostItem {
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

interface ExpectedInflowItem {
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

interface VaultLogItem {
  id: string;
  type: "DEPOSIT" | "WITHDRAWAL";
  amount: number;
  sourceAccountId?: string | null;
  date: string;
  notes?: string | null;
}

interface SavingsVaultItem {
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

interface FinanceOverviewResponse {
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

// Helpers
const formatCurrency = (val: number): string => {
  return `৳ ${val.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
};

const getAccountIcon = (type: string) => {
  switch (type) {
    case "BANK":
      return <Landmark className="w-4 h-4 text-text" />;
    case "BKASH":
    case "NAGAD":
    case "ROCKET":
      return <Smartphone className="w-4 h-4 text-text" />;
    case "CASH":
      return <Banknote className="w-4 h-4 text-text" />;
    default:
      return <Building className="w-4 h-4 text-text" />;
  }
};

export const FinancePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [isLoading, setIsLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);

  // Month navigation (e.g. "2026-11")
  const now = new Date();
  const currentMonthYearStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [selectedMonthYear, setSelectedMonthYear] = useState<string>(currentMonthYearStr);

  // Data States
  const [data, setData] = useState<FinanceOverviewResponse | null>(null);

  // Animation state for month navigation
  const [animKey, setAnimKey] = useState(0);
  const [slideDirection, setSlideDirection] = useState<"left" | "right">("right");

  // Quick Cost State Machine
  const [quickCostStep, setQuickCostStep] = useState<1 | 2 | 3>(1);
  const [quickCostAmount, setQuickCostAmount] = useState("");
  const [quickCostTitle, setQuickCostTitle] = useState("");
  const [quickCostAccountId, setQuickCostAccountId] = useState("");
  const quickCostSelectRef = useRef<HTMLSelectElement>(null);

  // Quick Add Money State Machine
  const [quickAddStep, setQuickAddStep] = useState<1 | 2 | 3>(1);
  const [quickAddAmount, setQuickAddAmount] = useState("");
  const [quickAddTitle, setQuickAddTitle] = useState("");
  const [quickAddAccountId, setQuickAddAccountId] = useState("");
  const quickAddSelectRef = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    if (quickCostStep === 3) {
      setTimeout(() => quickCostSelectRef.current?.focus(), 15);
    }
  }, [quickCostStep]);

  useEffect(() => {
    if (quickAddStep === 3) {
      setTimeout(() => quickAddSelectRef.current?.focus(), 15);
    }
  }, [quickAddStep]);

  // Modals
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<AccountItem | null>(null);

  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferFromId, setTransferFromId] = useState("");
  const [transferToId, setTransferToId] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [transferFee, setTransferFee] = useState("0");
  const [transferNotes, setTransferNotes] = useState("");

  const [isDebtModalOpen, setIsDebtModalOpen] = useState(false);
  const [debtModalType, setDebtModalType] = useState<"I_OWE" | "OWES_ME">("I_OWE");
  const [editingDebt, setEditingDebt] = useState<DebtItem | null>(null);

  const [isDebtPaymentModalOpen, setIsDebtPaymentModalOpen] = useState(false);
  const [activeDebtForPayment, setActiveDebtForPayment] = useState<DebtItem | null>(null);
  const [debtPayAmount, setDebtPayAmount] = useState("");
  const [debtPayAccountId, setDebtPayAccountId] = useState("");
  const [debtPayNotes, setDebtPayNotes] = useState("");

  const [isMonthlyCostModalOpen, setIsMonthlyCostModalOpen] = useState(false);
  const [editingMonthlyCost, setEditingMonthlyCost] = useState<MonthlyCostItem | null>(null);

  const [isPayMonthlyModalOpen, setIsPayMonthlyModalOpen] = useState(false);
  const [activeMonthlyCostForPay, setActiveMonthlyCostForPay] = useState<MonthlyCostItem | null>(null);
  const [monthlyPayAccountId, setMonthlyPayAccountId] = useState("");

  const [isInflowModalOpen, setIsInflowModalOpen] = useState(false);
  const [editingInflow, setEditingInflow] = useState<ExpectedInflowItem | null>(null);

  const [isReceiveInflowModalOpen, setIsReceiveInflowModalOpen] = useState(false);
  const [activeInflowForReceive, setActiveInflowForReceive] = useState<ExpectedInflowItem | null>(null);
  const [receiveAccountId, setReceiveAccountId] = useState("");

  const [isVaultModalOpen, setIsVaultModalOpen] = useState(false);
  const [editingVault, setEditingVault] = useState<SavingsVaultItem | null>(null);

  const [isVaultTransactModalOpen, setIsVaultTransactModalOpen] = useState(false);
  const [activeVaultForTransact, setActiveVaultForTransact] = useState<SavingsVaultItem | null>(null);
  const [vaultTransactType, setVaultTransactType] = useState<"DEPOSIT" | "WITHDRAWAL">("DEPOSIT");
  const [vaultTransactAmount, setVaultTransactAmount] = useState("");
  const [vaultTransactAccountId, setVaultTransactAccountId] = useState("");
  const [vaultTransactNotes, setVaultTransactNotes] = useState("");

  // Fetch Live Finance Data
  const fetchFinanceData = useCallback(async (monthYear: string) => {
    try {
      const res = await api.get<FinanceOverviewResponse>(`/finance/overview?monthYear=${monthYear}`);
      setData(res);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || error?.message || "Failed to load finance data");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFinanceData(selectedMonthYear);
  }, [fetchFinanceData, selectedMonthYear]);

  // Month navigation helpers
  const handlePrevMonth = () => {
    const [y, m] = selectedMonthYear.split("-").map(Number);
    const prevDate = new Date(Date.UTC(y, m - 2, 1));
    const newStr = `${prevDate.getUTCFullYear()}-${String(prevDate.getUTCMonth() + 1).padStart(2, "0")}`;
    setSlideDirection("left");
    setAnimKey((prev) => prev + 1);
    setSelectedMonthYear(newStr);
  };

  const handleNextMonth = () => {
    const [y, m] = selectedMonthYear.split("-").map(Number);
    const nextDate = new Date(Date.UTC(y, m, 1));
    const newStr = `${nextDate.getUTCFullYear()}-${String(nextDate.getUTCMonth() + 1).padStart(2, "0")}`;
    setSlideDirection("right");
    setAnimKey((prev) => prev + 1);
    setSelectedMonthYear(newStr);
  };

  const handleCurrentMonth = () => {
    setSlideDirection("right");
    setAnimKey((prev) => prev + 1);
    setSelectedMonthYear(currentMonthYearStr);
  };

  const getMonthDisplayName = (monthYearStr: string) => {
    const [y, m] = monthYearStr.split("-").map(Number);
    const d = new Date(Date.UTC(y, m - 1, 1));
    return d.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
  };

  // =========================================================================
  // HANDLERS: QUICK COST & QUICK ADD MONEY
  // =========================================================================
  const resetQuickCost = () => {
    setQuickCostStep(1);
    setQuickCostAmount("");
    setQuickCostTitle("");
    setQuickCostAccountId("");
  };

  const handleQuickCostStep1 = () => {
    const num = parseFloat(quickCostAmount);
    if (isNaN(num) || num <= 0) {
      toast.error("Enter a valid cost amount");
      return;
    }
    const accounts = data?.accounts || [];
    const hasAnySufficient = accounts.some((a) => a.balance >= num);
    if (accounts.length > 0 && !hasAnySufficient) {
      const maxBal = Math.max(...accounts.map((a) => a.balance), 0);
      toast.error(`No account has enough balance for ৳${num}. Max available: ৳${maxBal}`);
      return;
    }
    setQuickCostStep(2);
  };

  const handleQuickCostStep2 = () => {
    if (!quickCostTitle.trim()) {
      toast.error("Enter a title for the cost");
      return;
    }
    const num = parseFloat(quickCostAmount);
    const accounts = data?.accounts || [];
    const defaultAcc = accounts.find((a) => a.isDefault);
    let chosenAccId = "";
    if (defaultAcc && defaultAcc.balance >= num) {
      chosenAccId = defaultAcc.id;
    } else {
      const sufficientAcc = accounts.find((a) => a.balance >= num);
      chosenAccId = sufficientAcc ? sufficientAcc.id : (defaultAcc?.id || accounts[0]?.id || "");
    }
    setQuickCostAccountId(chosenAccId);
    setQuickCostStep(3);
  };

  const handleQuickCostSubmit = async () => {
    const num = parseFloat(quickCostAmount);
    if (isNaN(num) || num <= 0) {
      toast.error("Enter a valid cost amount");
      return;
    }
    const accounts = data?.accounts || [];
    const defaultAcc = accounts.find((a) => a.isDefault) || accounts[0];
    const accId = quickCostAccountId || defaultAcc?.id;
    if (!accId) {
      toast.error("Please select an account to pay from");
      return;
    }
    const chosenAcc = accounts.find((a) => a.id === accId);
    if (chosenAcc && chosenAcc.balance < num) {
      toast.error(`Insufficient balance in ${chosenAcc.name} (৳${chosenAcc.balance}). Account cannot go negative.`);
      return;
    }
    try {
      await api.post("/finance/quick-transaction", {
        type: "EXPENSE",
        amount: num,
        title: quickCostTitle.trim(),
        accountId: accId,
      });
      toast.success(`Logged ৳${num} for ${quickCostTitle.trim()}`);
      resetQuickCost();
      fetchFinanceData(selectedMonthYear);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Failed to log cost");
    }
  };

  const resetQuickAdd = () => {
    setQuickAddStep(1);
    setQuickAddAmount("");
    setQuickAddTitle("");
    setQuickAddAccountId("");
  };

  const handleQuickAddStep1 = () => {
    const num = parseFloat(quickAddAmount);
    if (isNaN(num) || num <= 0) {
      toast.error("Enter a valid money amount");
      return;
    }
    setQuickAddStep(2);
  };

  const handleQuickAddStep2 = () => {
    if (!quickAddTitle.trim()) {
      toast.error("Enter a source/title for the money");
      return;
    }
    const defaultAcc = data?.accounts?.find((a) => a.isDefault) || data?.accounts?.[0];
    if (defaultAcc) {
      setQuickAddAccountId(defaultAcc.id);
    }
    setQuickAddStep(3);
  };

  const handleQuickAddSubmit = async () => {
    const num = parseFloat(quickAddAmount);
    if (isNaN(num) || num <= 0) {
      toast.error("Enter a valid money amount");
      return;
    }
    const defaultAcc = data?.accounts?.find((a) => a.isDefault) || data?.accounts?.[0];
    const accId = quickAddAccountId || defaultAcc?.id;
    if (!accId) {
      toast.error("Please select an account to deposit into");
      return;
    }
    try {
      await api.post("/finance/quick-transaction", {
        type: "INCOME",
        amount: num,
        title: quickAddTitle.trim(),
        accountId: accId,
      });
      toast.success(`Added ৳${num} from ${quickAddTitle.trim()}`);
      resetQuickAdd();
      fetchFinanceData(selectedMonthYear);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Failed to add money");
    }
  };

  const handleDeleteQuickCost = async (id: string) => {
    if (!window.confirm("Delete this logged cost and restore account balance?")) return;
    try {
      await api.delete(`/finance/quick-transaction/${id}`);
      toast.success("Cost deleted and balance restored");
      fetchFinanceData(selectedMonthYear);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Failed to delete cost");
    }
  };

  const handleDeleteQuickInflow = async (id: string) => {
    if (!window.confirm("Delete this logged income and deduct account balance?")) return;
    try {
      await api.delete(`/finance/quick-transaction/${id}`);
      toast.success("Income deleted and balance adjusted");
      fetchFinanceData(selectedMonthYear);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Failed to delete income");
    }
  };

  // =========================================================================
  // HANDLERS: ACCOUNTS & TRANSFERS
  // =========================================================================
  const handleSaveAccount = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    const balanceNum = parseFloat(formData.get("balance") as string) || 0;
    if (balanceNum < 0) {
      toast.error("Account balance cannot be negative");
      return;
    }

    const payload = {
      name: formData.get("name") as string,
      accountType: formData.get("accountType") as string,
      accountNumber: (formData.get("accountNumber") as string) || null,
      balance: balanceNum,
      isDefault: formData.get("isDefault") === "on",
    };

    try {
      if (editingAccount) {
        await api.put(`/finance/accounts/${editingAccount.id}`, payload);
        toast.success("Account updated");
      } else {
        await api.post("/finance/accounts", payload);
        toast.success("Account created");
      }
      setIsAccountModalOpen(false);
      setEditingAccount(null);
      fetchFinanceData(selectedMonthYear);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Failed to save account");
    }
  };

  const handleDeleteAccount = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this account?")) return;
    try {
      await api.delete(`/finance/accounts/${id}`);
      toast.success("Account deleted");
      fetchFinanceData(selectedMonthYear);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Failed to delete account");
    }
  };

  const handleExecuteTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferFromId || !transferToId || !transferAmount) {
      toast.error("Please fill all required transfer fields");
      return;
    }

    const numAmount = parseFloat(transferAmount);
    const numFee = parseFloat(transferFee) || 0;
    const totalDeduction = numAmount + numFee;
    const fromAcc = data?.accounts?.find((a) => a.id === transferFromId);
    if (fromAcc && fromAcc.balance < totalDeduction) {
      toast.error(`Insufficient balance in ${fromAcc.name} (৳${fromAcc.balance}). Transfer requires ৳${totalDeduction}. Account cannot go negative.`);
      return;
    }

    try {
      await api.post("/finance/accounts/transfer", {
        fromAccountId: transferFromId,
        toAccountId: transferToId,
        amount: numAmount,
        fee: numFee,
        notes: transferNotes,
      });
      toast.success("Transfer completed successfully");
      setIsTransferModalOpen(false);
      setTransferAmount("");
      setTransferFee("0");
      setTransferNotes("");
      fetchFinanceData(selectedMonthYear);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Failed to complete transfer");
    }
  };

  // =========================================================================
  // HANDLERS: DENA & PAONA (DEBTS)
  // =========================================================================
  const handleSaveDebt = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    const payload = {
      type: debtModalType,
      personName: formData.get("personName") as string,
      contactNumber: (formData.get("contactNumber") as string) || null,
      totalAmount: parseFloat(formData.get("totalAmount") as string) || 0,
      dueDate: (formData.get("dueDate") as string) || null,
      notes: (formData.get("notes") as string) || null,
    };

    try {
      if (editingDebt) {
        await api.put(`/finance/debts/${editingDebt.id}`, payload);
        toast.success("Debt record updated");
      } else {
        await api.post("/finance/debts", payload);
        toast.success(payload.type === "I_OWE" ? "Dena record added" : "Paona record added");
      }
      setIsDebtModalOpen(false);
      setEditingDebt(null);
      fetchFinanceData(selectedMonthYear);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Failed to save debt record");
    }
  };

  const handleDeleteDebt = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this debt record?")) return;
    try {
      await api.delete(`/finance/debts/${id}`);
      toast.success("Debt record deleted");
      fetchFinanceData(selectedMonthYear);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Failed to delete debt record");
    }
  };

  const handleRecordDebtPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDebtForPayment || !debtPayAmount) return;

    const num = parseFloat(debtPayAmount);
    if (activeDebtForPayment.type === "I_OWE" && debtPayAccountId) {
      const chosenAcc = data?.accounts?.find((a) => a.id === debtPayAccountId);
      if (chosenAcc && chosenAcc.balance < num) {
        toast.error(`Insufficient balance in ${chosenAcc.name} (৳${chosenAcc.balance}). Account cannot go negative.`);
        return;
      }
    }

    try {
      await api.post(`/finance/debts/${activeDebtForPayment.id}/pay`, {
        amount: num,
        accountId: debtPayAccountId || null,
        notes: debtPayNotes,
        date: new Date().toISOString().split("T")[0],
      });
      toast.success(activeDebtForPayment.type === "I_OWE" ? "Payment recorded" : "Collection recorded");
      setIsDebtPaymentModalOpen(false);
      setActiveDebtForPayment(null);
      setDebtPayAmount("");
      setDebtPayAccountId("");
      setDebtPayNotes("");
      fetchFinanceData(selectedMonthYear);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Failed to record payment");
    }
  };

  // =========================================================================
  // HANDLERS: MONTHLY COSTS (START TO END DATE)
  // =========================================================================
  const handleSaveMonthlyCost = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    const payload = {
      title: formData.get("title") as string,
      amount: parseFloat(formData.get("amount") as string) || 0,
      dueDayOfMonth: parseInt(formData.get("dueDayOfMonth") as string, 10) || 1,
      startDate: formData.get("startDate") as string,
      endDate: (formData.get("endDate") as string) || null,
      category: (formData.get("category") as string) || "Other",
      defaultAccountId: (formData.get("defaultAccountId") as string) || null,
      notes: (formData.get("notes") as string) || null,
    };

    try {
      if (editingMonthlyCost) {
        await api.put(`/finance/monthly-costs/${editingMonthlyCost.id}`, payload);
        toast.success("Monthly cost updated");
      } else {
        await api.post("/finance/monthly-costs", payload);
        toast.success("Monthly cost created");
      }
      setIsMonthlyCostModalOpen(false);
      setEditingMonthlyCost(null);
      fetchFinanceData(selectedMonthYear);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Failed to save monthly cost");
    }
  };

  const handleDeleteMonthlyCost = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this monthly cost?")) return;
    try {
      await api.delete(`/finance/monthly-costs/${id}`);
      toast.success("Monthly cost deleted");
      fetchFinanceData(selectedMonthYear);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Failed to delete monthly cost");
    }
  };

  const handleToggleMonthlyPayment = async (cost: MonthlyCostItem) => {
    if (cost.isPaid) {
      try {
        await api.post(`/finance/monthly-costs/${cost.id}/toggle-payment`, {
          monthYear: selectedMonthYear,
          isPaid: false,
        });
        toast.success(`Marked ${cost.title} as unpaid for ${selectedMonthYear}`);
        fetchFinanceData(selectedMonthYear);
      } catch (error: any) {
        toast.error(error?.response?.data?.error || "Failed to update payment status");
      }
    } else {
      setActiveMonthlyCostForPay(cost);
      const accounts = data?.accounts || [];
      const defaultAcc = accounts.find((a) => a.id === cost.defaultAccountId);
      let accToSelect = "";
      if (defaultAcc && defaultAcc.balance >= cost.amount) {
        accToSelect = defaultAcc.id;
      } else {
        const sufficientAcc = accounts.find((a) => a.balance >= cost.amount);
        accToSelect = sufficientAcc ? sufficientAcc.id : (defaultAcc?.id || accounts[0]?.id || "");
      }
      setMonthlyPayAccountId(accToSelect);
      setIsPayMonthlyModalOpen(true);
    }
  };

  const handleConfirmPayMonthly = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeMonthlyCostForPay) return;

    if (monthlyPayAccountId) {
      const chosenAcc = data?.accounts?.find((a) => a.id === monthlyPayAccountId);
      if (chosenAcc && chosenAcc.balance < activeMonthlyCostForPay.amount) {
        toast.error(`Insufficient balance in ${chosenAcc.name} (৳${chosenAcc.balance}). Account cannot go negative.`);
        return;
      }
    }

    try {
      await api.post(`/finance/monthly-costs/${activeMonthlyCostForPay.id}/toggle-payment`, {
        monthYear: selectedMonthYear,
        isPaid: true,
        accountId: monthlyPayAccountId || null,
        amountPaid: activeMonthlyCostForPay.amount,
      });
      toast.success(`Paid ${activeMonthlyCostForPay.title} for ${selectedMonthYear}`);
      setIsPayMonthlyModalOpen(false);
      setActiveMonthlyCostForPay(null);
      fetchFinanceData(selectedMonthYear);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Failed to record payment");
    }
  };

  // =========================================================================
  // HANDLERS: EXPECTED INFLOWS
  // =========================================================================
  const handleSaveInflow = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    const type = formData.get("inflowType") as "MONTHLY" | "ONE_TIME";

    const payload = {
      title: formData.get("title") as string,
      amount: parseFloat(formData.get("amount") as string) || 0,
      inflowType: type,
      dueDay: type === "MONTHLY" ? parseInt(formData.get("dueDay") as string, 10) || 1 : null,
      startDate: type === "MONTHLY" ? (formData.get("startDate") as string) || null : null,
      endDate: type === "MONTHLY" ? (formData.get("endDate") as string) || null : null,
      expectedDate: type === "ONE_TIME" ? (formData.get("expectedDate") as string) || null : null,
      confidence: formData.get("confidence") as string,
      notes: (formData.get("notes") as string) || null,
    };

    try {
      if (editingInflow) {
        await api.put(`/finance/inflows/${editingInflow.id}`, payload);
        toast.success("Expected inflow updated");
      } else {
        await api.post("/finance/inflows", payload);
        toast.success("Expected inflow added");
      }
      setIsInflowModalOpen(false);
      setEditingInflow(null);
      fetchFinanceData(selectedMonthYear);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Failed to save inflow");
    }
  };

  const handleDeleteInflow = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this expected inflow?")) return;
    try {
      await api.delete(`/finance/inflows/${id}`);
      toast.success("Inflow deleted");
      fetchFinanceData(selectedMonthYear);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Failed to delete inflow");
    }
  };

  const handleConfirmReceiveInflow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeInflowForReceive) return;

    try {
      await api.post(`/finance/inflows/${activeInflowForReceive.id}/received`, {
        accountId: receiveAccountId || null,
        amount: activeInflowForReceive.amount,
        receivedDate: new Date().toISOString().split("T")[0],
      });
      toast.success(`Received ${activeInflowForReceive.title}!`);
      setIsReceiveInflowModalOpen(false);
      setActiveInflowForReceive(null);
      fetchFinanceData(selectedMonthYear);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Failed to mark inflow received");
    }
  };

  // =========================================================================
  // HANDLERS: SAVINGS VAULTS (e.g. PS5)
  // =========================================================================
  const handleSaveVault = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    const payload = {
      title: formData.get("title") as string,
      targetAmount: parseFloat(formData.get("targetAmount") as string) || 0,
      monthlyAmount: parseFloat(formData.get("monthlyAmount") as string) || 0,
      targetDate: (formData.get("targetDate") as string) || null,
      notes: (formData.get("notes") as string) || null,
    };

    try {
      if (editingVault) {
        await api.put(`/finance/vaults/${editingVault.id}`, payload);
        toast.success("Savings vault updated");
      } else {
        await api.post("/finance/vaults", payload);
        toast.success("Savings vault created");
      }
      setIsVaultModalOpen(false);
      setEditingVault(null);
      fetchFinanceData(selectedMonthYear);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Failed to save vault");
    }
  };

  const handleDeleteVault = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this savings vault?")) return;
    try {
      await api.delete(`/finance/vaults/${id}`);
      toast.success("Vault deleted");
      fetchFinanceData(selectedMonthYear);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Failed to delete vault");
    }
  };

  const handleExecuteVaultTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeVaultForTransact || !vaultTransactAmount) return;

    const num = parseFloat(vaultTransactAmount);
    if (vaultTransactType === "DEPOSIT" && vaultTransactAccountId) {
      const chosenAcc = data?.accounts?.find((a) => a.id === vaultTransactAccountId);
      if (chosenAcc && chosenAcc.balance < num) {
        toast.error(`Insufficient balance in ${chosenAcc.name} (৳${chosenAcc.balance}). Account cannot go negative.`);
        return;
      }
    }

    try {
      await api.post(`/finance/vaults/${activeVaultForTransact.id}/transact`, {
        type: vaultTransactType,
        amount: num,
        sourceAccountId: vaultTransactAccountId || null,
        notes: vaultTransactNotes,
      });
      toast.success(
        vaultTransactType === "DEPOSIT"
          ? `Stashed into ${activeVaultForTransact.title}`
          : `Withdrawn from ${activeVaultForTransact.title}`
      );
      setIsVaultTransactModalOpen(false);
      setActiveVaultForTransact(null);
      setVaultTransactAmount("");
      setVaultTransactAccountId("");
      setVaultTransactNotes("");
      fetchFinanceData(selectedMonthYear);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Failed to execute vault transaction");
    }
  };

  // =========================================================================
  // RENDER
  // =========================================================================
  if (isLoading || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-text-muted mb-2" />
        <span className="text-xs font-mono text-text-muted">Loading Personal Finance Engine...</span>
      </div>
    );
  }

  const { summary, accounts, denaList, paonaList, monthlyCosts, expectedInflows, savingsVaults } = data;

  // Combine unsettled Dena & Paona for the overview card (sorted oldest first)
  const allUnsettledDebts = [
    ...denaList.filter((d) => d.status !== "SETTLED"),
    ...paonaList.filter((d) => d.status !== "SETTLED"),
  ].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  // Monthly Costs sorted by oldest first (dueDateStr or startDate)
  const sortedMonthlyCosts = [...monthlyCosts].sort((a, b) => {
    const dateA = a.dueDateStr || a.startDate || "";
    const dateB = b.dueDateStr || b.startDate || "";
    return dateA.localeCompare(dateB);
  });

  // Savings Vaults sorted by oldest first
  const sortedVaults = [...savingsVaults].sort((a, b) => {
    const dateA = a.createdAt || "";
    const dateB = b.createdAt || "";
    return dateA.localeCompare(dateB);
  });

  // Accounts sorted by oldest first
  const sortedAccounts = [...accounts].sort((a, b) => {
    return (a as any).createdAt && (b as any).createdAt
      ? new Date((a as any).createdAt).getTime() - new Date((b as any).createdAt).getTime()
      : 0;
  });

  // Two Types of Costs: Monthly Repeating & Daily Costs
  const repeatingCosts = monthlyCosts.filter(
    (c) => c.costType === "MONTHLY_REPEATING" || (!c.isQuickCost && !c.costType)
  );
  const dailyCosts = monthlyCosts.filter(
    (c) => c.costType === "DAILY_COST" || c.isQuickCost
  );

  const netAmount =
    (summary?.totalLiquidBalance || 0) +
    (summary?.totalVaultSavings || 0) +
    (summary?.remainingPaona || 0) -
    (summary?.remainingDena || 0);

  return (
    <div className="space-y-6 pb-16">
      {/* ------------------------------------------------------------- */}
      {/* 1. TOP HEADER & NAVIGATION                                    */}
      {/* ------------------------------------------------------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-text" />
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-text">Personal Finance</h1>
          </div>
          <p className="text-xs font-mono text-text-muted mt-1">
            Net amount: {formatCurrency(netAmount)}
          </p>
        </div>

        {/* Action Controls & Settings Drawer Trigger */}
        <div className="flex items-center gap-2 relative">
          <ActionDrawer triggerTitle="Finance Settings & Actions">
            <button
              onClick={() => setIsEditMode((prev) => !prev)}
              title={isEditMode ? "Exit Edit Mode" : "Enter Edit Mode"}
              className={`interactive-tap p-2 border rounded-md transition-colors ${
                isEditMode
                  ? "bg-text text-bg border-text shadow-xs"
                  : "bg-surface text-text-muted border-border hover:text-text hover:border-text-muted"
              }`}
              aria-label="Toggle edit mode"
            >
              <Edit3 className="w-4 h-4" />
            </button>
          </ActionDrawer>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. TOP EXECUTIVE METRIC CARDS (5 KPI TILES, NO 3RD LINE)       */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Metric 1: Liquid Balance */}
        <div className="p-3 bg-surface border border-border rounded-md">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-mono text-text-muted">Liquid Balance</span>
            <Wallet className="w-3.5 h-3.5 text-text-muted" />
          </div>
          <p className="text-base font-bold font-mono text-text mt-1.5 truncate">
            {formatCurrency(summary.totalLiquidBalance)}
          </p>
        </div>

        {/* Metric 2: Vaults Stashed */}
        <div className="p-3 bg-surface border border-border rounded-md">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-mono text-text-muted">Vaults Stashed</span>
            <PiggyBank className="w-3.5 h-3.5 text-text-muted" />
          </div>
          <p className="text-base font-bold font-mono text-text mt-1.5 truncate">
            {formatCurrency(summary.totalVaultSavings)}
          </p>
        </div>

        {/* Metric 3: Paona (Receivables) */}
        <div className="p-3 bg-surface border border-border rounded-md">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-mono text-text-muted">Paona (Receivables)</span>
            <ArrowDownLeft className="w-3.5 h-3.5 text-text-muted" />
          </div>
          <p className="text-base font-bold font-mono text-text mt-1.5 truncate">
            {formatCurrency(summary.remainingPaona)}
          </p>
        </div>

        {/* Metric 4: Dena (Payables) */}
        <div className="p-3 bg-surface border border-border rounded-md">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-mono text-text-muted">Dena (Payables)</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-text-muted" />
          </div>
          <p className="text-base font-bold font-mono text-text mt-1.5 truncate">
            {formatCurrency(summary.remainingDena)}
          </p>
        </div>

        {/* Metric 5: Month's Costs Due */}
        <div className="p-3 bg-surface border border-border rounded-md">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-mono text-text-muted">Month's Cost Due</span>
            <CalendarIcon className="w-3.5 h-3.5 text-text-muted" />
          </div>
          <p className="text-base font-bold font-mono text-text mt-1.5 truncate">
            {formatCurrency(summary.totalMonthlyCostDue)}
          </p>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 3. SUB-NAVIGATION TABS (CLEAN, NO COUNTERS)                   */}
      {/* ------------------------------------------------------------- */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-border scrollbar-none">
        {[
          { key: "overview", label: "Overview" },
          { key: "accounts", label: "Accounts" },
          { key: "debts", label: "Dena & Paona" },
          { key: "monthly", label: "Monthly Costs" },
          { key: "inflows", label: "Expected Inflows" },
          { key: "vaults", label: "Savings Vaults" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as TabType)}
            className={`interactive-tap px-3.5 py-2 text-xs font-mono font-medium rounded-t-md transition-all whitespace-nowrap ${
              activeTab === tab.key
                ? "bg-surface text-text border-t border-l border-r border-border -mb-px"
                : "text-text-muted hover:text-text hover:bg-surface/40"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 4. TAB CONTENTS                                               */}
      {/* ------------------------------------------------------------- */}

      {/* ============================================================= */}
      {/* TAB: OVERVIEW                                                 */}
      {/* ============================================================= */}
      {activeTab === "overview" && (
        <div className="space-y-5">
          {/* Quick Cost & Quick Add Money Inputs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Quick Cost Card */}
            <div className="p-3.5 bg-surface border border-border rounded-md min-h-[114px] flex flex-col justify-between">
              <div className="flex items-center justify-between h-5">
                <div className="flex items-center gap-2">
                  <ArrowUpRight className="w-4 h-4 text-text" />
                  <span className="text-xs font-mono uppercase font-semibold text-text">Daily Cost</span>
                </div>
                {quickCostStep > 1 && (
                  <button
                    onClick={resetQuickCost}
                    className="text-[10px] font-mono text-text-muted hover:text-text flex items-center gap-1"
                  >
                    <X className="w-3 h-3" />
                    <span>Cancel</span>
                  </button>
                )}
              </div>

              {quickCostStep === 1 && (
                <div className="h-[58px] flex flex-col justify-end">
                  <input
                    type="number"
                    step="any"
                    value={quickCostAmount}
                    onChange={(e) => setQuickCostAmount(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleQuickCostStep1();
                    }}
                    placeholder="Enter amount"
                    className="w-full bg-bg border border-border rounded-xs px-3 py-2 text-xs font-mono text-text placeholder:text-text-muted focus:outline-none focus:border-text"
                  />
                </div>
              )}

              {quickCostStep === 2 && (
                <div className="h-[58px] flex flex-col justify-between">
                  <div className="flex items-center gap-2 text-[11px] font-mono text-text">
                    <span className="text-text-muted">Amount:</span>
                    <span className="font-bold">৳ {quickCostAmount}</span>
                  </div>
                  <input
                    type="text"
                    value={quickCostTitle}
                    onChange={(e) => setQuickCostTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleQuickCostStep2();
                      if (e.key === "Escape") resetQuickCost();
                    }}
                    autoFocus
                    placeholder="Enter title"
                    className="w-full bg-bg border border-border rounded-xs px-3 py-2 text-xs font-mono text-text placeholder:text-text-muted focus:outline-none focus:border-text"
                  />
                </div>
              )}

              {quickCostStep === 3 && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleQuickCostSubmit();
                  }}
                  className="h-[58px] flex flex-col justify-between"
                >
                  <div className="flex items-center gap-3 text-[11px] font-mono text-text">
                    <span className="font-bold">৳ {quickCostAmount}</span>
                    <span className="text-text-muted">•</span>
                    <span className="font-medium truncate">{quickCostTitle}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      ref={quickCostSelectRef}
                      autoFocus
                      value={
                        quickCostAccountId ||
                        accounts.find((a) => a.balance >= parseFloat(quickCostAmount || "0"))?.id ||
                        accounts[0]?.id ||
                        ""
                      }
                      onChange={(e) => setQuickCostAccountId(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleQuickCostSubmit();
                        } else if (e.key === "Escape") {
                          resetQuickCost();
                        }
                      }}
                      className="flex-1 bg-bg border border-border rounded-xs px-2.5 py-2 text-xs text-text font-mono focus:outline-none focus:border-text"
                    >
                      {accounts.map((a) => {
                        const isInsufficient = a.balance < parseFloat(quickCostAmount || "0");
                        return (
                          <option key={a.id} value={a.id} disabled={isInsufficient}>
                            {a.name} ({formatCurrency(a.balance)}){isInsufficient ? " [Insufficient]" : ""}
                          </option>
                        );
                      })}
                    </select>
                    <button
                      type="submit"
                      className="interactive-tap px-3 py-2 rounded-xs bg-text text-bg text-xs font-mono font-semibold hover:opacity-90 shrink-0"
                    >
                      Confirm
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Quick Add Money Card */}
            <div className="p-3.5 bg-surface border border-border rounded-md min-h-[114px] flex flex-col justify-between">
              <div className="flex items-center justify-between h-5">
                <div className="flex items-center gap-2">
                  <ArrowDownLeft className="w-4 h-4 text-text" />
                  <span className="text-xs font-mono uppercase font-semibold text-text">Quick Add Money</span>
                </div>
                {quickAddStep > 1 && (
                  <button
                    onClick={resetQuickAdd}
                    className="text-[10px] font-mono text-text-muted hover:text-text flex items-center gap-1"
                  >
                    <X className="w-3 h-3" />
                    <span>Cancel</span>
                  </button>
                )}
              </div>

              {quickAddStep === 1 && (
                <div className="h-[58px] flex flex-col justify-end">
                  <input
                    type="number"
                    step="any"
                    value={quickAddAmount}
                    onChange={(e) => setQuickAddAmount(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleQuickAddStep1();
                    }}
                    placeholder="Enter amount"
                    className="w-full bg-bg border border-border rounded-xs px-3 py-2 text-xs font-mono text-text placeholder:text-text-muted focus:outline-none focus:border-text"
                  />
                </div>
              )}

              {quickAddStep === 2 && (
                <div className="h-[58px] flex flex-col justify-between">
                  <div className="flex items-center gap-2 text-[11px] font-mono text-text">
                    <span className="text-text-muted">Amount:</span>
                    <span className="font-bold">৳ {quickAddAmount}</span>
                  </div>
                  <input
                    type="text"
                    value={quickAddTitle}
                    onChange={(e) => setQuickAddTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleQuickAddStep2();
                      if (e.key === "Escape") resetQuickAdd();
                    }}
                    autoFocus
                    placeholder="Enter title"
                    className="w-full bg-bg border border-border rounded-xs px-3 py-2 text-xs font-mono text-text placeholder:text-text-muted focus:outline-none focus:border-text"
                  />
                </div>
              )}

              {quickAddStep === 3 && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleQuickAddSubmit();
                  }}
                  className="h-[58px] flex flex-col justify-between"
                >
                  <div className="flex items-center gap-3 text-[11px] font-mono text-text">
                    <span className="font-bold">৳ {quickAddAmount}</span>
                    <span className="text-text-muted">•</span>
                    <span className="font-medium truncate">{quickAddTitle}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      ref={quickAddSelectRef}
                      autoFocus
                      value={quickAddAccountId || accounts.find((a) => a.isDefault)?.id || accounts[0]?.id || ""}
                      onChange={(e) => setQuickAddAccountId(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleQuickAddSubmit();
                        } else if (e.key === "Escape") {
                          resetQuickAdd();
                        }
                      }}
                      className="flex-1 bg-bg border border-border rounded-xs px-2.5 py-2 text-xs text-text font-mono focus:outline-none focus:border-text"
                    >
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name} ({formatCurrency(a.balance)})
                        </option>
                      ))}
                    </select>
                    <button
                      type="submit"
                      className="interactive-tap px-3 py-2 rounded-xs bg-text text-bg text-xs font-mono font-semibold hover:opacity-90 shrink-0"
                    >
                      Confirm
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Card: Accounts Quick Glance */}
            <div className="bg-surface border border-border rounded-md p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <div className="flex items-center gap-2">
                  <Building className="w-4 h-4 text-text" />
                  <h2 className="text-xs font-mono uppercase font-semibold text-text">Accounts & Balances</h2>
                </div>
              </div>

              {accounts.length === 0 ? (
                <p className="text-xs font-mono text-text-muted py-4 text-center">No accounts set up yet.</p>
              ) : (
                <div className="max-h-[300px] overflow-y-auto pr-1">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {sortedAccounts.map((acc) => (
                      <div key={acc.id} className="p-2.5 bg-bg border border-border rounded-md flex items-center justify-between">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="p-1.5 rounded-xs bg-surface border border-border shrink-0">
                            {getAccountIcon(acc.accountType)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-text truncate">{acc.name}</p>
                            <span className="text-[10px] font-mono text-text-muted block">
                              {acc.accountNumber || acc.accountType}
                            </span>
                          </div>
                        </div>
                        <span className="text-xs font-mono font-bold text-text shrink-0">
                          {formatCurrency(acc.balance)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Card: Active Monthly Commitments */}
            <div className="bg-surface border border-border rounded-md p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-text" />
                  <h2 className="text-xs font-mono uppercase font-semibold text-text">
                    Monthly Costs
                  </h2>
                </div>
              </div>

              {sortedMonthlyCosts.length === 0 ? (
                <p className="text-xs font-mono text-text-muted py-4 text-center">
                  No active monthly obligations for this month.
                </p>
              ) : (
                <div className="max-h-[300px] overflow-y-auto pr-1 space-y-2">
                  {sortedMonthlyCosts.map((cost) => (
                    <div
                      key={cost.id}
                      className="p-2 bg-bg border border-border rounded-md flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className={`text-xs font-medium truncate ${cost.isPaid ? "line-through text-text-muted" : "text-text"}`}>
                            {cost.title}
                          </p>
                          <span
                            className={`px-1.5 py-0.2 text-[9px] font-mono rounded-xs ${
                              cost.isQuickCost
                                ? "bg-text/10 text-text font-semibold border border-border"
                                : "bg-surface text-text-muted border border-border"
                            }`}
                          >
                            {cost.isQuickCost ? "Daily" : "Repeating"}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-text-muted block mt-0.5">
                          {cost.isQuickCost
                            ? `Logged: ${cost.dueDateStr} • Paid from: ${cost.paidFromAccountName || accounts.find((a) => a.id === cost.paidFromAccountId)?.name || "Account"}`
                            : `Due ${cost.dueDayOfMonth}th of month • ${cost.category}`}
                        </span>
                      </div>

                      <span className="text-xs font-mono font-semibold text-text shrink-0">
                        {formatCurrency(cost.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Card: Dena Paona (Both Dena and Paona shown here) */}
            <div className="bg-surface border border-border rounded-md p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <div className="flex items-center gap-2">
                  <ArrowRightLeft className="w-4 h-4 text-text" />
                  <h2 className="text-xs font-mono uppercase font-semibold text-text">Dena Paona</h2>
                </div>
              </div>

              {allUnsettledDebts.length === 0 ? (
                <p className="text-xs font-mono text-text-muted py-6 text-center">No pending Dena or Paona. All settled!</p>
              ) : (
                <div className="max-h-[300px] overflow-y-auto pr-1 space-y-2">
                  {allUnsettledDebts.map((d) => (
                    <div key={d.id} className="p-2.5 bg-bg border border-border rounded-md flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-text truncate">{d.personName}</span>
                          <span
                            className={`px-1.5 py-0.5 text-[9px] font-mono rounded-xs ${
                              d.type === "I_OWE"
                                ? "bg-text/10 text-text font-semibold border border-border"
                                : "bg-surface text-text-muted border border-border"
                            }`}
                          >
                            {d.type === "I_OWE" ? "Dena" : "Paona"}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-text-muted block mt-0.5">
                          {d.dueDate ? `Due: ${d.dueDate}` : "No due date"}
                        </span>
                      </div>

                      <span className="text-xs font-mono font-semibold text-text shrink-0">
                        {formatCurrency(d.remainingAmount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Card: Savings Vaults Quick View */}
            <div className="bg-surface border border-border rounded-md p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <div className="flex items-center gap-2">
                  <PiggyBank className="w-4 h-4 text-text" />
                  <h2 className="text-xs font-mono uppercase font-semibold text-text">Savings Vaults</h2>
                </div>
              </div>

              {sortedVaults.length === 0 ? (
                <p className="text-xs font-mono text-text-muted py-6 text-center">No saving vaults created yet.</p>
              ) : (
                <div className="max-h-[300px] overflow-y-auto pr-1 space-y-3">
                  {sortedVaults.map((vault) => (
                    <div key={vault.id} className="p-2.5 bg-bg border border-border rounded-md space-y-1.5">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-medium text-text">{vault.title}</p>
                        <span className="text-xs font-mono font-semibold text-text">
                          {formatCurrency(vault.currentAmount)} / {formatCurrency(vault.targetAmount)}
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-surface border border-border/80 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-text transition-all duration-500 rounded-full"
                          style={{ width: `${vault.progressPercent}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10px] font-mono text-text-muted">
                        <span>{vault.progressPercent}% reached</span>
                        <span>Left: {formatCurrency(vault.remainingAmount)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* TAB: ACCOUNTS                                                 */}
      {/* ============================================================= */}
      {activeTab === "accounts" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-mono uppercase tracking-wider text-text font-semibold">
              Your Accounts & Wallets
            </h2>

            {isEditMode && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setTransferFromId(accounts[0]?.id || "");
                    setTransferToId(accounts[1]?.id || "");
                    setIsTransferModalOpen(true);
                  }}
                  disabled={accounts.length < 2}
                  className="interactive-tap flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border bg-surface text-text hover:border-text font-mono text-xs transition-colors disabled:opacity-40"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                  <span>Transfer</span>
                </button>
                <button
                  onClick={() => {
                    setEditingAccount(null);
                    setIsAccountModalOpen(true);
                  }}
                  className="interactive-tap flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-text text-bg font-mono text-xs font-semibold hover:opacity-90 transition-opacity"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  <span>New Account</span>
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {accounts.map((acc) => (
              <div key={acc.id} className="p-4 bg-surface border border-border rounded-md flex flex-col justify-between space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-md bg-bg border border-border">
                      {getAccountIcon(acc.accountType)}
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-text leading-tight">{acc.name}</h3>
                      <span className="text-[10px] font-mono text-text-muted mt-0.5 block">
                        {acc.accountType} {acc.accountNumber ? `• ${acc.accountNumber}` : ""}
                      </span>
                    </div>
                  </div>
                  {acc.isDefault && (
                    <span className="px-1.5 py-0.5 text-[9px] font-mono bg-bg border border-border text-text-muted rounded-xs">
                      Default
                    </span>
                  )}
                </div>

                <div className="pt-2 border-t border-border/60 flex items-baseline justify-between">
                  <span className="text-[10px] font-mono uppercase text-text-muted">Balance</span>
                  <span className="text-lg font-bold font-mono text-text">
                    {formatCurrency(acc.balance)}
                  </span>
                </div>

                {isEditMode && (
                  <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-border/40">
                    <button
                      onClick={() => {
                        setEditingAccount(acc);
                        setIsAccountModalOpen(true);
                      }}
                      className="interactive-tap p-1.5 rounded-xs text-text-muted hover:text-text hover:bg-bg"
                      title="Edit Account"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteAccount(acc.id)}
                      className="interactive-tap p-1.5 rounded-xs text-text-muted hover:text-text hover:bg-surface-hover"
                      title="Delete Account"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* TAB: DENA & PAONA (DEBTS)                                     */}
      {/* ============================================================= */}
      {activeTab === "debts" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-mono uppercase tracking-wider text-text font-semibold">
              Debt Obligations & Receivables
            </h2>
            {isEditMode && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setDebtModalType("I_OWE");
                    setEditingDebt(null);
                    setIsDebtModalOpen(true);
                  }}
                  className="interactive-tap flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border bg-surface text-text hover:border-text font-mono text-xs transition-colors"
                >
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>Add Dena</span>
                </button>
                <button
                  onClick={() => {
                    setDebtModalType("OWES_ME");
                    setEditingDebt(null);
                    setIsDebtModalOpen(true);
                  }}
                  className="interactive-tap flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-text text-bg font-mono text-xs font-semibold hover:opacity-90 transition-opacity"
                >
                  <ArrowDownLeft className="w-3.5 h-3.5" />
                  <span>Add Paona</span>
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Column 1: Dena (I Owe) */}
            <div className="bg-surface border border-border rounded-md p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <div className="flex items-center gap-2">
                  <ArrowUpRight className="w-4 h-4 text-text" />
                  <h3 className="text-xs font-mono uppercase font-semibold text-text">Dena (I Owe)</h3>
                </div>
                <span className="text-xs font-mono font-bold text-text">
                  Remaining: {formatCurrency(summary.remainingDena)}
                </span>
              </div>

              {denaList.length === 0 ? (
                <p className="text-xs font-mono text-text-muted py-8 text-center">No Dena recorded. You are debt-free!</p>
              ) : (
                <div className="space-y-2.5">
                  {denaList.map((d) => (
                    <div
                      key={d.id}
                      className={`p-3 bg-bg border rounded-md space-y-2 ${
                        d.status === "SETTLED" ? "border-border/40 opacity-60" : "border-border"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-text">{d.personName}</span>
                            <span
                              className={`px-1.5 py-0.2 text-[9px] font-mono rounded-xs ${
                                d.status === "SETTLED"
                                  ? "bg-text/10 text-text"
                                  : d.status === "PARTIAL"
                                  ? "bg-surface-hover text-text border border-border"
                                  : "bg-surface text-text-muted border border-border"
                              }`}
                            >
                              {d.status}
                            </span>
                          </div>
                          <span className="text-[10px] font-mono text-text-muted block mt-0.5">
                            {d.dueDate ? `Due on: ${d.dueDate}` : "No specific due date"}
                            {d.contactNumber ? ` • ${d.contactNumber}` : ""}
                          </span>
                        </div>

                        <div className="text-right">
                          <span className="text-xs font-mono font-bold text-text block">
                            {formatCurrency(d.remainingAmount)}
                          </span>
                          <span className="text-[10px] font-mono text-text-muted">
                            Total: {formatCurrency(d.totalAmount)}
                          </span>
                        </div>
                      </div>

                      {/* Payment progress */}
                      <div className="w-full h-1 bg-surface rounded-full overflow-hidden">
                        <div
                          className="h-full bg-text rounded-full transition-all"
                          style={{ width: `${Math.min(100, Math.round((d.paidAmount / d.totalAmount) * 100))}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        {isEditMode ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setEditingDebt(d);
                                setDebtModalType("I_OWE");
                                setIsDebtModalOpen(true);
                              }}
                              className="text-[10px] font-mono text-text-muted hover:text-text"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteDebt(d.id)}
                              className="text-[10px] font-mono text-text-muted hover:text-text"
                            >
                              Delete
                            </button>
                          </div>
                        ) : (
                          <span />
                        )}

                        {d.status !== "SETTLED" && (
                          <button
                            onClick={() => {
                              setActiveDebtForPayment(d);
                              setDebtPayAmount(String(d.remainingAmount));
                              setIsDebtPaymentModalOpen(true);
                            }}
                            className="interactive-tap px-2.5 py-1 rounded-xs bg-surface border border-border hover:border-text text-[10px] font-mono text-text transition-colors"
                          >
                            Record Payment
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Column 2: Paona (Owes Me) */}
            <div className="bg-surface border border-border rounded-md p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <div className="flex items-center gap-2">
                  <ArrowDownLeft className="w-4 h-4 text-text" />
                  <h3 className="text-xs font-mono uppercase font-semibold text-text">Paona (Owes Me)</h3>
                </div>
                <span className="text-xs font-mono font-bold text-text">
                  Remaining: {formatCurrency(summary.remainingPaona)}
                </span>
              </div>

              {paonaList.length === 0 ? (
                <p className="text-xs font-mono text-text-muted py-8 text-center">No Paona recorded.</p>
              ) : (
                <div className="space-y-2.5">
                  {paonaList.map((d) => (
                    <div
                      key={d.id}
                      className={`p-3 bg-bg border rounded-md space-y-2 ${
                        d.status === "SETTLED" ? "border-border/40 opacity-60" : "border-border"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-text">{d.personName}</span>
                            <span
                              className={`px-1.5 py-0.2 text-[9px] font-mono rounded-xs ${
                                d.status === "SETTLED"
                                  ? "bg-text/10 text-text"
                                  : d.status === "PARTIAL"
                                  ? "bg-surface-hover text-text border border-border"
                                  : "bg-surface text-text-muted border border-border"
                              }`}
                            >
                              {d.status}
                            </span>
                          </div>
                          <span className="text-[10px] font-mono text-text-muted block mt-0.5">
                            {d.dueDate ? `Expected by: ${d.dueDate}` : "No specific due date"}
                            {d.contactNumber ? ` • ${d.contactNumber}` : ""}
                          </span>
                        </div>

                        <div className="text-right">
                          <span className="text-xs font-mono font-bold text-text block">
                            {formatCurrency(d.remainingAmount)}
                          </span>
                          <span className="text-[10px] font-mono text-text-muted">
                            Total: {formatCurrency(d.totalAmount)}
                          </span>
                        </div>
                      </div>

                      {/* Payment progress */}
                      <div className="w-full h-1 bg-surface rounded-full overflow-hidden">
                        <div
                          className="h-full bg-text rounded-full transition-all"
                          style={{ width: `${Math.min(100, Math.round((d.paidAmount / d.totalAmount) * 100))}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        {isEditMode ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setEditingDebt(d);
                                setDebtModalType("OWES_ME");
                                setIsDebtModalOpen(true);
                              }}
                              className="text-[10px] font-mono text-text-muted hover:text-text"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteDebt(d.id)}
                              className="text-[10px] font-mono text-text-muted hover:text-text"
                            >
                              Delete
                            </button>
                          </div>
                        ) : (
                          <span />
                        )}

                        {d.status !== "SETTLED" && (
                          <button
                            onClick={() => {
                              setActiveDebtForPayment(d);
                              setDebtPayAmount(String(d.remainingAmount));
                              setIsDebtPaymentModalOpen(true);
                            }}
                            className="interactive-tap px-2.5 py-1 rounded-xs bg-surface border border-border hover:border-text text-[10px] font-mono text-text transition-colors"
                          >
                            Record Collection
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* TAB: MONTHLY COSTS (START TO END DATE)                        */}
      {/* ============================================================= */}
      {activeTab === "monthly" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-xs font-mono uppercase tracking-wider text-text font-semibold">
                Monthly Costs Overview
              </h2>
              <p className="text-[11px] font-mono text-text-muted mt-0.5">
                Active for {getMonthDisplayName(selectedMonthYear)} • 2 Cost Types: Monthly Repeating & Daily Costs
              </p>
            </div>

            {/* Month Selector Pill */}
            <div className="flex items-center bg-surface border border-border rounded-md px-1 py-0.5 self-start sm:self-auto">
              <button
                onClick={handlePrevMonth}
                className="interactive-tap p-1.5 text-text-muted hover:text-text hover:bg-bg rounded-xs transition-colors"
                title="Previous Month"
                aria-label="Previous month"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleCurrentMonth}
                className="px-2 py-1 text-xs font-mono text-text hover:bg-bg rounded-xs transition-colors"
                title="Jump to Current Month"
              >
                {getMonthDisplayName(selectedMonthYear)}
              </button>
              <button
                onClick={handleNextMonth}
                className="interactive-tap p-1.5 text-text-muted hover:text-text hover:bg-bg rounded-xs transition-colors"
                title="Next Month"
                aria-label="Next month"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <AnimatedSlideView slideKey={animKey} direction={slideDirection} className="space-y-6">
            {/* Month Summary Bar */}
            <div className="p-3.5 bg-surface border border-border rounded-md flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-6">
              <div>
                <span className="text-[10px] uppercase font-mono text-text-muted block">This Month's Total</span>
                <span className="text-sm font-bold font-mono text-text">
                  {formatCurrency(summary.totalMonthCosts ?? (summary.totalMonthlyCostDue + summary.totalMonthlyCostPaid))}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-mono text-text-muted block">Monthly Repeating</span>
                <span className="text-sm font-bold font-mono text-text">
                  {formatCurrency(summary.totalMonthlyRepeatingCosts ?? 0)}
                </span>
                <span className="text-[9px] font-mono text-text-muted block">
                  {repeatingCosts.filter((c) => c.isPaid).length} of {repeatingCosts.length} paid
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-mono text-text-muted block">Daily Costs Total</span>
                <span className="text-sm font-bold font-mono text-text">
                  {formatCurrency(summary.totalDailyCosts ?? 0)}
                </span>
                <span className="text-[9px] font-mono text-text-muted block">
                  {dailyCosts.length} logged entries
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-mono text-text-muted block">Remaining Due</span>
                <span className="text-sm font-bold font-mono text-text">
                  {formatCurrency(summary.totalMonthlyCostDue)}
                </span>
              </div>
            </div>
          </div>

          {/* ----------------------------------------------------------- */}
          {/* TYPE 1: MONTHLY REPEATING COSTS                             */}
          {/* ----------------------------------------------------------- */}
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-1 border-b border-border">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-text" />
                <div>
                  <h3 className="text-xs font-mono uppercase font-semibold text-text">
                    1. Monthly Repeating Costs
                  </h3>
                  <span className="text-[10px] font-mono text-text-muted">
                    Fixed contracts & recurring commitments (Home rent, bills, internet)
                  </span>
                </div>
              </div>

              {isEditMode && (
                <button
                  onClick={() => {
                    setEditingMonthlyCost(null);
                    setIsMonthlyCostModalOpen(true);
                  }}
                  className="interactive-tap flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-text text-bg font-mono text-xs font-semibold hover:opacity-90 transition-opacity"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  <span>New Contract / Cost</span>
                </button>
              )}
            </div>

            {repeatingCosts.length === 0 ? (
              <div className="py-8 flex flex-col items-center justify-center text-center bg-surface border border-border rounded-md">
                <CalendarIcon className="w-7 h-7 text-text-muted mb-1.5" />
                <p className="text-xs font-mono text-text">No monthly repeating contracts active for {getMonthDisplayName(selectedMonthYear)}.</p>
                <p className="text-[10px] font-mono text-text-muted mt-0.5">
                  Add recurring commitments with start/end date ranges and due days.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {repeatingCosts.map((cost) => (
                  <div
                    key={cost.id}
                    className={`p-3 bg-surface border rounded-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                      cost.isPaid ? "border-border/60 bg-surface/50" : "border-border"
                    }`}
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <button
                        onClick={() => handleToggleMonthlyPayment(cost)}
                        className={`interactive-tap w-6 h-6 rounded-md border flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                          cost.isPaid ? "border-text bg-surface" : "border-border hover:border-text bg-bg"
                        }`}
                        title={cost.isPaid ? "Mark unpaid" : "Mark paid for this month"}
                      >
                        {cost.isPaid ? (
                          <span className="w-4.5 h-4.5 rounded-full bg-text text-bg flex items-center justify-center animate-check-pop">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </span>
                        ) : (
                          <span className="w-4 h-4 rounded-full border border-border/90 hover:border-text/60 transition-colors" />
                        )}
                      </button>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className={`text-xs font-semibold truncate ${cost.isPaid ? "line-through text-text-muted" : "text-text"}`}>
                            {cost.title}
                          </h4>
                          <span className="px-1.5 py-0.2 text-[9px] font-mono bg-bg border border-border text-text-muted rounded-xs">
                            {cost.category}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-mono text-text-muted mt-1">
                          <span>Due: {cost.dueDayOfMonth}th of month</span>
                          <span>
                            Contract: {cost.startDate} → {cost.endDate || "Ongoing"}
                          </span>
                          {cost.isPaid && cost.paidDate && (
                            <span className="text-text">Paid on {cost.paidDate}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pl-9 sm:pl-0">
                      <div className="text-right">
                        <span className="text-sm font-mono font-bold text-text block">
                          {formatCurrency(cost.amount)}
                        </span>
                        <span className="text-[9px] font-mono text-text-muted">per month</span>
                      </div>

                      {isEditMode && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setEditingMonthlyCost(cost);
                              setIsMonthlyCostModalOpen(true);
                            }}
                            className="interactive-tap p-1.5 rounded-xs text-text-muted hover:text-text hover:bg-bg"
                            title="Edit Cost Contract"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteMonthlyCost(cost.id)}
                            className="interactive-tap p-1.5 rounded-xs text-text-muted hover:text-text hover:bg-surface-hover"
                            title="Delete Cost Contract"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ----------------------------------------------------------- */}
          {/* TYPE 2: DAILY COSTS (LOGGED FOR THIS MONTH)                 */}
          {/* ----------------------------------------------------------- */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between pb-1 border-b border-border">
              <div className="flex items-center gap-2">
                <ArrowUpRight className="w-4 h-4 text-text" />
                <div>
                  <h3 className="text-xs font-mono uppercase font-semibold text-text">
                    2. Daily Costs
                  </h3>
                  <span className="text-[10px] font-mono text-text-muted">
                    Everyday expenses logged for {getMonthDisplayName(selectedMonthYear)} • Added to this month's cost
                  </span>
                </div>
              </div>

              <span className="text-[10px] font-mono text-text font-semibold">
                {dailyCosts.length} entries • Total: {formatCurrency(summary.totalDailyCosts ?? 0)}
              </span>
            </div>

            {dailyCosts.length === 0 ? (
              <div className="py-8 flex flex-col items-center justify-center text-center bg-surface border border-border rounded-md">
                <ArrowUpRight className="w-7 h-7 text-text-muted mb-1.5" />
                <p className="text-xs font-mono text-text">No daily costs logged for {getMonthDisplayName(selectedMonthYear)} yet.</p>
                <p className="text-[10px] font-mono text-text-muted mt-0.5">
                  Enter daily costs from the Overview tab (Quick Cost) to record daily expenses.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {dailyCosts.map((cost) => (
                  <div
                    key={cost.id}
                    className="p-3 bg-surface border border-border rounded-md flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div
                        className="w-6 h-6 rounded-md border border-text bg-surface flex items-center justify-center shrink-0 mt-0.5"
                        title="Daily cost logged and paid"
                      >
                        <span className="w-4 h-4 rounded-full bg-text text-bg flex items-center justify-center animate-check-pop">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </span>
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-semibold text-text truncate">
                            {cost.title}
                          </h4>
                          <span className="px-1.5 py-0.2 text-[9px] font-mono bg-text/10 text-text font-semibold border border-border rounded-xs">
                            Daily Cost
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-mono text-text-muted mt-1">
                          <span>Logged: {cost.dueDateStr}</span>
                          <span>
                            Paid from: {cost.paidFromAccountName || accounts.find((a) => a.id === cost.paidFromAccountId)?.name || "Account"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pl-9 sm:pl-0">
                      <div className="text-right">
                        <span className="text-sm font-mono font-bold text-text block">
                          {formatCurrency(cost.amount)}
                        </span>
                        <span className="text-[9px] font-mono text-text-muted">daily expense</span>
                      </div>

                      {isEditMode && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleDeleteQuickCost(cost.id)}
                            className="interactive-tap p-1.5 rounded-xs text-text-muted hover:text-text hover:bg-surface-hover"
                            title="Delete daily cost and restore balance"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </AnimatedSlideView>
      </div>
    )}

      {/* ============================================================= */}
      {/* TAB: EXPECTED INFLOWS                                         */}
      {/* ============================================================= */}
      {activeTab === "inflows" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xs font-mono uppercase tracking-wider text-text font-semibold">
                Expected Inflows & Coming Money
              </h2>
              <p className="text-[11px] font-mono text-text-muted mt-0.5">
                Monthly recurring streams or one-time probable collections
              </p>
            </div>

            {isEditMode && (
              <button
                onClick={() => {
                  setEditingInflow(null);
                  setIsInflowModalOpen(true);
                }}
                className="interactive-tap flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-text text-bg font-mono text-xs font-semibold hover:opacity-90 transition-opacity"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                <span>New Inflow</span>
              </button>
            )}
          </div>

          {expectedInflows.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center bg-surface border border-border rounded-md">
              <CalendarIcon className="w-8 h-8 text-text-muted mb-2" />
              <p className="text-xs font-mono text-text">No expected inflows recorded.</p>
              <p className="text-[10px] font-mono text-text-muted mt-1">
                Add monthly salaries, freelance payouts, or repayments you are expecting.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {expectedInflows.map((inf) => (
                <div
                  key={inf.id}
                  className={`p-3.5 bg-surface border rounded-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    inf.isReceived ? "border-border/60 bg-surface/50 opacity-70" : "border-border"
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-text">{inf.title}</span>
                      <span className="px-1.5 py-0.2 text-[9px] font-mono bg-bg border border-border text-text-muted rounded-xs">
                        {inf.inflowType}
                      </span>
                      <span
                        className={`px-1.5 py-0.2 text-[9px] font-mono rounded-xs ${
                          inf.confidence === "CERTAIN"
                            ? "bg-text/10 text-text font-semibold"
                            : inf.confidence === "PROBABLE"
                            ? "bg-surface text-text-muted border border-border"
                            : "bg-surface text-text-muted/60 border border-border/50"
                        }`}
                      >
                        {inf.confidence}
                      </span>
                    </div>

                    <span className="text-[10px] font-mono text-text-muted block mt-1">
                      {inf.inflowType === "MONTHLY"
                        ? `Monthly around ${inf.dueDay}th of month`
                        : `Expected: ${inf.expectedDateStr || "Pending"}`}
                      {inf.isReceived && inf.receivedDate ? ` • Received on ${inf.receivedDate}` : ""}
                    </span>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                    <span className="text-sm font-mono font-bold text-text">
                      {formatCurrency(inf.amount)}
                    </span>

                    <div className="flex items-center gap-2">
                      {!inf.isReceived && (
                        <button
                          onClick={() => {
                            setActiveInflowForReceive(inf);
                            setReceiveAccountId(accounts[0]?.id || "");
                            setIsReceiveInflowModalOpen(true);
                          }}
                          className="interactive-tap px-2.5 py-1 rounded-xs bg-text text-bg text-[10px] font-mono font-semibold hover:opacity-90 transition-opacity"
                        >
                          Mark Received
                        </button>
                      )}

                      {isEditMode && (
                        <>
                          {!inf.isQuickInflow && (
                            <button
                              onClick={() => {
                                setEditingInflow(inf);
                                setIsInflowModalOpen(true);
                              }}
                              className="interactive-tap p-1.5 rounded-xs text-text-muted hover:text-text hover:bg-bg"
                              title="Edit Inflow"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <button
                            onClick={() => {
                              if (inf.isQuickInflow) {
                                handleDeleteQuickInflow(inf.id);
                              } else {
                                handleDeleteInflow(inf.id);
                              }
                            }}
                            className="interactive-tap p-1.5 rounded-xs text-text-muted hover:text-text hover:bg-surface-hover"
                            title={inf.isQuickInflow ? "Delete quick income and deduct balance" : "Delete Inflow"}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ============================================================= */}
      {/* TAB: SAVINGS VAULTS (e.g. PS5)                                */}
      {/* ============================================================= */}
      {activeTab === "vaults" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xs font-mono uppercase tracking-wider text-text font-semibold">
                Savings Vaults & Targeted Goals
              </h2>
              <p className="text-[11px] font-mono text-text-muted mt-0.5">
                Lock away money for specific goals (e.g. PlayStation 5, Emergency Fund, Laptop)
              </p>
            </div>

            {isEditMode && (
              <button
                onClick={() => {
                  setEditingVault(null);
                  setIsVaultModalOpen(true);
                }}
                className="interactive-tap flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-text text-bg font-mono text-xs font-semibold hover:opacity-90 transition-opacity"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                <span>New Savings Vault</span>
              </button>
            )}
          </div>

          {savingsVaults.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center bg-surface border border-border rounded-md">
              <PiggyBank className="w-8 h-8 text-text-muted mb-2" />
              <p className="text-xs font-mono text-text">No savings vaults created yet.</p>
              <p className="text-[10px] font-mono text-text-muted mt-1">
                Start stashing money for your dream targets (e.g. PS5, New Phone, Travel).
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {savingsVaults.map((vault) => (
                <div
                  key={vault.id}
                  className={`p-4 bg-surface border rounded-md flex flex-col justify-between space-y-3.5 ${
                    vault.isCompleted ? "border-text/60" : "border-border"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <PiggyBank className="w-4 h-4 text-text" />
                        <h3 className="text-sm font-semibold text-text">{vault.title}</h3>
                        {vault.isCompleted && (
                          <span className="px-1.5 py-0.2 text-[9px] font-mono bg-text text-bg font-bold rounded-xs">
                            ACHIEVED!
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-mono text-text-muted block mt-0.5">
                        {vault.targetDate ? `Target Date: ${vault.targetDate}` : "No deadline"}
                        {vault.monthlyTarget > 0 ? ` • Goal: ${formatCurrency(vault.monthlyTarget)}/mo` : ""}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-base font-bold font-mono text-text block">
                        {formatCurrency(vault.currentAmount)}
                      </span>
                      <span className="text-[10px] font-mono text-text-muted">
                        of {formatCurrency(vault.targetAmount)}
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1">
                    <div className="w-full h-2 bg-bg border border-border rounded-full overflow-hidden">
                      <div
                        className="h-full bg-text transition-all duration-500 rounded-full"
                        style={{ width: `${vault.progressPercent}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-mono text-text-muted">
                      <span>{vault.progressPercent}% complete</span>
                      <span>Remaining: {formatCurrency(vault.remainingAmount)}</span>
                    </div>
                  </div>

                  {/* Vault Actions */}
                  <div className="pt-2 border-t border-border/60 flex items-center justify-between">
                    {isEditMode ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setEditingVault(vault);
                            setIsVaultModalOpen(true);
                          }}
                          className="text-[10px] font-mono text-text-muted hover:text-text"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteVault(vault.id)}
                          className="text-[10px] font-mono text-text-muted hover:text-text"
                        >
                          Delete
                        </button>
                      </div>
                    ) : (
                      <span />
                    )}

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          setActiveVaultForTransact(vault);
                          setVaultTransactType("WITHDRAWAL");
                          setVaultTransactAmount("");
                          setVaultTransactAccountId(accounts[0]?.id || "");
                          setIsVaultTransactModalOpen(true);
                        }}
                        disabled={vault.currentAmount <= 0}
                        className="interactive-tap px-2.5 py-1 rounded-xs bg-bg border border-border hover:border-text text-[10px] font-mono text-text transition-colors disabled:opacity-40"
                      >
                        Withdraw
                      </button>
                      <button
                        onClick={() => {
                          setActiveVaultForTransact(vault);
                          setVaultTransactType("DEPOSIT");
                          setVaultTransactAmount("");
                          setVaultTransactAccountId(accounts[0]?.id || "");
                          setIsVaultTransactModalOpen(true);
                        }}
                        className="interactive-tap px-2.5 py-1 rounded-xs bg-text text-bg font-semibold text-[10px] font-mono hover:opacity-90 transition-opacity"
                      >
                        + Deposit
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ============================================================= */}
      {/* MODALS                                                        */}
      {/* ============================================================= */}

      {/* 1. Account Modal */}
      {isAccountModalOpen && (
        <div className="fixed inset-0 z-50 bg-bg/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-md w-full max-w-md p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <h3 className="text-sm font-semibold font-mono text-text">
                {editingAccount ? "Edit Account" : "Add New Account"}
              </h3>
              <button
                onClick={() => {
                  setIsAccountModalOpen(false);
                  setEditingAccount(null);
                }}
                className="text-text-muted hover:text-text"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAccount} className="space-y-3">
              <div>
                <label className="text-[11px] font-mono text-text-muted block mb-1">Account Name *</label>
                <input
                  name="name"
                  defaultValue={editingAccount?.name || ""}
                  placeholder="e.g. bKash Personal, Brac Bank, Cash in Hand"
                  required
                  className="w-full bg-bg border border-border rounded-xs px-3 py-1.5 text-xs text-text font-mono focus:outline-none focus:border-text"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-mono text-text-muted block mb-1">Account Type *</label>
                  <select
                    name="accountType"
                    defaultValue={editingAccount?.accountType || "CASH"}
                    className="w-full bg-bg border border-border rounded-xs px-2.5 py-1.5 text-xs text-text font-mono focus:outline-none focus:border-text"
                  >
                    <option value="CASH">Cash</option>
                    <option value="BKASH">bKash</option>
                    <option value="NAGAD">Nagad</option>
                    <option value="ROCKET">Rocket</option>
                    <option value="BANK">Bank Account</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-mono text-text-muted block mb-1">Account Number (Opt)</label>
                  <input
                    name="accountNumber"
                    defaultValue={editingAccount?.accountNumber || ""}
                    placeholder="e.g. 0171..., 150..."
                    className="w-full bg-bg border border-border rounded-xs px-3 py-1.5 text-xs text-text font-mono focus:outline-none focus:border-text"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-mono text-text-muted block mb-1">Current Balance (৳) *</label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  name="balance"
                  defaultValue={editingAccount?.balance !== undefined ? editingAccount.balance : 0}
                  required
                  className="w-full bg-bg border border-border rounded-xs px-3 py-1.5 text-xs text-text font-mono focus:outline-none focus:border-text"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isDefault"
                  name="isDefault"
                  defaultChecked={editingAccount?.isDefault || false}
                  className="rounded-xs border-border text-text"
                />
                <label htmlFor="isDefault" className="text-xs font-mono text-text">
                  Set as default account
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => {
                    setIsAccountModalOpen(false);
                    setEditingAccount(null);
                  }}
                  className="px-3 py-1.5 rounded-xs text-xs font-mono text-text-muted hover:text-text"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xs bg-text text-bg font-mono text-xs font-semibold hover:opacity-90"
                >
                  Save Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Transfer Modal */}
      {isTransferModalOpen && (
        <div className="fixed inset-0 z-50 bg-bg/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-md w-full max-w-md p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <h3 className="text-sm font-semibold font-mono text-text">Transfer Between Accounts</h3>
              <button
                onClick={() => setIsTransferModalOpen(false)}
                className="text-text-muted hover:text-text"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleExecuteTransfer} className="space-y-3">
              <div>
                <label className="text-[11px] font-mono text-text-muted block mb-1">From Account *</label>
                <select
                  value={transferFromId}
                  onChange={(e) => setTransferFromId(e.target.value)}
                  required
                  className="w-full bg-bg border border-border rounded-xs px-2.5 py-1.5 text-xs text-text font-mono focus:outline-none focus:border-text"
                >
                  {accounts.map((a) => {
                    const isEmpty = a.balance <= 0;
                    return (
                      <option key={a.id} value={a.id} disabled={isEmpty}>
                        {a.name} ({formatCurrency(a.balance)}){isEmpty ? " [Empty]" : ""}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-mono text-text-muted block mb-1">To Account *</label>
                <select
                  value={transferToId}
                  onChange={(e) => setTransferToId(e.target.value)}
                  required
                  className="w-full bg-bg border border-border rounded-xs px-2.5 py-1.5 text-xs text-text font-mono focus:outline-none focus:border-text"
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id} disabled={a.id === transferFromId}>
                      {a.name} ({formatCurrency(a.balance)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-mono text-text-muted block mb-1">Transfer Amount (৳) *</label>
                  <input
                    type="number"
                    step="any"
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                    placeholder="0.00"
                    required
                    className="w-full bg-bg border border-border rounded-xs px-3 py-1.5 text-xs text-text font-mono focus:outline-none focus:border-text"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-mono text-text-muted block mb-1">Fee (৳, e.g. bKash fee)</label>
                  <input
                    type="number"
                    step="any"
                    value={transferFee}
                    onChange={(e) => setTransferFee(e.target.value)}
                    placeholder="0"
                    className="w-full bg-bg border border-border rounded-xs px-3 py-1.5 text-xs text-text font-mono focus:outline-none focus:border-text"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-mono text-text-muted block mb-1">Notes (Optional)</label>
                <input
                  value={transferNotes}
                  onChange={(e) => setTransferNotes(e.target.value)}
                  placeholder="e.g. ATM withdrawal to cash"
                  className="w-full bg-bg border border-border rounded-xs px-3 py-1.5 text-xs text-text font-mono focus:outline-none focus:border-text"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsTransferModalOpen(false)}
                  className="px-3 py-1.5 rounded-xs text-xs font-mono text-text-muted hover:text-text"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xs bg-text text-bg font-mono text-xs font-semibold hover:opacity-90"
                >
                  Execute Transfer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Debt Modal (Dena / Paona) */}
      {isDebtModalOpen && (
        <div className="fixed inset-0 z-50 bg-bg/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-md w-full max-w-md p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <h3 className="text-sm font-semibold font-mono text-text">
                {editingDebt
                  ? `Edit ${debtModalType === "I_OWE" ? "Dena" : "Paona"}`
                  : `Add ${debtModalType === "I_OWE" ? "Dena (I Owe)" : "Paona (Owes Me)"}`}
              </h3>
              <button
                onClick={() => {
                  setIsDebtModalOpen(false);
                  setEditingDebt(null);
                }}
                className="text-text-muted hover:text-text"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveDebt} className="space-y-3">
              <div>
                <label className="text-[11px] font-mono text-text-muted block mb-1">
                  {debtModalType === "I_OWE" ? "Payable To (Person / Entity) *" : "Receivable From (Person / Entity) *"}
                </label>
                <input
                  name="personName"
                  defaultValue={editingDebt?.personName || ""}
                  placeholder="e.g. Rahim, Karim, Landlord, Bank Loan"
                  required
                  className="w-full bg-bg border border-border rounded-xs px-3 py-1.5 text-xs text-text font-mono focus:outline-none focus:border-text"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-mono text-text-muted block mb-1">Total Amount (৳) *</label>
                  <input
                    type="number"
                    step="any"
                    name="totalAmount"
                    defaultValue={editingDebt?.totalAmount || ""}
                    placeholder="0.00"
                    required
                    className="w-full bg-bg border border-border rounded-xs px-3 py-1.5 text-xs text-text font-mono focus:outline-none focus:border-text"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-mono text-text-muted block mb-1">
                    {debtModalType === "I_OWE" ? "Payment Due Date" : "Expected Collection Date"}
                  </label>
                  <input
                    type="date"
                    name="dueDate"
                    defaultValue={editingDebt?.dueDate || ""}
                    className="w-full bg-bg border border-border rounded-xs px-3 py-1.5 text-xs text-text font-mono focus:outline-none focus:border-text"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-mono text-text-muted block mb-1">Phone Number (Optional)</label>
                <input
                  name="contactNumber"
                  defaultValue={editingDebt?.contactNumber || ""}
                  placeholder="e.g. 017..."
                  className="w-full bg-bg border border-border rounded-xs px-3 py-1.5 text-xs text-text font-mono focus:outline-none focus:border-text"
                />
              </div>

              <div>
                <label className="text-[11px] font-mono text-text-muted block mb-1">Notes (Optional)</label>
                <input
                  name="notes"
                  defaultValue={editingDebt?.notes || ""}
                  placeholder="e.g. Borrowed for emergency"
                  className="w-full bg-bg border border-border rounded-xs px-3 py-1.5 text-xs text-text font-mono focus:outline-none focus:border-text"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => {
                    setIsDebtModalOpen(false);
                    setEditingDebt(null);
                  }}
                  className="px-3 py-1.5 rounded-xs text-xs font-mono text-text-muted hover:text-text"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xs bg-text text-bg font-mono text-xs font-semibold hover:opacity-90"
                >
                  Save Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Debt Payment Modal */}
      {isDebtPaymentModalOpen && activeDebtForPayment && (
        <div className="fixed inset-0 z-50 bg-bg/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-md w-full max-w-md p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <h3 className="text-sm font-semibold font-mono text-text">
                {activeDebtForPayment.type === "I_OWE"
                  ? `Pay Dena: ${activeDebtForPayment.personName}`
                  : `Collect Paona: ${activeDebtForPayment.personName}`}
              </h3>
              <button
                onClick={() => {
                  setIsDebtPaymentModalOpen(false);
                  setActiveDebtForPayment(null);
                }}
                className="text-text-muted hover:text-text"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRecordDebtPayment} className="space-y-3">
              <div className="p-3 bg-bg border border-border rounded-xs flex items-center justify-between text-xs font-mono">
                <span className="text-text-muted">Remaining Balance:</span>
                <span className="font-bold text-text">{formatCurrency(activeDebtForPayment.remainingAmount)}</span>
              </div>

              <div>
                <label className="text-[11px] font-mono text-text-muted block mb-1">Amount to Record (৳) *</label>
                <input
                  type="number"
                  step="any"
                  value={debtPayAmount}
                  onChange={(e) => setDebtPayAmount(e.target.value)}
                  required
                  className="w-full bg-bg border border-border rounded-xs px-3 py-1.5 text-xs text-text font-mono focus:outline-none focus:border-text"
                />
              </div>

              <div>
                <label className="text-[11px] font-mono text-text-muted block mb-1">
                  {activeDebtForPayment.type === "I_OWE"
                    ? "Deduct from Account (Optional)"
                    : "Deposit into Account (Optional)"}
                </label>
                <select
                  value={debtPayAccountId}
                  onChange={(e) => setDebtPayAccountId(e.target.value)}
                  className="w-full bg-bg border border-border rounded-xs px-2.5 py-1.5 text-xs text-text font-mono focus:outline-none focus:border-text"
                >
                  <option value="">No automatic balance adjustment</option>
                  {accounts.map((a) => {
                    const payNum = parseFloat(debtPayAmount) || 0;
                    const isInsufficient = activeDebtForPayment.type === "I_OWE" && a.balance < payNum;
                    return (
                      <option key={a.id} value={a.id} disabled={isInsufficient}>
                        {a.name} ({formatCurrency(a.balance)}){isInsufficient ? " [Insufficient]" : ""}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-mono text-text-muted block mb-1">Notes (Optional)</label>
                <input
                  value={debtPayNotes}
                  onChange={(e) => setDebtPayNotes(e.target.value)}
                  placeholder="e.g. Paid part via bKash"
                  className="w-full bg-bg border border-border rounded-xs px-3 py-1.5 text-xs text-text font-mono focus:outline-none focus:border-text"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => {
                    setIsDebtPaymentModalOpen(false);
                    setActiveDebtForPayment(null);
                  }}
                  className="px-3 py-1.5 rounded-xs text-xs font-mono text-text-muted hover:text-text"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xs bg-text text-bg font-mono text-xs font-semibold hover:opacity-90"
                >
                  Confirm Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Monthly Cost Modal (Home Rent e.g. 1 Jan 2026 -> 31 Dec 2027, Due 3rd) */}
      {isMonthlyCostModalOpen && (
        <div className="fixed inset-0 z-50 bg-bg/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-md w-full max-w-md p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <h3 className="text-sm font-semibold font-mono text-text">
                {editingMonthlyCost ? "Edit Monthly Cost" : "New Recurring Monthly Cost"}
              </h3>
              <button
                onClick={() => {
                  setIsMonthlyCostModalOpen(false);
                  setEditingMonthlyCost(null);
                }}
                className="text-text-muted hover:text-text"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveMonthlyCost} className="space-y-3">
              <div>
                <label className="text-[11px] font-mono text-text-muted block mb-1">Title *</label>
                <input
                  name="title"
                  defaultValue={editingMonthlyCost?.title || ""}
                  placeholder="e.g. Home Rent, Mess Bill, Wifi, Gym"
                  required
                  className="w-full bg-bg border border-border rounded-xs px-3 py-1.5 text-xs text-text font-mono focus:outline-none focus:border-text"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-mono text-text-muted block mb-1">Monthly Amount (৳) *</label>
                  <input
                    type="number"
                    step="any"
                    name="amount"
                    defaultValue={editingMonthlyCost?.amount || ""}
                    placeholder="15000"
                    required
                    className="w-full bg-bg border border-border rounded-xs px-3 py-1.5 text-xs text-text font-mono focus:outline-none focus:border-text"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-mono text-text-muted block mb-1">Due Day of Month (1 - 31) *</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    name="dueDayOfMonth"
                    defaultValue={editingMonthlyCost?.dueDayOfMonth || 3}
                    required
                    className="w-full bg-bg border border-border rounded-xs px-3 py-1.5 text-xs text-text font-mono focus:outline-none focus:border-text"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-mono text-text-muted block mb-1">Contract Start Date *</label>
                  <input
                    type="date"
                    name="startDate"
                    defaultValue={editingMonthlyCost?.startDate || new Date().toISOString().split("T")[0]}
                    required
                    className="w-full bg-bg border border-border rounded-xs px-3 py-1.5 text-xs text-text font-mono focus:outline-none focus:border-text"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-mono text-text-muted block mb-1">Contract End Date (Optional)</label>
                  <input
                    type="date"
                    name="endDate"
                    defaultValue={editingMonthlyCost?.endDate || ""}
                    placeholder="Ongoing if empty"
                    className="w-full bg-bg border border-border rounded-xs px-3 py-1.5 text-xs text-text font-mono focus:outline-none focus:border-text"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-mono text-text-muted block mb-1">Category</label>
                  <select
                    name="category"
                    defaultValue={editingMonthlyCost?.category || "Housing"}
                    className="w-full bg-bg border border-border rounded-xs px-2.5 py-1.5 text-xs text-text font-mono focus:outline-none focus:border-text"
                  >
                    <option value="Housing">Housing / Rent</option>
                    <option value="Utility">Utility & Bills</option>
                    <option value="Food">Food / Mess</option>
                    <option value="Family">Family Support</option>
                    <option value="Subscription">Subscription</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-mono text-text-muted block mb-1">Default Account</label>
                  <select
                    name="defaultAccountId"
                    defaultValue={editingMonthlyCost?.defaultAccountId || ""}
                    className="w-full bg-bg border border-border rounded-xs px-2.5 py-1.5 text-xs text-text font-mono focus:outline-none focus:border-text"
                  >
                    <option value="">None</option>
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-mono text-text-muted block mb-1">Notes (Optional)</label>
                <input
                  name="notes"
                  defaultValue={editingMonthlyCost?.notes || ""}
                  placeholder="e.g. Includes water and gas"
                  className="w-full bg-bg border border-border rounded-xs px-3 py-1.5 text-xs text-text font-mono focus:outline-none focus:border-text"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => {
                    setIsMonthlyCostModalOpen(false);
                    setEditingMonthlyCost(null);
                  }}
                  className="px-3 py-1.5 rounded-xs text-xs font-mono text-text-muted hover:text-text"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xs bg-text text-bg font-mono text-xs font-semibold hover:opacity-90"
                >
                  Save Contract
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Pay Monthly Cost Modal */}
      {isPayMonthlyModalOpen && activeMonthlyCostForPay && (
        <div className="fixed inset-0 z-50 bg-bg/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-md w-full max-w-md p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <h3 className="text-sm font-semibold font-mono text-text">
                Pay: {activeMonthlyCostForPay.title} for {selectedMonthYear}
              </h3>
              <button
                onClick={() => {
                  setIsPayMonthlyModalOpen(false);
                  setActiveMonthlyCostForPay(null);
                }}
                className="text-text-muted hover:text-text"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmPayMonthly} className="space-y-3">
              <div className="p-3 bg-bg border border-border rounded-xs flex items-center justify-between text-xs font-mono">
                <span className="text-text-muted">Amount Due:</span>
                <span className="font-bold text-text">{formatCurrency(activeMonthlyCostForPay.amount)}</span>
              </div>

              <div>
                <label className="text-[11px] font-mono text-text-muted block mb-1">Deduct from Account</label>
                <select
                  value={monthlyPayAccountId}
                  onChange={(e) => setMonthlyPayAccountId(e.target.value)}
                  className="w-full bg-bg border border-border rounded-xs px-2.5 py-1.5 text-xs text-text font-mono focus:outline-none focus:border-text"
                >
                  <option value="">Do not deduct from any account</option>
                  {accounts.map((a) => {
                    const costNum = activeMonthlyCostForPay?.amount || 0;
                    const isInsufficient = a.balance < costNum;
                    return (
                      <option key={a.id} value={a.id} disabled={isInsufficient}>
                        {a.name} ({formatCurrency(a.balance)}){isInsufficient ? " [Insufficient]" : ""}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => {
                    setIsPayMonthlyModalOpen(false);
                    setActiveMonthlyCostForPay(null);
                  }}
                  className="px-3 py-1.5 rounded-xs text-xs font-mono text-text-muted hover:text-text"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xs bg-text text-bg font-mono text-xs font-semibold hover:opacity-90"
                >
                  Confirm Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. Expected Inflow Modal */}
      {isInflowModalOpen && (
        <div className="fixed inset-0 z-50 bg-bg/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-md w-full max-w-md p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <h3 className="text-sm font-semibold font-mono text-text">
                {editingInflow ? "Edit Expected Inflow" : "New Expected Inflow"}
              </h3>
              <button
                onClick={() => {
                  setIsInflowModalOpen(false);
                  setEditingInflow(null);
                }}
                className="text-text-muted hover:text-text"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveInflow} className="space-y-3">
              <div>
                <label className="text-[11px] font-mono text-text-muted block mb-1">Title *</label>
                <input
                  name="title"
                  defaultValue={editingInflow?.title || ""}
                  placeholder="e.g. Monthly Salary, Freelance Web Project, Tuition"
                  required
                  className="w-full bg-bg border border-border rounded-xs px-3 py-1.5 text-xs text-text font-mono focus:outline-none focus:border-text"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-mono text-text-muted block mb-1">Amount (৳) *</label>
                  <input
                    type="number"
                    step="any"
                    name="amount"
                    defaultValue={editingInflow?.amount || ""}
                    placeholder="25000"
                    required
                    className="w-full bg-bg border border-border rounded-xs px-3 py-1.5 text-xs text-text font-mono focus:outline-none focus:border-text"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-mono text-text-muted block mb-1">Inflow Type *</label>
                  <select
                    name="inflowType"
                    defaultValue={editingInflow?.inflowType || "MONTHLY"}
                    className="w-full bg-bg border border-border rounded-xs px-2.5 py-1.5 text-xs text-text font-mono focus:outline-none focus:border-text"
                  >
                    <option value="MONTHLY">Monthly Recurring</option>
                    <option value="ONE_TIME">One-Time Projected</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-mono text-text-muted block mb-1">Due Day of Month</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    name="dueDay"
                    defaultValue={editingInflow?.dueDay || 5}
                    placeholder="Day 1-31 (if monthly)"
                    className="w-full bg-bg border border-border rounded-xs px-3 py-1.5 text-xs text-text font-mono focus:outline-none focus:border-text"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-mono text-text-muted block mb-1">Confidence</label>
                  <select
                    name="confidence"
                    defaultValue={editingInflow?.confidence || "CERTAIN"}
                    className="w-full bg-bg border border-border rounded-xs px-2.5 py-1.5 text-xs text-text font-mono focus:outline-none focus:border-text"
                  >
                    <option value="CERTAIN">Certain (Guaranteed)</option>
                    <option value="PROBABLE">Probable (Likely)</option>
                    <option value="TENTATIVE">Tentative (Uncertain)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-mono text-text-muted block mb-1">Specific Expected Date (if one-time)</label>
                <input
                  type="date"
                  name="expectedDate"
                  defaultValue={editingInflow?.expectedDateStr || ""}
                  className="w-full bg-bg border border-border rounded-xs px-3 py-1.5 text-xs text-text font-mono focus:outline-none focus:border-text"
                />
              </div>

              <div>
                <label className="text-[11px] font-mono text-text-muted block mb-1">Notes (Optional)</label>
                <input
                  name="notes"
                  defaultValue={editingInflow?.notes || ""}
                  placeholder="e.g. Usually disbursed between 5th and 7th"
                  className="w-full bg-bg border border-border rounded-xs px-3 py-1.5 text-xs text-text font-mono focus:outline-none focus:border-text"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => {
                    setIsInflowModalOpen(false);
                    setEditingInflow(null);
                  }}
                  className="px-3 py-1.5 rounded-xs text-xs font-mono text-text-muted hover:text-text"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xs bg-text text-bg font-mono text-xs font-semibold hover:opacity-90"
                >
                  Save Inflow
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 8. Receive Inflow Modal */}
      {isReceiveInflowModalOpen && activeInflowForReceive && (
        <div className="fixed inset-0 z-50 bg-bg/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-md w-full max-w-md p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <h3 className="text-sm font-semibold font-mono text-text">
                Receive: {activeInflowForReceive.title}
              </h3>
              <button
                onClick={() => {
                  setIsReceiveInflowModalOpen(false);
                  setActiveInflowForReceive(null);
                }}
                className="text-text-muted hover:text-text"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmReceiveInflow} className="space-y-3">
              <div className="p-3 bg-bg border border-border rounded-xs flex items-center justify-between text-xs font-mono">
                <span className="text-text-muted">Amount Received:</span>
                <span className="font-bold text-text">{formatCurrency(activeInflowForReceive.amount)}</span>
              </div>

              <div>
                <label className="text-[11px] font-mono text-text-muted block mb-1">Deposit into Account</label>
                <select
                  value={receiveAccountId}
                  onChange={(e) => setReceiveAccountId(e.target.value)}
                  className="w-full bg-bg border border-border rounded-xs px-2.5 py-1.5 text-xs text-text font-mono focus:outline-none focus:border-text"
                >
                  <option value="">Do not deposit to any account</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({formatCurrency(a.balance)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => {
                    setIsReceiveInflowModalOpen(false);
                    setActiveInflowForReceive(null);
                  }}
                  className="px-3 py-1.5 rounded-xs text-xs font-mono text-text-muted hover:text-text"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xs bg-text text-bg font-mono text-xs font-semibold hover:opacity-90"
                >
                  Confirm Receipt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 9. Savings Vault Modal (e.g. PS5) */}
      {isVaultModalOpen && (
        <div className="fixed inset-0 z-50 bg-bg/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-md w-full max-w-md p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <h3 className="text-sm font-semibold font-mono text-text">
                {editingVault ? "Edit Savings Vault" : "New Savings Vault (e.g. PS5)"}
              </h3>
              <button
                onClick={() => {
                  setIsVaultModalOpen(false);
                  setEditingVault(null);
                }}
                className="text-text-muted hover:text-text"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveVault} className="space-y-3">
              <div>
                <label className="text-[11px] font-mono text-text-muted block mb-1">Vault Goal Title *</label>
                <input
                  name="title"
                  defaultValue={editingVault?.title || ""}
                  placeholder="e.g. PlayStation 5, Emergency Fund, New Laptop"
                  required
                  className="w-full bg-bg border border-border rounded-xs px-3 py-1.5 text-xs text-text font-mono focus:outline-none focus:border-text"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-mono text-text-muted block mb-1">Target Amount (৳) *</label>
                  <input
                    type="number"
                    step="any"
                    name="targetAmount"
                    defaultValue={editingVault?.targetAmount || ""}
                    placeholder="75000"
                    required
                    className="w-full bg-bg border border-border rounded-xs px-3 py-1.5 text-xs text-text font-mono focus:outline-none focus:border-text"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-mono text-text-muted block mb-1">Monthly Plan (৳/mo)</label>
                  <input
                    type="number"
                    step="any"
                    name="monthlyAmount"
                    defaultValue={editingVault?.monthlyTarget || ""}
                    placeholder="5000"
                    className="w-full bg-bg border border-border rounded-xs px-3 py-1.5 text-xs text-text font-mono focus:outline-none focus:border-text"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-mono text-text-muted block mb-1">Target Date (Optional)</label>
                <input
                  type="date"
                  name="targetDate"
                  defaultValue={editingVault?.targetDate || ""}
                  className="w-full bg-bg border border-border rounded-xs px-3 py-1.5 text-xs text-text font-mono focus:outline-none focus:border-text"
                />
              </div>

              <div>
                <label className="text-[11px] font-mono text-text-muted block mb-1">Notes (Optional)</label>
                <input
                  name="notes"
                  defaultValue={editingVault?.notes || ""}
                  placeholder="e.g. Target PS5 Disc Edition + 2 Controllers"
                  className="w-full bg-bg border border-border rounded-xs px-3 py-1.5 text-xs text-text font-mono focus:outline-none focus:border-text"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => {
                    setIsVaultModalOpen(false);
                    setEditingVault(null);
                  }}
                  className="px-3 py-1.5 rounded-xs text-xs font-mono text-text-muted hover:text-text"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xs bg-text text-bg font-mono text-xs font-semibold hover:opacity-90"
                >
                  Save Vault
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 10. Vault Transaction Modal (Deposit / Withdraw) */}
      {isVaultTransactModalOpen && activeVaultForTransact && (
        <div className="fixed inset-0 z-50 bg-bg/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-md w-full max-w-md p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <h3 className="text-sm font-semibold font-mono text-text">
                {vaultTransactType === "DEPOSIT" ? "Stash Money into Vault" : "Withdraw from Vault"}
              </h3>
              <button
                onClick={() => {
                  setIsVaultTransactModalOpen(false);
                  setActiveVaultForTransact(null);
                }}
                className="text-text-muted hover:text-text"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleExecuteVaultTransaction} className="space-y-3">
              <div className="p-3 bg-bg border border-border rounded-xs flex items-center justify-between text-xs font-mono">
                <span className="text-text-muted">{activeVaultForTransact.title}:</span>
                <span className="font-bold text-text">
                  Current: {formatCurrency(activeVaultForTransact.currentAmount)}
                </span>
              </div>

              <div>
                <label className="text-[11px] font-mono text-text-muted block mb-1">
                  {vaultTransactType === "DEPOSIT" ? "Amount to Stash (৳) *" : "Amount to Withdraw (৳) *"}
                </label>
                <input
                  type="number"
                  step="any"
                  value={vaultTransactAmount}
                  onChange={(e) => setVaultTransactAmount(e.target.value)}
                  placeholder="0.00"
                  required
                  className="w-full bg-bg border border-border rounded-xs px-3 py-1.5 text-xs text-text font-mono focus:outline-none focus:border-text"
                />
              </div>

              <div>
                <label className="text-[11px] font-mono text-text-muted block mb-1">
                  {vaultTransactType === "DEPOSIT" ? "Deduct from Account" : "Deposit into Account"}
                </label>
                <select
                  value={vaultTransactAccountId}
                  onChange={(e) => setVaultTransactAccountId(e.target.value)}
                  className="w-full bg-bg border border-border rounded-xs px-2.5 py-1.5 text-xs text-text font-mono focus:outline-none focus:border-text"
                >
                  <option value="">No linked account balance movement</option>
                  {accounts.map((a) => {
                    const depositNum = parseFloat(vaultTransactAmount) || 0;
                    const isInsufficient = vaultTransactType === "DEPOSIT" && a.balance < depositNum;
                    return (
                      <option key={a.id} value={a.id} disabled={isInsufficient}>
                        {a.name} ({formatCurrency(a.balance)}){isInsufficient ? " [Insufficient]" : ""}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-mono text-text-muted block mb-1">Notes (Optional)</label>
                <input
                  value={vaultTransactNotes}
                  onChange={(e) => setVaultTransactNotes(e.target.value)}
                  placeholder="e.g. November savings contribution"
                  className="w-full bg-bg border border-border rounded-xs px-3 py-1.5 text-xs text-text font-mono focus:outline-none focus:border-text"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => {
                    setIsVaultTransactModalOpen(false);
                    setActiveVaultForTransact(null);
                  }}
                  className="px-3 py-1.5 rounded-xs text-xs font-mono text-text-muted hover:text-text"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xs bg-text text-bg font-mono text-xs font-semibold hover:opacity-90"
                >
                  {vaultTransactType === "DEPOSIT" ? "Confirm Stash" : "Confirm Withdrawal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinancePage;
