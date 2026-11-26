import React, { useState } from "react";
import {
  ArrowUpRight,
  ArrowDownLeft,
  X,
  Building,
  Calendar as CalendarIcon,
  ArrowRightLeft,
  PiggyBank,
} from "lucide-react";
import { useFinance } from "../FinanceContext";
import { formatCurrency, formatDisplayDate, getAccountIcon } from "../types";

export const OverviewTab: React.FC = () => {
  const {
    data,
    setActiveTab,
    quickCostStep,
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
    quickAddStep,
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
    sortedAccounts,
    sortedMonthlyCosts,
    allUnsettledDebts,
    sortedVaults,
    setSelectedDebtForDetail,
  } = useFinance();

  const [actionType, setActionType] = useState<"COST" | "ADD">("COST");
  const accounts = data?.accounts || [];

  return (
    <div className="space-y-5">
      {/* Merged Quick Cost & Quick Add Money Card */}
      <div className="p-3.5 bg-surface border border-border rounded-md min-h-[114px] flex flex-col justify-between">
        {/* Header with Mode Toggle */}
        <div className="flex items-center justify-between h-6">
          <div className="flex items-center gap-1 p-0.5 bg-bg border border-border rounded-xs">
            <button
              type="button"
              onClick={() => {
                if (actionType !== "COST") {
                  resetQuickAdd();
                  setActionType("COST");
                }
              }}
              className={`interactive-tap px-3 py-1 text-xs font-mono rounded-xs transition-colors flex items-center gap-1.5 ${
                actionType === "COST"
                  ? "bg-text text-bg font-semibold shadow-xs"
                  : "text-text-muted hover:text-text"
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>Cost</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (actionType !== "ADD") {
                  resetQuickCost();
                  setActionType("ADD");
                }
              }}
              className={`interactive-tap px-3 py-1 text-xs font-mono rounded-xs transition-colors flex items-center gap-1.5 ${
                actionType === "ADD"
                  ? "bg-text text-bg font-semibold shadow-xs"
                  : "text-text-muted hover:text-text"
              }`}
            >
              <ArrowDownLeft className="w-3.5 h-3.5" />
              <span>Add Money</span>
            </button>
          </div>

          {((actionType === "COST" && quickCostStep > 1) || (actionType === "ADD" && quickAddStep > 1)) && (
            <button
              onClick={actionType === "COST" ? resetQuickCost : resetQuickAdd}
              className="text-[10px] font-mono text-text-muted hover:text-text flex items-center gap-1"
            >
              <X className="w-3 h-3" />
              <span>Cancel</span>
            </button>
          )}
        </div>

        {/* Dynamic Inputs based on Action Type */}
        {actionType === "COST" ? (
          <>
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
                  autoFocus
                  placeholder="Enter cost amount"
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
                  placeholder="Enter title (e.g. Lunch, Taxi, Coffee)"
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
                    Confirm Cost
                  </button>
                </div>
              </form>
            )}
          </>
        ) : (
          <>
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
                  autoFocus
                  placeholder="Enter income amount"
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
                  placeholder="Enter title (e.g. Salary, Freelance, Gift)"
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
                    Confirm Add
                  </button>
                </div>
              </form>
            )}
          </>
        )}
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
            <div className="max-h-[320px] overflow-y-auto pr-1.5">
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
            <div className="max-h-[320px] overflow-y-auto pr-1.5 space-y-2">
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
                      <span className="px-1.5 py-0.2 text-[9px] font-mono rounded-xs bg-surface text-text-muted border border-border">
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
            <button
              onClick={() => setActiveTab("debts")}
              className="text-[10px] font-mono text-text-muted hover:text-text transition-colors"
            >
              View all →
            </button>
          </div>

          {allUnsettledDebts.length === 0 ? (
            <p className="text-xs font-mono text-text-muted py-6 text-center">No pending Dena or Paona. All settled!</p>
          ) : (
            <div className="max-h-[320px] overflow-y-auto pr-1.5 space-y-2">
              {allUnsettledDebts.map((d) => (
                <div
                  key={d.id}
                  onClick={() => setSelectedDebtForDetail(d)}
                  className="p-2.5 bg-bg border border-border rounded-md flex items-center justify-between gap-3 cursor-pointer hover:border-text/60 transition-all interactive-tap"
                >
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
                      {d.dueDate ? `Due: ${formatDisplayDate(d.dueDate)}` : "No due date"}
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
            <div className="max-h-[320px] overflow-y-auto pr-1.5 space-y-3">
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
  );
};
