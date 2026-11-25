import React from "react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  Check,
  CheckCircle2,
  Undo2,
  Edit3,
  Trash2,
} from "lucide-react";
import { useFinance } from "../FinanceContext";
import { formatCurrency, getMonthDisplayName } from "../types";
import { AnimatedSlideView } from "../../ui/AnimatedSlideView";

export const MonthlyCostsTab: React.FC = () => {
  const {
    data,
    isEditMode,
    selectedMonthYear,
    animKey,
    slideDirection,
    handlePrevMonth,
    handleNextMonth,
    handleCurrentMonth,
    setEditingMonthlyCost,
    setCostModalType,
    setIsMonthlyCostModalOpen,
    handleToggleMonthlyPayment,
    handleDeleteMonthlyCost,
    handleDeleteQuickCost,
    setActiveDebtForPayment,
    setDebtPayAmount,
    setIsDebtPaymentModalOpen,
    setEditingDebt,
    setDebtModalType,
    setIsDebtModalOpen,
    handleDeleteDebtPaymentLog,
    totalMonthCostsCalculated,
    totalMonthlyCostDueCalculated,
    pendingRepeatingCosts,
    pendingDenaThisMonth,
    paidRepeatingCosts,
    denaPaymentsThisMonth,
    dailyCosts,
  } = useFinance();

  const accounts = data?.accounts || [];

  return (
    <div className="space-y-6">
      {/* Consolidated Top Overview Card */}
      <div className="p-3.5 sm:p-4 bg-surface border border-border rounded-md flex justify-between items-stretch gap-3 sm:gap-4">
        {/* Left Column: Total (Top Left) & Expected Due (Bottom Left) */}
        <div className="flex flex-col justify-between gap-3 min-w-0">
          <div>
            <span className="text-[10px] uppercase font-mono text-text-muted block leading-none">Total</span>
            <span className="text-sm font-bold font-mono text-text block mt-1">
              {formatCurrency(totalMonthCostsCalculated)}
            </span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-mono text-text-muted block leading-none">Expected Due</span>
            <span className="text-sm font-bold font-mono text-text block mt-1">
              {formatCurrency(totalMonthlyCostDueCalculated)}
            </span>
          </div>
        </div>

        {/* Right Column: Month Button (Right Top) & New Cost (Right Bottom) */}
        <div className="flex flex-col justify-between items-end gap-3 shrink-0">
          {/* Month Selector Pill */}
          <div className="flex items-center bg-bg border border-border rounded-md px-1 py-0.5 shrink-0 whitespace-nowrap">
            <button
              onClick={handlePrevMonth}
              className="interactive-tap p-1.5 text-text-muted hover:text-text hover:bg-surface rounded-xs transition-colors"
              title="Previous Month"
              aria-label="Previous month"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleCurrentMonth}
              className="px-2 py-1 text-xs font-mono text-text hover:bg-surface rounded-xs transition-colors whitespace-nowrap"
              title="Jump to Current Month"
            >
              {getMonthDisplayName(selectedMonthYear)}
            </button>
            <button
              onClick={handleNextMonth}
              className="interactive-tap p-1.5 text-text-muted hover:text-text hover:bg-surface rounded-xs transition-colors"
              title="Next Month"
              aria-label="Next month"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={() => {
              setEditingMonthlyCost(null);
              setCostModalType("ONE_TIME");
              setIsMonthlyCostModalOpen(true);
            }}
            className="interactive-tap flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-bg border border-border hover:border-text hover:bg-surface-hover text-text font-mono text-xs font-semibold transition-colors"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span>New Cost</span>
          </button>
        </div>
      </div>

      <AnimatedSlideView slideKey={animKey} direction={slideDirection} className="space-y-6">
        {/* ----------------------------------------------------------- */}
        {/* SECTION 1: TO PAY (REPEATING BILLS & DENA)                  */}
        {/* ----------------------------------------------------------- */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 pb-1 border-b border-border">
            <Clock className="w-4 h-4 text-text" />
            <h3 className="text-xs font-mono uppercase font-semibold text-text">
              To pay
            </h3>
          </div>

          {pendingRepeatingCosts.length === 0 && pendingDenaThisMonth.length === 0 ? (
            <div className="py-8 flex items-center justify-center text-text">
              <Check className="w-6 h-6 stroke-[2.5]" />
            </div>
          ) : (
            <div className="space-y-2.5">
              {/* Pending Repeating Costs */}
              {pendingRepeatingCosts.map((cost) => (
                <div
                  key={`cost-${cost.id}`}
                  className="p-3 bg-surface border border-border rounded-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <button
                      onClick={() => handleToggleMonthlyPayment(cost)}
                      className="interactive-tap w-6 h-6 rounded-md border border-border hover:border-text bg-bg flex items-center justify-center shrink-0 mt-0.5 transition-all"
                      title="Mark paid for this month"
                    >
                      <span className="w-4 h-4 rounded-full border border-border/90 hover:border-text/60 transition-colors" />
                    </button>

                    <div className="min-w-0">
                      <h4 className="text-xs font-semibold text-text truncate">
                        {cost.title}
                      </h4>
                      <div className="text-[10px] font-mono text-text-muted mt-0.5">
                        Due: {cost.dueDayOfMonth}th of month
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

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleToggleMonthlyPayment(cost)}
                        className="interactive-tap px-2.5 py-1 rounded-xs bg-text text-bg text-[10px] font-mono font-semibold hover:opacity-90 transition-opacity"
                      >
                        Pay
                      </button>

                      {isEditMode && (
                        <>
                          <button
                            onClick={() => {
                              setEditingMonthlyCost(cost);
                              setCostModalType("REPEATING");
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
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {/* Pending Dena (Debts to pay this month) */}
              {pendingDenaThisMonth.map((d) => (
                <div
                  key={`dena-${d.id}`}
                  className="p-3 bg-surface border border-border rounded-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <button
                      onClick={() => {
                        setActiveDebtForPayment(d);
                        setDebtPayAmount(String(d.remainingAmount));
                        setIsDebtPaymentModalOpen(true);
                      }}
                      className="interactive-tap w-6 h-6 rounded-md border border-border hover:border-text bg-bg flex items-center justify-center shrink-0 mt-0.5 transition-all"
                      title="Record payment for this debt"
                    >
                      <span className="w-4 h-4 rounded-full border border-border/90 hover:border-text/60 transition-colors" />
                    </button>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-semibold text-text truncate">
                          {d.personName}
                        </h4>
                        {d.status === "PARTIAL" && (
                          <span className="px-1.5 py-0.2 text-[9px] font-mono bg-surface-hover text-text border border-border rounded-xs">
                            Partial (৳{d.paidAmount} paid)
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-mono text-text-muted mt-0.5">
                        <span>Due date: {d.dueDate}</span>
                        {d.contactNumber && <span>Phone: {d.contactNumber}</span>}
                        {d.notes && <span>Notes: {d.notes}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pl-9 sm:pl-0">
                    <div className="text-right">
                      <span className="text-sm font-mono font-bold text-text block">
                        {formatCurrency(d.remainingAmount)}
                      </span>
                      <span className="text-[9px] font-mono text-text-muted">
                        Total: {formatCurrency(d.totalAmount)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          setActiveDebtForPayment(d);
                          setDebtPayAmount(String(d.remainingAmount));
                          setIsDebtPaymentModalOpen(true);
                        }}
                        className="interactive-tap px-2.5 py-1 rounded-xs bg-text text-bg text-[10px] font-mono font-semibold hover:opacity-90 transition-opacity"
                      >
                        Pay
                      </button>

                      {isEditMode && (
                        <button
                          onClick={() => {
                            setEditingDebt(d);
                            setDebtModalType("I_OWE");
                            setIsDebtModalOpen(true);
                          }}
                          className="interactive-tap p-1.5 rounded-xs text-text-muted hover:text-text hover:bg-bg"
                          title="Edit Dena"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ----------------------------------------------------------- */}
        {/* SECTION 2: PAID                                             */}
        {/* ----------------------------------------------------------- */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between pb-1 border-b border-border">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-text" />
              <h3 className="text-xs font-mono uppercase font-semibold text-text">
                Paid
              </h3>
            </div>
          </div>

          {paidRepeatingCosts.length === 0 && denaPaymentsThisMonth.length === 0 && dailyCosts.length === 0 ? (
            <p className="text-xs font-mono text-text-muted py-6 text-center">No Expenses</p>
          ) : (
            <div className="space-y-2">
              {/* Paid Repeating Costs */}
              {paidRepeatingCosts.map((cost) => (
                <div
                  key={`paid-cost-${cost.id}`}
                  className="p-3 bg-surface border border-border/70 rounded-md flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <button
                      onClick={() => handleToggleMonthlyPayment(cost)}
                      className="interactive-tap w-6 h-6 rounded-md border border-text bg-surface flex items-center justify-center shrink-0 mt-0.5"
                      title="Click to revert to unpaid and restore account balance"
                    >
                      <span className="w-4.5 h-4.5 rounded-full bg-text text-bg flex items-center justify-center animate-check-pop">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </span>
                    </button>

                    <div className="min-w-0">
                      <h4 className="text-xs font-semibold text-text truncate">
                        {cost.title}
                      </h4>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-mono text-text-muted mt-0.5">
                        {cost.paidDate && <span>Paid on: {cost.paidDate}</span>}
                        {cost.paidFromAccountId && (
                          <span>
                            Paid from: {accounts.find((a) => a.id === cost.paidFromAccountId)?.name || "Account"}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pl-9 sm:pl-0">
                    <div className="text-right">
                      <span className="text-sm font-mono font-bold text-text block">
                        {formatCurrency(cost.amount)}
                      </span>
                      <span className="text-[9px] font-mono text-text-muted">paid monthly</span>
                    </div>

                    <button
                      onClick={() => handleToggleMonthlyPayment(cost)}
                      className="interactive-tap p-1.5 rounded-xs text-text-muted hover:text-text hover:bg-bg"
                      title="Revert payment"
                    >
                      <Undo2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}

              {/* Dena Payments logged this month */}
              {denaPaymentsThisMonth.map((p) => (
                <div
                  key={`dena-payment-${p.paymentId}`}
                  className="p-3 bg-surface border border-border/70 rounded-md flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <button
                      onClick={() => handleDeleteDebtPaymentLog(p.debtId, p.paymentId)}
                      className="interactive-tap w-6 h-6 rounded-md border border-text bg-surface flex items-center justify-center shrink-0 mt-0.5"
                      title="Click to undo debt payment and restore balance"
                    >
                      <span className="w-4.5 h-4.5 rounded-full bg-text text-bg flex items-center justify-center animate-check-pop">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </span>
                    </button>

                    <div className="min-w-0">
                      <h4 className="text-xs font-semibold text-text truncate">
                        Repaid: {p.personName}
                      </h4>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-mono text-text-muted mt-0.5">
                        <span>Paid on: {p.date}</span>
                        <span>Paid from: {p.accountName || "Account"}</span>
                        {p.notes && <span>Notes: {p.notes}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pl-9 sm:pl-0">
                    <div className="text-right">
                      <span className="text-sm font-mono font-bold text-text block">
                        {formatCurrency(p.amount)}
                      </span>
                      <span className="text-[9px] font-mono text-text-muted">debt payment</span>
                    </div>

                    <button
                      onClick={() => handleDeleteDebtPaymentLog(p.debtId, p.paymentId)}
                      className="interactive-tap p-1.5 rounded-xs text-text-muted hover:text-red-400 hover:bg-bg"
                      title="Undo payment"
                    >
                      <Undo2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}

              {/* Daily Costs */}
              {dailyCosts.map((cost) => (
                <div
                  key={`daily-${cost.id}`}
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
                      <h4 className="text-xs font-semibold text-text truncate">
                        {cost.title}
                      </h4>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-mono text-text-muted mt-0.5">
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
  );
};
