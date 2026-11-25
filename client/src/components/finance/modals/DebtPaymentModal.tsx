import React from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useFinance } from "../FinanceContext";
import { formatCurrency } from "../types";

export const DebtPaymentModal: React.FC = () => {
  const {
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
    accounts,
  } = useFinance();

  if (!isDebtPaymentModalOpen || !activeDebtForPayment) return null;

  return createPortal(
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
    </div>,
    document.body
  );
};
