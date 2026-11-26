import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useFinance } from "../FinanceContext";
import CheckboxTick from "../../ui/CheckboxTick";

export const AccountModal: React.FC = () => {
  const {
    isAccountModalOpen,
    setIsAccountModalOpen,
    editingAccount,
    setEditingAccount,
    handleSaveAccount,
    isSubmitting,
  } = useFinance();

  const [isDefault, setIsDefault] = useState(false);

  useEffect(() => {
    setIsDefault(editingAccount?.isDefault || false);
  }, [editingAccount, isAccountModalOpen]);

  if (!isAccountModalOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 bg-bg/80 backdrop-blur-xs flex items-center justify-center p-4 animate-modal-backdrop">
      <div className="bg-surface border border-border rounded-md w-full max-w-md p-5 space-y-4 shadow-2xl animate-modal-card">
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

          <div
            className="flex items-center gap-2 pt-1 cursor-pointer select-none group"
            onClick={() => setIsDefault(!isDefault)}
          >
            <input
              type="checkbox"
              id="isDefault"
              name="isDefault"
              checked={isDefault}
              onChange={() => {}}
              className="hidden"
            />
            <CheckboxTick
              size="sm"
              shape="square"
              checked={isDefault}
              onChange={() => setIsDefault(!isDefault)}
              aria-label="Set as default account"
            />
            <label htmlFor="isDefault" className="text-xs font-mono text-text cursor-pointer">
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
              disabled={isSubmitting}
              className="px-4 py-1.5 rounded-xs bg-text text-bg font-mono text-xs font-semibold hover:opacity-90 disabled:opacity-50"
            >
              {isSubmitting ? "Saving..." : "Save Account"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
