import React from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useFinance } from "../FinanceContext";
import { formatCurrency } from "../types";

export const PayMonthlyCostModal: React.FC = () => {
  const {
    isPayMonthlyModalOpen,
    setIsPayMonthlyModalOpen,
    activeMonthlyCostForPay,
    setActiveMonthlyCostForPay,
    monthlyPayAmount,
    setMonthlyPayAmount,
    monthlyPayAccountId,
    setMonthlyPayAccountId,
    handleConfirmPayMonthly,
    selectedMonthYear,
    accounts,
  } = useFinance();

  if (!isPayMonthlyModalOpen || !activeMonthlyCostForPay) return null;

  return createPortal(
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
          <div>
            <label className="text-[11px] font-mono text-text-muted block mb-1">
              Amount to Pay (৳) *
            </label>
            <input
              type="number"
              step="any"
              value={monthlyPayAmount}
              onChange={(e) => setMonthlyPayAmount(e.target.value)}
              placeholder="5000"
              required
              className="w-full bg-bg border border-border rounded-xs px-3 py-1.5 text-xs text-text font-mono focus:outline-none focus:border-text font-bold"
            />
            {activeMonthlyCostForPay && parseFloat(monthlyPayAmount) !== activeMonthlyCostForPay.amount && (
              <span className="text-[10px] font-mono text-text-muted mt-1 block">
                Original commitment: {formatCurrency(activeMonthlyCostForPay.amount)}
              </span>
            )}
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
                const costNum = parseFloat(monthlyPayAmount) || activeMonthlyCostForPay?.amount || 0;
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
    </div>,
    document.body
  );
};
