import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import { api } from "../../lib/api";
import {
  TabType,
  AccountItem,
  DebtItem,
  MonthlyCostItem,
  ExpectedInflowItem,
  SavingsVaultItem,
  FinanceOverviewResponse,
} from "./types";

interface FinanceContextType {
  data: FinanceOverviewResponse | null;
  summary: FinanceOverviewResponse["summary"] | undefined;
  accounts: AccountItem[];
  denaList: DebtItem[];
  paonaList: DebtItem[];
  monthlyCosts: MonthlyCostItem[];
  expectedInflows: ExpectedInflowItem[];
  savingsVaults: SavingsVaultItem[];
  isLoading: boolean;
  isSubmitting: boolean;
  isEditMode: boolean;
  setIsEditMode: React.Dispatch<React.SetStateAction<boolean>>;
  activeTab: TabType;
  setActiveTab: React.Dispatch<React.SetStateAction<TabType>>;
  selectedMonthYear: string;
  setSelectedMonthYear: React.Dispatch<React.SetStateAction<string>>;
  animKey: number;
  slideDirection: "left" | "right";
  handlePrevMonth: () => void;
  handleNextMonth: () => void;
  handleCurrentMonth: () => void;
  fetchFinanceData: (monthYear: string) => Promise<void>;

  // Quick Cost
  quickCostStep: 1 | 2 | 3;
  setQuickCostStep: React.Dispatch<React.SetStateAction<1 | 2 | 3>>;
  quickCostAmount: string;
  setQuickCostAmount: React.Dispatch<React.SetStateAction<string>>;
  quickCostTitle: string;
  setQuickCostTitle: React.Dispatch<React.SetStateAction<string>>;
  quickCostAccountId: string;
  setQuickCostAccountId: React.Dispatch<React.SetStateAction<string>>;
  quickCostSelectRef: React.RefObject<HTMLSelectElement>;
  resetQuickCost: () => void;
  handleQuickCostStep1: () => void;
  handleQuickCostStep2: () => void;
  handleQuickCostSubmit: () => Promise<void>;
  handleDeleteQuickCost: (id: string) => Promise<void>;

  // Quick Add
  quickAddStep: 1 | 2 | 3;
  setQuickAddStep: React.Dispatch<React.SetStateAction<1 | 2 | 3>>;
  quickAddAmount: string;
  setQuickAddAmount: React.Dispatch<React.SetStateAction<string>>;
  quickAddTitle: string;
  setQuickAddTitle: React.Dispatch<React.SetStateAction<string>>;
  quickAddAccountId: string;
  setQuickAddAccountId: React.Dispatch<React.SetStateAction<string>>;
  quickAddSelectRef: React.RefObject<HTMLSelectElement>;
  resetQuickAdd: () => void;
  handleQuickAddStep1: () => void;
  handleQuickAddStep2: () => void;
  handleQuickAddSubmit: () => Promise<void>;
  handleDeleteQuickInflow: (id: string) => Promise<void>;

  // Modals & States
  isAccountModalOpen: boolean;
  setIsAccountModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  editingAccount: AccountItem | null;
  setEditingAccount: React.Dispatch<React.SetStateAction<AccountItem | null>>;
  handleSaveAccount: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
  handleDeleteAccount: (id: string) => Promise<void>;

  isTransferModalOpen: boolean;
  setIsTransferModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  transferFromId: string;
  setTransferFromId: React.Dispatch<React.SetStateAction<string>>;
  transferToId: string;
  setTransferToId: React.Dispatch<React.SetStateAction<string>>;
  transferAmount: string;
  setTransferAmount: React.Dispatch<React.SetStateAction<string>>;
  transferFee: string;
  setTransferFee: React.Dispatch<React.SetStateAction<string>>;
  transferNotes: string;
  setTransferNotes: React.Dispatch<React.SetStateAction<string>>;
  handleExecuteTransfer: (e: React.FormEvent) => Promise<void>;

  isDebtModalOpen: boolean;
  setIsDebtModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  debtModalType: "I_OWE" | "OWES_ME";
  setDebtModalType: React.Dispatch<React.SetStateAction<"I_OWE" | "OWES_ME">>;
  editingDebt: DebtItem | null;
  setEditingDebt: React.Dispatch<React.SetStateAction<DebtItem | null>>;
  selectedDebtForDetail: DebtItem | null;
  setSelectedDebtForDetail: React.Dispatch<React.SetStateAction<DebtItem | null>>;
  handleSaveDebt: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
  handleDeleteDebt: (id: string) => Promise<void>;

  isDebtPaymentModalOpen: boolean;
  setIsDebtPaymentModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  activeDebtForPayment: DebtItem | null;
  setActiveDebtForPayment: React.Dispatch<React.SetStateAction<DebtItem | null>>;
  debtPayAmount: string;
  setDebtPayAmount: React.Dispatch<React.SetStateAction<string>>;
  debtPayAccountId: string;
  setDebtPayAccountId: React.Dispatch<React.SetStateAction<string>>;
  debtPayNotes: string;
  setDebtPayNotes: React.Dispatch<React.SetStateAction<string>>;
  handleRecordDebtPayment: (e: React.FormEvent) => Promise<void>;
  handleDeleteDebtPaymentLog: (debtId: string, paymentId: string) => Promise<void>;

  isMonthlyCostModalOpen: boolean;
  setIsMonthlyCostModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  editingMonthlyCost: MonthlyCostItem | null;
  setEditingMonthlyCost: React.Dispatch<React.SetStateAction<MonthlyCostItem | null>>;
  costModalType: "ONE_TIME" | "REPEATING";
  setCostModalType: React.Dispatch<React.SetStateAction<"ONE_TIME" | "REPEATING">>;
  handleSaveMonthlyCost: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
  handleDeleteMonthlyCost: (id: string) => Promise<void>;

  isPayMonthlyModalOpen: boolean;
  setIsPayMonthlyModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  activeMonthlyCostForPay: MonthlyCostItem | null;
  setActiveMonthlyCostForPay: React.Dispatch<React.SetStateAction<MonthlyCostItem | null>>;
  monthlyPayAccountId: string;
  setMonthlyPayAccountId: React.Dispatch<React.SetStateAction<string>>;
  monthlyPayAmount: string;
  setMonthlyPayAmount: React.Dispatch<React.SetStateAction<string>>;
  handleToggleMonthlyPayment: (cost: MonthlyCostItem) => Promise<void>;
  handleConfirmPayMonthly: (e: React.FormEvent) => Promise<void>;

  isInflowModalOpen: boolean;
  setIsInflowModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  editingInflow: ExpectedInflowItem | null;
  setEditingInflow: React.Dispatch<React.SetStateAction<ExpectedInflowItem | null>>;
  inflowModalType: "ONE_TIME" | "MONTHLY";
  setInflowModalType: React.Dispatch<React.SetStateAction<"ONE_TIME" | "MONTHLY">>;
  handleSaveInflow: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
  handleDeleteInflow: (id: string) => Promise<void>;

  isReceiveInflowModalOpen: boolean;
  setIsReceiveInflowModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  activeInflowForReceive: ExpectedInflowItem | null;
  setActiveInflowForReceive: React.Dispatch<React.SetStateAction<ExpectedInflowItem | null>>;
  receiveAccountId: string;
  setReceiveAccountId: React.Dispatch<React.SetStateAction<string>>;
  receiveInflowAmount: string;
  setReceiveInflowAmount: React.Dispatch<React.SetStateAction<string>>;
  handleConfirmReceiveInflow: (e: React.FormEvent) => Promise<void>;
  handleRevertInflow: (inflowId: string) => Promise<void>;

  isVaultModalOpen: boolean;
  setIsVaultModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  editingVault: SavingsVaultItem | null;
  setEditingVault: React.Dispatch<React.SetStateAction<SavingsVaultItem | null>>;
  handleSaveVault: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
  handleDeleteVault: (id: string) => Promise<void>;

  isVaultTransactModalOpen: boolean;
  setIsVaultTransactModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  activeVaultForTransact: SavingsVaultItem | null;
  setActiveVaultForTransact: React.Dispatch<React.SetStateAction<SavingsVaultItem | null>>;
  vaultTransactType: "DEPOSIT" | "WITHDRAWAL";
  setVaultTransactType: React.Dispatch<React.SetStateAction<"DEPOSIT" | "WITHDRAWAL">>;
  vaultTransactAmount: string;
  setVaultTransactAmount: React.Dispatch<React.SetStateAction<string>>;
  vaultTransactAccountId: string;
  setVaultTransactAccountId: React.Dispatch<React.SetStateAction<string>>;
  vaultTransactNotes: string;
  setVaultTransactNotes: React.Dispatch<React.SetStateAction<string>>;
  handleExecuteVaultTransaction: (e: React.FormEvent) => Promise<void>;

  // Computed values
  netAmount: number;
  sortedDenaList: DebtItem[];
  sortedPaonaList: DebtItem[];
  allUnsettledDebts: DebtItem[];
  sortedMonthlyCosts: MonthlyCostItem[];
  sortedVaults: SavingsVaultItem[];
  sortedAccounts: AccountItem[];
  thisMonthDena: DebtItem[];
  pendingDenaThisMonth: DebtItem[];
  denaPaymentsThisMonth: {
    debtId: string;
    paymentId: string;
    personName: string;
    amount: number;
    date: string;
    accountId: string | null;
    accountName: string | null;
    notes: string | null;
  }[];
  repeatingCosts: MonthlyCostItem[];
  pendingRepeatingCosts: MonthlyCostItem[];
  paidRepeatingCosts: MonthlyCostItem[];
  dailyCosts: MonthlyCostItem[];
  totalMonthCostsCalculated: number;
  totalMonthlyCostDueCalculated: number;
  thisMonthPaona: DebtItem[];
  pendingPaonaThisMonth: DebtItem[];
  paonaCollectionsThisMonth: {
    debtId: string;
    paymentId: string;
    personName: string;
    amount: number;
    date: string;
    accountId: string | null;
    accountName: string | null;
    notes: string | null;
  }[];
  pendingRepeatingIncomes: ExpectedInflowItem[];
  receivedRepeatingIncomes: ExpectedInflowItem[];
  pendingOneTimeIncomes: ExpectedInflowItem[];
  receivedOneTimeIncomes: ExpectedInflowItem[];
  totalThisMonthExpectedIncomeCalculated: number;
  totalPendingInflowsCalculated: number;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export const FinanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
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
  const [selectedDebtForDetail, setSelectedDebtForDetail] = useState<DebtItem | null>(null);

  const [isDebtPaymentModalOpen, setIsDebtPaymentModalOpen] = useState(false);
  const [activeDebtForPayment, setActiveDebtForPayment] = useState<DebtItem | null>(null);
  const [debtPayAmount, setDebtPayAmount] = useState("");
  const [debtPayAccountId, setDebtPayAccountId] = useState("");
  const [debtPayNotes, setDebtPayNotes] = useState("");

  const [isMonthlyCostModalOpen, setIsMonthlyCostModalOpen] = useState(false);
  const [editingMonthlyCost, setEditingMonthlyCost] = useState<MonthlyCostItem | null>(null);
  const [costModalType, setCostModalType] = useState<"ONE_TIME" | "REPEATING">("ONE_TIME");

  const [isPayMonthlyModalOpen, setIsPayMonthlyModalOpen] = useState(false);
  const [activeMonthlyCostForPay, setActiveMonthlyCostForPay] = useState<MonthlyCostItem | null>(null);
  const [monthlyPayAccountId, setMonthlyPayAccountId] = useState("");
  const [monthlyPayAmount, setMonthlyPayAmount] = useState("");

  const [isInflowModalOpen, setIsInflowModalOpen] = useState(false);
  const [editingInflow, setEditingInflow] = useState<ExpectedInflowItem | null>(null);
  const [inflowModalType, setInflowModalType] = useState<"ONE_TIME" | "MONTHLY">("ONE_TIME");

  const [isReceiveInflowModalOpen, setIsReceiveInflowModalOpen] = useState(false);
  const [activeInflowForReceive, setActiveInflowForReceive] = useState<ExpectedInflowItem | null>(null);
  const [receiveAccountId, setReceiveAccountId] = useState("");
  const [receiveInflowAmount, setReceiveInflowAmount] = useState("");

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

  // Quick Cost Handlers
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

  // Account Handlers
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
      setIsSubmitting(true);
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
    } finally {
      setIsSubmitting(false);
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
      setIsSubmitting(true);
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
    } finally {
      setIsSubmitting(false);
    }
  };

  // Debt Handlers
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
      setIsSubmitting(true);
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
    } finally {
      setIsSubmitting(false);
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
      setIsSubmitting(true);
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
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteDebtPaymentLog = async (debtId: string, paymentId: string) => {
    if (!window.confirm("Undo this payment and restore the account balance?")) return;
    try {
      await api.delete(`/finance/debts/${debtId}/payments/${paymentId}`);
      toast.success("Payment undone and balance restored");
      if (selectedDebtForDetail?.id === debtId) {
        setSelectedDebtForDetail(null);
      }
      fetchFinanceData(selectedMonthYear);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Failed to undo payment");
    }
  };

  // Monthly Cost Handlers
  const handleSaveMonthlyCost = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    if (costModalType === "ONE_TIME" && !editingMonthlyCost) {
      const title = (formData.get("title") as string)?.trim();
      const amount = parseFloat(formData.get("amount") as string) || 0;
      const accountId = (formData.get("accountId") as string) || "";
      const category = (formData.get("category") as string) || "Other";
      const notes = (formData.get("notes") as string) || null;
      const date = (formData.get("date") as string) || new Date().toISOString().split("T")[0];

      if (!title || !amount || !accountId) {
        toast.error("Title, amount, and payment account are required");
        return;
      }
      const chosenAcc = data?.accounts?.find((a) => a.id === accountId);
      if (chosenAcc && chosenAcc.balance < amount) {
        toast.error(`Insufficient balance in ${chosenAcc.name} (৳${chosenAcc.balance}). Account cannot go negative.`);
        return;
      }
      try {
        setIsSubmitting(true);
        await api.post("/finance/quick-transaction", {
          type: "EXPENSE",
          amount,
          title,
          accountId,
          category,
          notes,
          date,
        });
        toast.success(`Logged expense ৳${amount} for ${title}`);
        setIsMonthlyCostModalOpen(false);
        fetchFinanceData(selectedMonthYear);
      } catch (error: any) {
        toast.error(error?.response?.data?.error || "Failed to log cost");
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

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
      setIsSubmitting(true);
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
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteMonthlyCost = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this monthly cost?")) return;
    try {
      await api.delete(`/finance/monthly-costs/${id}?currentMonth=${selectedMonthYear}`);
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
      setMonthlyPayAmount(String(cost.amount));
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

    const payNum = parseFloat(monthlyPayAmount);
    if (isNaN(payNum) || payNum <= 0) {
      toast.error("Please enter a valid payment amount");
      return;
    }

    if (monthlyPayAccountId) {
      const chosenAcc = data?.accounts?.find((a) => a.id === monthlyPayAccountId);
      if (chosenAcc && chosenAcc.balance < payNum) {
        toast.error(`Insufficient balance in ${chosenAcc.name} (৳${chosenAcc.balance}). Account cannot go negative.`);
        return;
      }
    }

    try {
      setIsSubmitting(true);
      await api.post(`/finance/monthly-costs/${activeMonthlyCostForPay.id}/toggle-payment`, {
        monthYear: selectedMonthYear,
        isPaid: true,
        accountId: monthlyPayAccountId || null,
        amountPaid: payNum,
      });
      toast.success(`Paid ${activeMonthlyCostForPay.title} for ${selectedMonthYear}`);
      setIsPayMonthlyModalOpen(false);
      setActiveMonthlyCostForPay(null);
      fetchFinanceData(selectedMonthYear);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Failed to record payment");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Expected Inflow Handlers
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
      setIsSubmitting(true);
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
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteInflow = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this expected inflow?")) return;
    try {
      await api.delete(`/finance/inflows/${id}?currentMonth=${selectedMonthYear}`);
      toast.success("Inflow deleted");
      fetchFinanceData(selectedMonthYear);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Failed to delete inflow");
    }
  };

  const handleConfirmReceiveInflow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeInflowForReceive) return;

    const recNum = parseFloat(receiveInflowAmount);
    if (isNaN(recNum) || recNum <= 0) {
      toast.error("Please enter a valid received amount");
      return;
    }

    try {
      setIsSubmitting(true);
      await api.post(`/finance/inflows/${activeInflowForReceive.id}/received`, {
        accountId: receiveAccountId || null,
        amount: recNum,
        receivedDate: new Date().toISOString().split("T")[0],
      });
      toast.success(`Received ${activeInflowForReceive.title}!`);
      setIsReceiveInflowModalOpen(false);
      setActiveInflowForReceive(null);
      fetchFinanceData(selectedMonthYear);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Failed to mark inflow received");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevertInflow = async (inflowId: string) => {
    if (!window.confirm("Undo received status and revert account balance?")) return;
    try {
      await api.post(`/finance/inflows/${inflowId}/revert`);
      toast.success("Inflow reverted to pending");
      fetchFinanceData(selectedMonthYear);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Failed to revert inflow");
    }
  };

  // Savings Vault Handlers
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
      setIsSubmitting(true);
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
    } finally {
      setIsSubmitting(false);
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
      setIsSubmitting(true);
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
    } finally {
      setIsSubmitting(false);
    }
  };

  // Computed Values
  const summary = data?.summary;
  const accounts = data?.accounts || [];
  const denaList = data?.denaList || [];
  const paonaList = data?.paonaList || [];
  const monthlyCosts = data?.monthlyCosts || [];
  const expectedInflows = data?.expectedInflows || [];
  const savingsVaults = data?.savingsVaults || [];

  const sortDebtsByFastDueDate = (list: DebtItem[]) =>
    [...list].sort((a, b) => {
      if (a.status === "SETTLED" && b.status !== "SETTLED") return 1;
      if (a.status !== "SETTLED" && b.status === "SETTLED") return -1;
      if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
      if (a.dueDate && !a.dueDate) return -1;
      if (!a.dueDate && b.dueDate) return 1;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

  const sortedDenaList = sortDebtsByFastDueDate(denaList);
  const sortedPaonaList = sortDebtsByFastDueDate(paonaList);

  const allUnsettledDebts = [
    ...denaList.filter((d) => d.status !== "SETTLED"),
    ...paonaList.filter((d) => d.status !== "SETTLED"),
  ].sort((a, b) => {
    if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
    if (a.dueDate && !b.dueDate) return -1;
    if (!a.dueDate && b.dueDate) return 1;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

  const sortedMonthlyCosts = [...monthlyCosts].sort((a, b) => {
    const dateA = a.dueDateStr || a.startDate || "";
    const dateB = b.dueDateStr || b.startDate || "";
    return dateA.localeCompare(dateB);
  });

  const sortedVaults = [...savingsVaults].sort((a, b) => {
    const dateA = a.createdAt || "";
    const dateB = b.createdAt || "";
    return dateA.localeCompare(dateB);
  });

  const sortedAccounts = [...accounts].sort((a, b) => {
    return (a as any).createdAt && (b as any).createdAt
      ? new Date((a as any).createdAt).getTime() - new Date((b as any).createdAt).getTime()
      : 0;
  });

  const thisMonthDena = denaList.filter(
    (d) => d.dueDate && d.dueDate.startsWith(selectedMonthYear)
  );
  const pendingDenaThisMonth = thisMonthDena.filter((d) => d.status !== "SETTLED");

  const denaPaymentsThisMonth: {
    debtId: string;
    paymentId: string;
    personName: string;
    amount: number;
    date: string;
    accountId: string | null;
    accountName: string | null;
    notes: string | null;
  }[] = [];
  for (const d of denaList) {
    if (d.paymentLogs) {
      for (const p of d.paymentLogs) {
        if (p.date && p.date.startsWith(selectedMonthYear)) {
          const acc = accounts.find((a) => a.id === p.accountId);
          denaPaymentsThisMonth.push({
            debtId: d.id,
            paymentId: p.id,
            personName: d.personName,
            amount: p.amount,
            date: p.date,
            accountId: p.accountId || null,
            accountName: acc?.name || null,
            notes: p.notes || null,
          });
        }
      }
    }
  }

  const repeatingCosts = monthlyCosts.filter(
    (c) => c.costType === "MONTHLY_REPEATING" || (!c.isQuickCost && !c.costType)
  );
  const pendingRepeatingCosts = repeatingCosts.filter((c) => !c.isPaid);
  const paidRepeatingCosts = repeatingCosts.filter((c) => c.isPaid);

  const dailyCosts = monthlyCosts.filter(
    (c) =>
      (c.costType === "DAILY_COST" || c.isQuickCost) &&
      !c.notes?.startsWith("Paid ") &&
      c.category !== "Monthly Cost"
  );

  const totalMonthCostsCalculated =
    repeatingCosts.reduce((s, c) => s + c.amount, 0) +
    pendingDenaThisMonth.reduce((s, d) => s + d.remainingAmount, 0) +
    denaPaymentsThisMonth.reduce((s, p) => s + p.amount, 0) +
    dailyCosts.reduce((s, c) => s + c.amount, 0);

  const totalMonthlyCostDueCalculated =
    pendingRepeatingCosts.reduce((s, c) => s + c.amount, 0) +
    pendingDenaThisMonth.reduce((s, d) => s + d.remainingAmount, 0);

  const thisMonthPaona = paonaList.filter(
    (p) => p.dueDate && p.dueDate.startsWith(selectedMonthYear)
  );
  const pendingPaonaThisMonth = thisMonthPaona.filter((p) => p.status !== "SETTLED");

  const paonaCollectionsThisMonth: {
    debtId: string;
    paymentId: string;
    personName: string;
    amount: number;
    date: string;
    accountId: string | null;
    accountName: string | null;
    notes: string | null;
  }[] = [];
  for (const p of paonaList) {
    if (p.paymentLogs) {
      for (const log of p.paymentLogs) {
        if (log.date && log.date.startsWith(selectedMonthYear)) {
          const acc = accounts.find((a) => a.id === log.accountId);
          paonaCollectionsThisMonth.push({
            debtId: p.id,
            paymentId: log.id,
            personName: p.personName,
            amount: log.amount,
            date: log.date,
            accountId: log.accountId || null,
            accountName: acc?.name || null,
            notes: log.notes || null,
          });
        }
      }
    }
  }

  const pendingRepeatingIncomes = expectedInflows.filter(
    (inf) => !inf.isReceived && inf.inflowType === "MONTHLY"
  );
  const receivedRepeatingIncomes = expectedInflows.filter(
    (inf) => inf.isReceived && inf.inflowType === "MONTHLY"
  );

  const pendingOneTimeIncomes = expectedInflows.filter(
    (inf) => !inf.isReceived && (inf.inflowType === "ONE_TIME" || !inf.inflowType) && !inf.isQuickInflow
  );
  const receivedOneTimeIncomes = expectedInflows.filter(
    (inf) => (inf.isReceived && (inf.inflowType === "ONE_TIME" || !inf.inflowType)) || inf.isQuickInflow
  );

  const totalThisMonthExpectedIncomeCalculated =
    expectedInflows.reduce((s, inf) => s + inf.amount, 0) +
    pendingPaonaThisMonth.reduce((s, p) => s + p.remainingAmount, 0) +
    paonaCollectionsThisMonth.reduce((s, p) => s + p.amount, 0);

  const totalPendingInflowsCalculated =
    pendingRepeatingIncomes.reduce((s, inf) => s + inf.amount, 0) +
    pendingOneTimeIncomes.reduce((s, inf) => s + inf.amount, 0) +
    pendingPaonaThisMonth.reduce((s, p) => s + p.remainingAmount, 0);

  const netAmount =
    (summary?.totalLiquidBalance || 0) +
    (summary?.totalVaultSavings || 0) +
    (summary?.remainingPaona || 0) -
    (summary?.remainingDena || 0);

  return (
    <FinanceContext.Provider
      value={{
        data,
        summary,
        accounts,
        denaList,
        paonaList,
        monthlyCosts,
        expectedInflows,
        savingsVaults,
        isLoading,
        isSubmitting,
        isEditMode,
        setIsEditMode,
        activeTab,
        setActiveTab,
        selectedMonthYear,
        setSelectedMonthYear,
        animKey,
        slideDirection,
        handlePrevMonth,
        handleNextMonth,
        handleCurrentMonth,
        fetchFinanceData,

        quickCostStep,
        setQuickCostStep,
        quickCostAmount,
        setQuickCostAmount,
        quickCostTitle,
        setQuickCostTitle,
        quickCostAccountId,
        setQuickCostAccountId,
        quickCostSelectRef,
        resetQuickCost,
        handleQuickCostStep1,
        handleQuickCostStep2,
        handleQuickCostSubmit,
        handleDeleteQuickCost,

        quickAddStep,
        setQuickAddStep,
        quickAddAmount,
        setQuickAddAmount,
        quickAddTitle,
        setQuickAddTitle,
        quickAddAccountId,
        setQuickAddAccountId,
        quickAddSelectRef,
        resetQuickAdd,
        handleQuickAddStep1,
        handleQuickAddStep2,
        handleQuickAddSubmit,
        handleDeleteQuickInflow,

        isAccountModalOpen,
        setIsAccountModalOpen,
        editingAccount,
        setEditingAccount,
        handleSaveAccount,
        handleDeleteAccount,

        isTransferModalOpen,
        setIsTransferModalOpen,
        transferFromId,
        setTransferFromId,
        transferToId,
        setTransferToId,
        transferAmount,
        setTransferAmount,
        transferFee,
        setTransferFee,
        transferNotes,
        setTransferNotes,
        handleExecuteTransfer,

        isDebtModalOpen,
        setIsDebtModalOpen,
        debtModalType,
        setDebtModalType,
        editingDebt,
        setEditingDebt,
        selectedDebtForDetail,
        setSelectedDebtForDetail,
        handleSaveDebt,
        handleDeleteDebt,

        isDebtPaymentModalOpen,
        setIsDebtPaymentModalOpen,
        activeDebtForPayment,
        setActiveDebtForPayment,
        debtPayAmount,
        setDebtPayAmount,
        debtPayAccountId,
        setDebtPayAccountId,
        debtPayNotes,
        setDebtPayNotes,
        handleRecordDebtPayment,
        handleDeleteDebtPaymentLog,

        isMonthlyCostModalOpen,
        setIsMonthlyCostModalOpen,
        editingMonthlyCost,
        setEditingMonthlyCost,
        costModalType,
        setCostModalType,
        handleSaveMonthlyCost,
        handleDeleteMonthlyCost,

        isPayMonthlyModalOpen,
        setIsPayMonthlyModalOpen,
        activeMonthlyCostForPay,
        setActiveMonthlyCostForPay,
        monthlyPayAccountId,
        setMonthlyPayAccountId,
        monthlyPayAmount,
        setMonthlyPayAmount,
        handleToggleMonthlyPayment,
        handleConfirmPayMonthly,

        isInflowModalOpen,
        setIsInflowModalOpen,
        editingInflow,
        setEditingInflow,
        inflowModalType,
        setInflowModalType,
        handleSaveInflow,
        handleDeleteInflow,

        isReceiveInflowModalOpen,
        setIsReceiveInflowModalOpen,
        activeInflowForReceive,
        setActiveInflowForReceive,
        receiveAccountId,
        setReceiveAccountId,
        receiveInflowAmount,
        setReceiveInflowAmount,
        handleConfirmReceiveInflow,
        handleRevertInflow,

        isVaultModalOpen,
        setIsVaultModalOpen,
        editingVault,
        setEditingVault,
        handleSaveVault,
        handleDeleteVault,

        isVaultTransactModalOpen,
        setIsVaultTransactModalOpen,
        activeVaultForTransact,
        setActiveVaultForTransact,
        vaultTransactType,
        setVaultTransactType,
        vaultTransactAmount,
        setVaultTransactAmount,
        vaultTransactAccountId,
        setVaultTransactAccountId,
        vaultTransactNotes,
        setVaultTransactNotes,
        handleExecuteVaultTransaction,

        netAmount,
        sortedDenaList,
        sortedPaonaList,
        allUnsettledDebts,
        sortedMonthlyCosts,
        sortedVaults,
        sortedAccounts,
        thisMonthDena,
        pendingDenaThisMonth,
        denaPaymentsThisMonth,
        repeatingCosts,
        pendingRepeatingCosts,
        paidRepeatingCosts,
        dailyCosts,
        totalMonthCostsCalculated,
        totalMonthlyCostDueCalculated,
        thisMonthPaona,
        pendingPaonaThisMonth,
        paonaCollectionsThisMonth,
        pendingRepeatingIncomes,
        receivedRepeatingIncomes,
        pendingOneTimeIncomes,
        receivedOneTimeIncomes,
        totalThisMonthExpectedIncomeCalculated,
        totalPendingInflowsCalculated,
      }}
    >
      {children}
    </FinanceContext.Provider>
  );
};

export const useFinance = () => {
  const context = useContext(FinanceContext);
  if (!context) {
    throw new Error("useFinance must be used within a FinanceProvider");
  }
  return context;
};
