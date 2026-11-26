import React from "react";
import { createPortal } from "react-dom";
import { ArrowUpRight, ArrowDownLeft, X, Phone, Calendar as CalendarIcon, Trash2 } from "lucide-react";
import { useFinance } from "../FinanceContext";
import { formatCurrency, formatDebtStatus, formatDisplayDate } from "../types";

export const DebtDetailModal: React.FC = () => {
  const {
    selectedDebtForDetail,
    setSelectedDebtForDetail,
    setEditingDebt,
    setDebtModalType,
    setIsDebtModalOpen,
    setActiveDebtForPayment,
    setDebtPayAmount,
    setIsDebtPaymentModalOpen,
    handleDeleteDebt,
    handleDeleteDebtPaymentLog,
  } = useFinance();

  if (!selectedDebtForDetail) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-modal-backdrop"
      onClick={() => setSelectedDebtForDetail(null)}
    >
      <div
        className="bg-surface border border-border rounded-md max-w-md w-full p-5 space-y-4 shadow-2xl relative my-auto max-h-[90vh] overflow-y-auto animate-modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-border pb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-md bg-bg border border-border shrink-0">
              {selectedDebtForDetail.type === "I_OWE" ? (
                <ArrowUpRight className="w-4 h-4 text-text" />
              ) : (
                <ArrowDownLeft className="w-4 h-4 text-text" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-text truncate">
                  {selectedDebtForDetail.personName}
                </h3>
                <span
                  className={`px-1.5 py-0.5 text-[9px] font-mono rounded-xs shrink-0 ${
                    selectedDebtForDetail.status === "SETTLED"
                      ? "bg-text/10 text-text"
                      : selectedDebtForDetail.status === "PARTIAL"
                      ? "bg-surface-hover text-text border border-border"
                      : "bg-surface text-text-muted border border-border"
                  }`}
                >
                  {formatDebtStatus(selectedDebtForDetail.status)}
                </span>
              </div>
              <span className="text-[10px] font-mono text-text-muted block">
                {selectedDebtForDetail.type === "I_OWE" ? "Dena • Payable to Person" : "Paona • Receivable from Person"}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setSelectedDebtForDetail(null)}
            className="interactive-tap p-1 text-text-muted hover:text-text rounded-md shrink-0"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Contact info if any */}
        {selectedDebtForDetail.contactNumber && (
          <div className="flex items-center gap-2 p-2.5 bg-bg border border-border rounded-md text-xs font-mono text-text">
            <Phone className="w-3.5 h-3.5 text-text-muted shrink-0" />
            <span className="truncate">{selectedDebtForDetail.contactNumber}</span>
          </div>
        )}

        {/* Amount Breakdown */}
        <div className="grid grid-cols-3 gap-2">
          <div className="p-2.5 bg-bg border border-border rounded-md">
            <span className="text-[9px] uppercase font-mono text-text-muted block">Total</span>
            <span className="text-xs font-bold font-mono text-text block truncate mt-0.5">
              {formatCurrency(selectedDebtForDetail.totalAmount)}
            </span>
          </div>
          <div className="p-2.5 bg-bg border border-border rounded-md">
            <span className="text-[9px] uppercase font-mono text-text-muted block">
              {selectedDebtForDetail.type === "I_OWE" ? "Paid" : "Collected"}
            </span>
            <span className="text-xs font-bold font-mono text-text block truncate mt-0.5">
              {formatCurrency(selectedDebtForDetail.paidAmount)}
            </span>
          </div>
          <div className="p-2.5 bg-bg border border-border rounded-md">
            <span className="text-[9px] uppercase font-mono text-text-muted block">Remaining</span>
            <span className="text-xs font-bold font-mono text-text block truncate mt-0.5">
              {formatCurrency(selectedDebtForDetail.remainingAmount)}
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px] font-mono text-text-muted">
            <span>Settlement Progress</span>
            <span>
              {Math.min(100, Math.round((selectedDebtForDetail.paidAmount / selectedDebtForDetail.totalAmount) * 100))}%
            </span>
          </div>
          <div className="w-full h-1.5 bg-bg border border-border rounded-full overflow-hidden">
            <div
              className="h-full bg-text rounded-full transition-all"
              style={{
                width: `${Math.min(
                  100,
                  Math.round((selectedDebtForDetail.paidAmount / selectedDebtForDetail.totalAmount) * 100)
                )}%`,
              }}
            />
          </div>
        </div>

        {/* Dates & Notes */}
        <div className="space-y-2 text-xs font-mono">
          <div className="flex items-center justify-between py-1.5 border-b border-border/70 text-text-muted">
            <span className="flex items-center gap-1.5">
              <CalendarIcon className="w-3.5 h-3.5" />
              <span>{selectedDebtForDetail.type === "I_OWE" ? "Due Date" : "Expected Date"}</span>
            </span>
            <span className="text-text font-semibold">
              {formatDisplayDate(selectedDebtForDetail.dueDate) || "No specific date"}
            </span>
          </div>

          <div className="flex items-center justify-between py-1.5 border-b border-border/70 text-text-muted">
            <span>Created Date</span>
            <span className="text-text">{formatDisplayDate(selectedDebtForDetail.createdAt)}</span>
          </div>

          {selectedDebtForDetail.notes && (
            <div className="pt-1">
              <span className="text-[10px] uppercase text-text-muted block mb-1">Notes</span>
              <p className="p-2.5 bg-bg border border-border rounded-md text-text text-xs whitespace-pre-wrap">
                {selectedDebtForDetail.notes}
              </p>
            </div>
          )}
        </div>

        {/* Payment History Logs */}
        {selectedDebtForDetail.paymentLogs && selectedDebtForDetail.paymentLogs.length > 0 && (
          <div className="space-y-1.5">
            <span className="text-[10px] uppercase font-mono text-text-muted block">Payment History</span>
            <div className="max-h-32 overflow-y-auto space-y-1.5 pr-1">
              {selectedDebtForDetail.paymentLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-2 bg-bg border border-border/70 rounded flex items-center justify-between text-xs font-mono"
                >
                  <div className="min-w-0 flex-1">
                    <span className="text-text font-medium">{formatCurrency(log.amount)}</span>
                    {log.notes && (
                      <span className="text-[10px] text-text-muted block truncate">{log.notes}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <span className="text-[10px] text-text-muted">{formatDisplayDate(log.date)}</span>
                    <button
                      type="button"
                      onClick={() => handleDeleteDebtPaymentLog(selectedDebtForDetail.id, log.id)}
                      className="interactive-tap p-1 rounded-xs text-text-muted hover:text-text hover:bg-surface transition-colors"
                      title="Undo this payment and restore balance"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-border gap-2">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                const d = selectedDebtForDetail;
                setSelectedDebtForDetail(null);
                setEditingDebt(d);
                setDebtModalType(d.type);
                setIsDebtModalOpen(true);
              }}
              className="interactive-tap px-3 py-1.5 rounded-md border border-border hover:border-text text-xs font-mono text-text transition-colors"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => {
                const id = selectedDebtForDetail.id;
                setSelectedDebtForDetail(null);
                handleDeleteDebt(id);
              }}
              className="interactive-tap px-3 py-1.5 rounded-md border border-border hover:border-red-500 hover:text-red-400 text-xs font-mono text-text-muted transition-colors"
            >
              Delete
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedDebtForDetail(null)}
              className="interactive-tap px-3 py-1.5 rounded-md bg-bg border border-border text-xs font-mono text-text-muted hover:text-text"
            >
              Close
            </button>

            {selectedDebtForDetail.status !== "SETTLED" && (
              <button
                type="button"
                onClick={() => {
                  const d = selectedDebtForDetail;
                  setSelectedDebtForDetail(null);
                  setActiveDebtForPayment(d);
                  setDebtPayAmount(String(d.remainingAmount));
                  setIsDebtPaymentModalOpen(true);
                }}
                className="interactive-tap px-3.5 py-1.5 rounded-md bg-text text-bg text-xs font-mono font-semibold hover:opacity-90 transition-opacity"
              >
                {selectedDebtForDetail.type === "I_OWE" ? "Record Payment" : "Record Collection"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
