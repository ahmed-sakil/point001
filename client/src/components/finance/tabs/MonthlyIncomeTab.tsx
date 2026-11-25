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

export const MonthlyIncomeTab: React.FC = () => {
  const {
    data,
    isEditMode,
    selectedMonthYear,
    animKey,
    slideDirection,
    handlePrevMonth,
    handleNextMonth,
    handleCurrentMonth,
    setEditingInflow,
    setInflowModalType,
    setIsInflowModalOpen,
    setActiveInflowForReceive,
    setReceiveAccountId,
    setIsReceiveInflowModalOpen,
    handleDeleteInflow,
    handleRevertInflow,
    setActiveDebtForPayment,
    setDebtPayAmount,
    setIsDebtPaymentModalOpen,
    setEditingDebt,
    setDebtModalType,
    setIsDebtModalOpen,
    handleDeleteDebtPaymentLog,
    handleDeleteQuickInflow,
    totalThisMonthExpectedIncomeCalculated,
    totalPendingInflowsCalculated,
    pendingRepeatingIncomes,
    receivedRepeatingIncomes,
    pendingOneTimeIncomes,
    receivedOneTimeIncomes,
    pendingPaonaThisMonth,
    paonaCollectionsThisMonth,
  } = useFinance();

  const accounts = data?.accounts || [];

  return (
    <div className="space-y-6">
      {/* Consolidated Top Overview Card */}
      <div className="p-3.5 sm:p-4 bg-surface border border-border rounded-md flex justify-between items-stretch gap-3 sm:gap-4">
        {/* Left Column: Total (Top Left) & On Pending (Bottom Left) */}
        <div className="flex flex-col justify-between gap-3 min-w-0">
          <div>
            <span className="text-[10px] uppercase font-mono text-text-muted block leading-none">Total</span>
            <span className="text-sm font-bold font-mono text-text block mt-1">
              {formatCurrency(totalThisMonthExpectedIncomeCalculated)}
            </span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-mono text-text-muted block leading-none">On Pending</span>
            <span className="text-sm font-bold font-mono text-text block mt-1">
              {formatCurrency(totalPendingInflowsCalculated)}
            </span>
          </div>
        </div>

        {/* Right Column: Month Button (Right Top) & New Income (Right Bottom) */}
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
              setEditingInflow(null);
              setInflowModalType("ONE_TIME");
              setIsInflowModalOpen(true);
            }}
            className="interactive-tap flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-bg border border-border hover:border-text hover:bg-surface-hover text-text font-mono text-xs font-semibold transition-colors"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span>New Income</span>
          </button>
        </div>
      </div>

      <AnimatedSlideView slideKey={animKey} direction={slideDirection} className="space-y-6">
        {/* ----------------------------------------------------------- */}
        {/* SECTION 1: TO RECEIVE (INCOMES & PAONA)                     */}
        {/* ----------------------------------------------------------- */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 pb-1 border-b border-border">
            <Clock className="w-4 h-4 text-text" />
            <h3 className="text-xs font-mono uppercase font-semibold text-text">
              To receive
            </h3>
          </div>

          {pendingRepeatingIncomes.length === 0 && pendingOneTimeIncomes.length === 0 && pendingPaonaThisMonth.length === 0 ? (
            <div className="py-8 flex items-center justify-center text-text">
              <Check className="w-6 h-6 stroke-[2.5]" />
            </div>
          ) : (
            <div className="space-y-2.5">
              {/* Pending Repeating Incomes */}
              {pendingRepeatingIncomes.map((inf) => (
                <div
                  key={`inf-rep-${inf.id}`}
                  className="p-3.5 bg-surface border border-border rounded-md flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <h4 className="text-xs font-semibold text-text truncate">{inf.title}</h4>
                    <span className="text-[10px] font-mono text-text-muted block mt-0.5">
                      Monthly around {inf.dueDay}th of month
                    </span>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                    <span className="text-sm font-mono font-bold text-text">
                      {formatCurrency(inf.amount)}
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setActiveInflowForReceive(inf);
                          setReceiveAccountId(accounts[0]?.id || "");
                          setIsReceiveInflowModalOpen(true);
                        }}
                        className="interactive-tap px-2.5 py-1 rounded-xs bg-text text-bg text-[10px] font-mono font-semibold hover:opacity-90 transition-opacity"
                      >
                        Collect
                      </button>

                      {isEditMode && (
                        <>
                          <button
                            onClick={() => {
                              setEditingInflow(inf);
                              setInflowModalType("MONTHLY");
                              setIsInflowModalOpen(true);
                            }}
                            className="interactive-tap p-1.5 rounded-xs text-text-muted hover:text-text hover:bg-bg"
                            title="Edit Inflow"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteInflow(inf.id)}
                            className="interactive-tap p-1.5 rounded-xs text-text-muted hover:text-text hover:bg-surface-hover"
                            title="Delete Inflow"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {/* Pending One-Time Incomes */}
              {pendingOneTimeIncomes.map((inf) => (
                <div
                  key={`inf-onetime-${inf.id}`}
                  className="p-3.5 bg-surface border border-border rounded-md flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <h4 className="text-xs font-semibold text-text truncate">{inf.title}</h4>
                    <span className="text-[10px] font-mono text-text-muted block mt-0.5">
                      Expected date: {inf.expectedDateStr || "Pending"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                    <span className="text-sm font-mono font-bold text-text">
                      {formatCurrency(inf.amount)}
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setActiveInflowForReceive(inf);
                          setReceiveAccountId(accounts[0]?.id || "");
                          setIsReceiveInflowModalOpen(true);
                        }}
                        className="interactive-tap px-2.5 py-1 rounded-xs bg-text text-bg text-[10px] font-mono font-semibold hover:opacity-90 transition-opacity"
                      >
                        Collect
                      </button>

                      {isEditMode && (
                        <>
                          <button
                            onClick={() => {
                              setEditingInflow(inf);
                              setInflowModalType("ONE_TIME");
                              setIsInflowModalOpen(true);
                            }}
                            className="interactive-tap p-1.5 rounded-xs text-text-muted hover:text-text hover:bg-bg"
                            title="Edit Inflow"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteInflow(inf.id)}
                            className="interactive-tap p-1.5 rounded-xs text-text-muted hover:text-text hover:bg-surface-hover"
                            title="Delete Inflow"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {/* Pending Paona (Receivables to collect this month) */}
              {pendingPaonaThisMonth.map((p) => (
                <div
                  key={`paona-${p.id}`}
                  className="p-3.5 bg-surface border border-border rounded-md flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-semibold text-text truncate">{p.personName}</h4>
                      {p.status === "PARTIAL" && (
                        <span className="px-1.5 py-0.2 text-[9px] font-mono bg-surface-hover text-text border border-border rounded-xs">
                          Partial (৳{p.paidAmount} collected)
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-mono text-text-muted mt-0.5">
                      <span>Due date: {p.dueDate}</span>
                      {p.contactNumber && <span>Phone: {p.contactNumber}</span>}
                      {p.notes && <span>Notes: {p.notes}</span>}
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                    <div className="text-right">
                      <span className="text-sm font-mono font-bold text-text block">
                        {formatCurrency(p.remainingAmount)}
                      </span>
                      <span className="text-[9px] font-mono text-text-muted">
                        Total: {formatCurrency(p.totalAmount)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          setActiveDebtForPayment(p);
                          setDebtPayAmount(String(p.remainingAmount));
                          setIsDebtPaymentModalOpen(true);
                        }}
                        className="interactive-tap px-2.5 py-1 rounded-xs bg-text text-bg text-[10px] font-mono font-semibold hover:opacity-90 transition-opacity"
                      >
                        Collect
                      </button>

                      {isEditMode && (
                        <button
                          onClick={() => {
                            setEditingDebt(p);
                            setDebtModalType("OWES_ME");
                            setIsDebtModalOpen(true);
                          }}
                          className="interactive-tap p-1.5 rounded-xs text-text-muted hover:text-text hover:bg-bg"
                          title="Edit Paona"
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
        {/* SECTION 2: RECEIVED                                         */}
        {/* ----------------------------------------------------------- */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between pb-1 border-b border-border">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-text" />
              <h3 className="text-xs font-mono uppercase font-semibold text-text">
                Received
              </h3>
            </div>
          </div>

          {receivedRepeatingIncomes.length === 0 && receivedOneTimeIncomes.length === 0 && paonaCollectionsThisMonth.length === 0 ? (
            <p className="text-xs font-mono text-text-muted py-6 text-center">No Incomes</p>
          ) : (
            <div className="space-y-2">
              {/* Received Repeating Incomes */}
              {receivedRepeatingIncomes.map((inf) => (
                <div
                  key={`rec-rep-${inf.id}`}
                  className="p-3 bg-surface border border-border/70 rounded-md flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <button
                      onClick={() => handleRevertInflow(inf.id)}
                      className="interactive-tap w-6 h-6 rounded-md border border-text bg-surface flex items-center justify-center shrink-0 mt-0.5"
                      title="Click to revert to pending and deduct balance"
                    >
                      <span className="w-4.5 h-4.5 rounded-full bg-text text-bg flex items-center justify-center animate-check-pop">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </span>
                    </button>

                    <div className="min-w-0">
                      <h4 className="text-xs font-semibold text-text truncate">{inf.title}</h4>
                      <span className="text-[10px] font-mono text-text-muted block mt-0.5">
                        {inf.receivedDate ? `Received on ${inf.receivedDate}` : "Received"}
                        {inf.depositToAccountId && (
                          <span> • Deposited to: {accounts.find((a) => a.id === inf.depositToAccountId)?.name || "Account"}</span>
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pl-9 sm:pl-0">
                    <div className="text-right">
                      <span className="text-sm font-mono font-bold text-text block">
                        {formatCurrency(inf.amount)}
                      </span>
                      <span className="text-[9px] font-mono text-text-muted">monthly received</span>
                    </div>

                    <button
                      onClick={() => handleRevertInflow(inf.id)}
                      className="interactive-tap p-1.5 rounded-xs text-text-muted hover:text-text hover:bg-bg"
                      title="Revert to pending"
                    >
                      <Undo2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}

              {/* Received One-Time & Quick Incomes */}
              {receivedOneTimeIncomes.map((inf) => (
                <div
                  key={`rec-onetime-${inf.id}`}
                  className="p-3 bg-surface border border-border/70 rounded-md flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className="w-6 h-6 rounded-md border border-text bg-surface flex items-center justify-center shrink-0 mt-0.5"
                      title="Inflow received and deposited"
                    >
                      <span className="w-4.5 h-4.5 rounded-full bg-text text-bg flex items-center justify-center animate-check-pop">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </span>
                    </div>

                    <div className="min-w-0">
                      <h4 className="text-xs font-semibold text-text truncate">{inf.title}</h4>
                      <span className="text-[10px] font-mono text-text-muted block mt-0.5">
                        {inf.isQuickInflow
                          ? `Logged: ${inf.expectedDateStr || inf.receivedDate} • Deposited to: ${inf.depositToAccountName || accounts.find((a) => a.id === inf.depositToAccountId)?.name || "Account"}`
                          : `Received on ${inf.receivedDate || "this month"}`}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pl-9 sm:pl-0">
                    <div className="text-right">
                      <span className="text-sm font-mono font-bold text-text block">
                        {formatCurrency(inf.amount)}
                      </span>
                      <span className="text-[9px] font-mono text-text-muted">
                        {inf.isQuickInflow ? "quick income" : "received"}
                      </span>
                    </div>

                    {inf.isQuickInflow ? (
                      isEditMode && (
                        <button
                          onClick={() => handleDeleteQuickInflow(inf.id)}
                          className="interactive-tap p-1.5 rounded-xs text-text-muted hover:text-text hover:bg-surface-hover"
                          title="Delete quick income and deduct balance"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )
                    ) : (
                      <button
                        onClick={() => handleRevertInflow(inf.id)}
                        className="interactive-tap p-1.5 rounded-xs text-text-muted hover:text-text hover:bg-bg"
                        title="Revert to pending"
                      >
                        <Undo2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {/* Paona Collections logged this month */}
              {paonaCollectionsThisMonth.map((p) => (
                <div
                  key={`paona-collection-${p.paymentId}`}
                  className="p-3 bg-surface border border-border/70 rounded-md flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <button
                      onClick={() => handleDeleteDebtPaymentLog(p.debtId, p.paymentId)}
                      className="interactive-tap w-6 h-6 rounded-md border border-text bg-surface flex items-center justify-center shrink-0 mt-0.5"
                      title="Click to undo collection and deduct balance"
                    >
                      <span className="w-4.5 h-4.5 rounded-full bg-text text-bg flex items-center justify-center animate-check-pop">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </span>
                    </button>

                    <div className="min-w-0">
                      <h4 className="text-xs font-semibold text-text truncate">
                        Collected: {p.personName}
                      </h4>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-mono text-text-muted mt-0.5">
                        <span>Collected on: {p.date}</span>
                        <span>Deposited to: {p.accountName || "Account"}</span>
                        {p.notes && <span>Notes: {p.notes}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pl-9 sm:pl-0">
                    <div className="text-right">
                      <span className="text-sm font-mono font-bold text-text block">
                        {formatCurrency(p.amount)}
                      </span>
                      <span className="text-[9px] font-mono text-text-muted">receivable collection</span>
                    </div>

                    <button
                      onClick={() => handleDeleteDebtPaymentLog(p.debtId, p.paymentId)}
                      className="interactive-tap p-1.5 rounded-xs text-text-muted hover:text-red-400 hover:bg-bg"
                      title="Undo collection"
                    >
                      <Undo2 className="w-3.5 h-3.5" />
                    </button>
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
