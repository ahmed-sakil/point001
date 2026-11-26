import React from "react";
import {
  Wallet,
  PiggyBank,
  ArrowDownLeft,
  ArrowUpRight,
  Calendar as CalendarIcon,
  Edit3,
  Loader2,
} from "lucide-react";
import { ActionDrawer } from "../components/ui/ActionDrawer";
import { FinanceProvider, useFinance } from "../components/finance/FinanceContext";
import { TabType, formatCurrency } from "../components/finance/types";
import {
  OverviewTab,
  AccountsTab,
  DebtsTab,
  MonthlyCostsTab,
  MonthlyIncomeTab,
  SavingsVaultsTab,
} from "../components/finance/tabs";
import { FinanceModals } from "../components/finance/modals";

export type { TabType } from "../components/finance/types";

const FinancePageContent: React.FC = () => {
  const {
    data,
    summary,
    isLoading,
    isEditMode,
    setIsEditMode,
    activeTab,
    setActiveTab,
    netAmount,
  } = useFinance();

  if (isLoading || !data || !summary) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-text-muted mb-2" />
        <span className="text-xs font-mono text-text-muted">Loading Personal Finance Engine...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16">
      {/* ------------------------------------------------------------- */}
      {/* 1. TOP HEADER & NAVIGATION                                    */}
      {/* ------------------------------------------------------------- */}
      <div className="flex items-center justify-between gap-3 pb-4 border-b border-border">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4 md:w-5 md:h-5 text-text shrink-0" />
            <h1 className="text-lg md:text-2xl font-bold tracking-tight text-text truncate">
              Personal Finance
            </h1>
          </div>
          <p className="text-[11px] md:text-xs font-mono text-text-muted mt-0.5 truncate">
            Net amount: {formatCurrency(netAmount)}
          </p>
        </div>

        {/* Action Controls & Settings Drawer Trigger */}
        <div className="flex items-center gap-2 relative shrink-0">
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
          <p className="text-lg font-bold font-mono text-text mt-1.5 truncate">
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
        <div className={`p-3 bg-surface border rounded-md ${summary.remainingDena > 0 ? "border-text/30" : "border-border"}`}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-mono text-text-muted">Dena (Payables)</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-text-muted" />
          </div>
          <p className={`text-base font-mono text-text mt-1.5 truncate ${summary.remainingDena > 0 ? "font-extrabold" : "font-bold"}`}>
            {formatCurrency(summary.remainingDena)}
          </p>
        </div>

        {/* Metric 5: Month's Costs Due */}
        <div className={`p-3 bg-surface border rounded-md ${summary.totalMonthlyCostDue > 0 ? "border-text/30" : "border-border"}`}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-mono text-text-muted">Month's Cost Due</span>
            <CalendarIcon className={`w-3.5 h-3.5 ${summary.totalMonthlyCostDue > 0 ? "text-text" : "text-text-muted"}`} />
          </div>
          <p className={`text-base font-mono text-text mt-1.5 truncate ${summary.totalMonthlyCostDue > 0 ? "font-extrabold" : "font-bold"}`}>
            {formatCurrency(summary.totalMonthlyCostDue)}
          </p>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 3. SUB-NAVIGATION TABS (CLEAN, NO COUNTERS)                   */}
      {/* ------------------------------------------------------------- */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-border scrollbar-none">
        {[
          { key: "overview", label: "Overview" },
          { key: "accounts", label: "Accounts" },
          { key: "debts", label: "Dena & Paona" },
          { key: "monthly", label: "Monthly Costs" },
          { key: "inflows", label: "Monthly Income" },
          { key: "vaults", label: "Savings Vaults" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as TabType)}
            className={`interactive-tap px-3 py-1.5 text-xs font-mono font-medium rounded-xs transition-colors whitespace-nowrap ${
              activeTab === tab.key
                ? "bg-text text-bg shadow-xs"
                : "text-text-muted hover:text-text hover:bg-surface"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 4. TAB CONTENTS                                               */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "overview" && <OverviewTab />}
      {activeTab === "accounts" && <AccountsTab />}
      {activeTab === "debts" && <DebtsTab />}
      {activeTab === "monthly" && <MonthlyCostsTab />}
      {activeTab === "inflows" && <MonthlyIncomeTab />}
      {activeTab === "vaults" && <SavingsVaultsTab />}

      {/* ------------------------------------------------------------- */}
      {/* 5. MODALS                                                     */}
      {/* ------------------------------------------------------------- */}
      <FinanceModals />
    </div>
  );
};

export const FinancePage: React.FC = () => {
  return (
    <FinanceProvider>
      <FinancePageContent />
    </FinanceProvider>
  );
};

export default FinancePage;
