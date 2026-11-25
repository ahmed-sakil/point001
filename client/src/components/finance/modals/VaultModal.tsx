import React from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useFinance } from "../FinanceContext";

export const VaultModal: React.FC = () => {
  const {
    isVaultModalOpen,
    setIsVaultModalOpen,
    editingVault,
    setEditingVault,
    handleSaveVault,
  } = useFinance();

  if (!isVaultModalOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 bg-bg/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-surface border border-border rounded-md w-full max-w-md p-5 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between pb-2 border-b border-border">
          <h3 className="text-sm font-semibold font-mono text-text">
            {editingVault ? "Edit Savings Vault" : "New Savings Vault (e.g. PS5)"}
          </h3>
          <button
            onClick={() => {
              setIsVaultModalOpen(false);
              setEditingVault(null);
            }}
            className="text-text-muted hover:text-text"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSaveVault} className="space-y-3">
          <div>
            <label className="text-[11px] font-mono text-text-muted block mb-1">Vault Goal Title *</label>
            <input
              name="title"
              defaultValue={editingVault?.title || ""}
              placeholder="e.g. PlayStation 5, Emergency Fund, New Laptop"
              required
              className="w-full bg-bg border border-border rounded-xs px-3 py-1.5 text-xs text-text font-mono focus:outline-none focus:border-text"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-mono text-text-muted block mb-1">Target Amount (৳) *</label>
              <input
                type="number"
                step="any"
                name="targetAmount"
                defaultValue={editingVault?.targetAmount || ""}
                placeholder="75000"
                required
                className="w-full bg-bg border border-border rounded-xs px-3 py-1.5 text-xs text-text font-mono focus:outline-none focus:border-text"
              />
            </div>

            <div>
              <label className="text-[11px] font-mono text-text-muted block mb-1">Monthly Plan (৳/mo)</label>
              <input
                type="number"
                step="any"
                name="monthlyAmount"
                defaultValue={editingVault?.monthlyTarget || ""}
                placeholder="5000"
                className="w-full bg-bg border border-border rounded-xs px-3 py-1.5 text-xs text-text font-mono focus:outline-none focus:border-text"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-mono text-text-muted block mb-1">Target Date (Optional)</label>
            <input
              type="date"
              name="targetDate"
              defaultValue={editingVault?.targetDate || ""}
              className="w-full bg-bg border border-border rounded-xs px-3 py-1.5 text-xs text-text font-mono focus:outline-none focus:border-text"
            />
          </div>

          <div>
            <label className="text-[11px] font-mono text-text-muted block mb-1">Notes (Optional)</label>
            <input
              name="notes"
              defaultValue={editingVault?.notes || ""}
              placeholder="e.g. Target PS5 Disc Edition + 2 Controllers"
              className="w-full bg-bg border border-border rounded-xs px-3 py-1.5 text-xs text-text font-mono focus:outline-none focus:border-text"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
            <button
              type="button"
              onClick={() => {
                setIsVaultModalOpen(false);
                setEditingVault(null);
              }}
              className="px-3 py-1.5 rounded-xs text-xs font-mono text-text-muted hover:text-text"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-xs bg-text text-bg font-mono text-xs font-semibold hover:opacity-90"
            >
              Save Vault
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
