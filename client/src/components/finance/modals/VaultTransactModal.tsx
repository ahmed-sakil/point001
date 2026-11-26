import React from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useFinance } from "../FinanceContext";
import { formatCurrency } from "../types";

export const VaultTransactModal: React.FC = () => {
  const {
    isVaultTransactModalOpen,
    setIsVaultTransactModalOpen,
    activeVaultForTransact,
    setActiveVaultForTransact,
    vaultTransactType,
    vaultTransactAmount,
    setVaultTransactAmount,
    vaultTransactAccountId,
    setVaultTransactAccountId,
    vaultTransactNotes,
    setVaultTransactNotes,
    handleExecuteVaultTransaction,
    accounts,
    isSubmitting,
  } = useFinance();

  if (!isVaultTransactModalOpen || !activeVaultForTransact) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 bg-bg/80 backdrop-blur-xs flex items-center justify-center p-4 animate-modal-backdrop">
      <div className="bg-surface border border-border rounded-md w-full max-w-md p-5 space-y-4 shadow-2xl animate-modal-card">
        <div className="flex items-center justify-between pb-2 border-b border-border">
          <h3 className="text-sm font-semibold font-mono text-text">
            {vaultTransactType === "DEPOSIT" ? "Stash Money into Vault" : "Withdraw from Vault"}
          </h3>
          <button
            onClick={() => {
              setIsVaultTransactModalOpen(false);
              setActiveVaultForTransact(null);
            }}
            className="text-text-muted hover:text-text"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleExecuteVaultTransaction} className="space-y-3">
          <div className="p-3 bg-bg border border-border rounded-xs flex items-center justify-between text-xs font-mono">
            <span className="text-text-muted">{activeVaultForTransact.title}:</span>
            <span className="font-bold text-text">
              Current: {formatCurrency(activeVaultForTransact.currentAmount)}
            </span>
          </div>

          <div>
            <label className="text-[11px] font-mono text-text-muted block mb-1">
              {vaultTransactType === "DEPOSIT" ? "Amount to Stash (৳) *" : "Amount to Withdraw (৳) *"}
            </label>
            <input
              type="number"
              step="any"
              value={vaultTransactAmount}
              onChange={(e) => setVaultTransactAmount(e.target.value)}
              placeholder="0.00"
              required
              className="w-full bg-bg border border-border rounded-xs px-3 py-1.5 text-xs text-text font-mono focus:outline-none focus:border-text"
            />
          </div>

          <div>
            <label className="text-[11px] font-mono text-text-muted block mb-1">
              {vaultTransactType === "DEPOSIT" ? "Deduct from Account" : "Deposit into Account"}
            </label>
            <select
              value={vaultTransactAccountId}
              onChange={(e) => setVaultTransactAccountId(e.target.value)}
              className="w-full bg-bg border border-border rounded-xs px-2.5 py-1.5 text-xs text-text font-mono focus:outline-none focus:border-text"
            >
              <option value="">No linked account balance movement</option>
              {accounts.map((a) => {
                const depositNum = parseFloat(vaultTransactAmount) || 0;
                const isInsufficient = vaultTransactType === "DEPOSIT" && a.balance < depositNum;
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
              value={vaultTransactNotes}
              onChange={(e) => setVaultTransactNotes(e.target.value)}
              placeholder="e.g. November savings contribution"
              className="w-full bg-bg border border-border rounded-xs px-3 py-1.5 text-xs text-text font-mono focus:outline-none focus:border-text"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
            <button
              type="button"
              onClick={() => {
                setIsVaultTransactModalOpen(false);
                setActiveVaultForTransact(null);
              }}
              className="px-3 py-1.5 rounded-xs text-xs font-mono text-text-muted hover:text-text"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-1.5 rounded-xs bg-text text-bg font-mono text-xs font-semibold hover:opacity-90 disabled:opacity-50"
            >
              {isSubmitting
                ? "Processing..."
                : vaultTransactType === "DEPOSIT"
                ? "Confirm Stash"
                : "Confirm Withdrawal"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
