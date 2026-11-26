import React from "react";
import { ArrowUpRight, ArrowDownLeft, Plus, Edit3, Trash2 } from "lucide-react";
import { useFinance } from "../FinanceContext";
import { formatCurrency, formatDebtStatus, formatDisplayDate } from "../types";

export const DebtsTab: React.FC = () => {
  const {
    data,
    isEditMode,
    setDebtModalType,
    setEditingDebt,
    setIsDebtModalOpen,
    setSelectedDebtForDetail,
    handleDeleteDebt,
    setActiveDebtForPayment,
    setDebtPayAmount,
    setIsDebtPaymentModalOpen,
    sortedDenaList,
    sortedPaonaList,
  } = useFinance();

  const summary = data?.summary;

  return (
    <div className="space-y-6">
      {/* Consolidated Top Overview Card */}
      <div className="p-3.5 sm:p-4 bg-surface border border-border rounded-md flex justify-between items-stretch gap-3 sm:gap-4">
        {/* Left Column: Total Dena (Top Left) & Total Paona (Bottom Left) */}
        <div className="flex flex-col justify-between gap-3 min-w-0">
          <div>
            <span className="text-[10px] uppercase font-mono text-text-muted block leading-none">Total Dena</span>
            <span className="text-sm font-bold font-mono text-text block mt-1">
              {formatCurrency(summary?.remainingDena || 0)}
            </span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-mono text-text-muted block leading-none">Total Paona</span>
            <span className="text-sm font-bold font-mono text-text block mt-1">
              {formatCurrency(summary?.remainingPaona || 0)}
            </span>
          </div>
        </div>

        {/* Right Column: Add Dena (Right Top) & Add Paona (Right Bottom) */}
        <div className="flex flex-col justify-between items-end gap-3 shrink-0">
          <button
            onClick={() => {
              setDebtModalType("I_OWE");
              setEditingDebt(null);
              setIsDebtModalOpen(true);
            }}
            className="interactive-tap flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-bg border border-border hover:border-text hover:bg-surface-hover text-text font-mono text-xs font-semibold transition-colors"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span>Add Dena</span>
          </button>

          <button
            onClick={() => {
              setDebtModalType("OWES_ME");
              setEditingDebt(null);
              setIsDebtModalOpen(true);
            }}
            className="interactive-tap flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-bg border border-border hover:border-text hover:bg-surface-hover text-text font-mono text-xs font-semibold transition-colors"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span>Add Paona</span>
          </button>
        </div>
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
              Remaining: {formatCurrency(summary?.remainingDena || 0)}
            </span>
          </div>

          {sortedDenaList.length === 0 ? (
            <p className="text-xs font-mono text-text-muted py-8 text-center">No Dena recorded. You are debt-free!</p>
          ) : (
            <div className="max-h-[460px] overflow-y-auto pr-1.5 space-y-2.5">
              {sortedDenaList.map((d) => (
                <div
                  key={d.id}
                  onClick={() => setSelectedDebtForDetail(d)}
                  className={`p-3 bg-bg border rounded-md space-y-2 cursor-pointer hover:border-text/60 transition-all interactive-tap ${
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
                          {formatDebtStatus(d.status)}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-text-muted block mt-0.5">
                        {d.dueDate ? `Due on: ${formatDisplayDate(d.dueDate)}` : "No specific due date"}
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
                  <div className="space-y-1">
                    <div className="w-full h-1 bg-surface rounded-full overflow-hidden">
                      <div
                        className="h-full bg-text rounded-full transition-all"
                        style={{ width: `${Math.min(100, Math.round((d.paidAmount / d.totalAmount) * 100))}%` }}
                      />
                    </div>
                    {d.paidAmount === 0 && d.status !== "SETTLED" && (
                      <span className="text-[9px] font-mono text-text-muted block">0% paid</span>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    {isEditMode ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingDebt(d);
                            setDebtModalType("I_OWE");
                            setIsDebtModalOpen(true);
                          }}
                          className="interactive-tap p-1.5 rounded-xs text-text-muted hover:text-text hover:bg-bg"
                          title="Edit Dena"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteDebt(d.id);
                          }}
                          className="interactive-tap p-1.5 rounded-xs text-text-muted hover:text-text hover:bg-surface-hover"
                          title="Delete Dena"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <span />
                    )}

                    {d.status !== "SETTLED" && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
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
              Remaining: {formatCurrency(summary?.remainingPaona || 0)}
            </span>
          </div>

          {sortedPaonaList.length === 0 ? (
            <p className="text-xs font-mono text-text-muted py-8 text-center">No Paona recorded.</p>
          ) : (
            <div className="max-h-[460px] overflow-y-auto pr-1.5 space-y-2.5">
              {sortedPaonaList.map((d) => (
                <div
                  key={d.id}
                  onClick={() => setSelectedDebtForDetail(d)}
                  className={`p-3 bg-bg border rounded-md space-y-2 cursor-pointer hover:border-text/60 transition-all interactive-tap ${
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
                          {formatDebtStatus(d.status)}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-text-muted block mt-0.5">
                        {d.dueDate ? `Expected by: ${formatDisplayDate(d.dueDate)}` : "No specific due date"}
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
                  <div className="space-y-1">
                    <div className="w-full h-1 bg-surface rounded-full overflow-hidden">
                      <div
                        className="h-full bg-text rounded-full transition-all"
                        style={{ width: `${Math.min(100, Math.round((d.paidAmount / d.totalAmount) * 100))}%` }}
                      />
                    </div>
                    {d.paidAmount === 0 && d.status !== "SETTLED" && (
                      <span className="text-[9px] font-mono text-text-muted block">0% paid</span>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    {isEditMode ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingDebt(d);
                            setDebtModalType("OWES_ME");
                            setIsDebtModalOpen(true);
                          }}
                          className="interactive-tap p-1.5 rounded-xs text-text-muted hover:text-text hover:bg-bg"
                          title="Edit Paona"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteDebt(d.id);
                          }}
                          className="interactive-tap p-1.5 rounded-xs text-text-muted hover:text-text hover:bg-surface-hover"
                          title="Delete Paona"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <span />
                    )}

                    {d.status !== "SETTLED" && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
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
  );
};
