import React from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useFinance } from "../FinanceContext";
import { formatCurrency } from "../types";

export const TransferModal: React.FC = () => {
  const {
    data,
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
    isSubmitting,
  } = useFinance();

  if (!isTransferModalOpen) return null;

  const accounts = data?.accounts || [];

  return createPortal(
    <div className="fixed inset-0 z-50 bg-bg/80 backdrop-blur-xs flex items-center justify-center p-4 animate-modal-backdrop">
      <div className="bg-surface border border-border rounded-md w-full max-w-md p-5 space-y-4 shadow-2xl animate-modal-card">
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
              disabled={isSubmitting}
              className="px-4 py-1.5 rounded-xs bg-text text-bg font-mono text-xs font-semibold hover:opacity-90 disabled:opacity-50"
            >
              {isSubmitting ? "Executing..." : "Execute Transfer"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
