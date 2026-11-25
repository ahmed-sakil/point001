import React from "react";
import { X } from "lucide-react";
import { useFinance } from "../FinanceContext";

export const AccountModal: React.FC = () => {
  const {
    isAccountModalOpen,
    setIsAccountModalOpen,
    editingAccount,
    setEditingAccount,
    handleSaveAccount,
  } = useFinance();

  if (!isAccountModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-bg/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-surface border border-border rounded-md w-full max-w-md p-5 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between pb-2 border-b border-border">
          <h3 className="text-sm font-semibold font-mono text-text">
            {editingAccount ? "Edit Account" : "Add New Account"}
          </h3>
          <button
            onClick={() => {
              setIsAccountModalOpen(false);
              setEditingAccount(null);
            }}
            className="text-text-muted hover:text-text"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSaveAccount} className="space-y-3">
          <div>
            <label className="text-[11px] font-mono text-text-muted block mb-1">Account Name *</label>
            <input
              name="name"
              defaultValue={editingAccount?.name || ""}
              placeholder="e.g. bKash Personal, Brac Bank, Cash in Hand"
              required
              className="w-full bg-bg border border-border rounded-xs px-3 py-1.5 text-xs text-text font-mono focus:outline-none focus:border-text"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-mono text-text-muted block mb-1">Account Type *</label>
              <select
                name="accountType"
                defaultValue={editingAccount?.accountType || "CASH"}
                className="w-full bg-bg border border-border rounded-xs px-2.5 py-1.5 text-xs text-text font-mono focus:outline-none focus:border-text"
              >
                <option value="CASH">Cash</option>
                <option value="BKASH">bKash</option>
                <option value="NAGAD">Nagad</option>
                <option value="ROCKET">Rocket</option>
                <option value="BANK">Bank Account</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-mono text-text-muted block mb-1">Account Number (Opt)</label>
              <input
                name="accountNumber"
                defaultValue={editingAccount?.accountNumber || ""}
                placeholder="e.g. 0171..., 150..."
                className="w-full bg-bg border border-border rounded-xs px-3 py-1.5 text-xs text-text font-mono focus:outline-none focus:border-text"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-mono text-text-muted block mb-1">Current Balance (৳) *</label>
            <input
              type="number"
              step="any"
              min="0"
              name="balance"
              defaultValue={editingAccount?.balance !== undefined ? editingAccount.balance : 0}
              required
              className="w-full bg-bg border border-border rounded-xs px-3 py-1.5 text-xs text-text font-mono focus:outline-none focus:border-text"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="isDefault"
              name="isDefault"
              defaultChecked={editingAccount?.isDefault || false}
              className="rounded-xs border-border text-text"
            />
            <label htmlFor="isDefault" className="text-xs font-mono text-text">
              Set as default account
            </label>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
            <button
              type="button"
              onClick={() => {
                setIsAccountModalOpen(false);
                setEditingAccount(null);
              }}
              className="px-3 py-1.5 rounded-xs text-xs font-mono text-text-muted hover:text-text"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-xs bg-text text-bg font-mono text-xs font-semibold hover:opacity-90"
            >
              Save Account
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
