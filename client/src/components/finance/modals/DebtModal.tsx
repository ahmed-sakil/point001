import React from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useFinance } from "../FinanceContext";

export const DebtModal: React.FC = () => {
  const {
    isDebtModalOpen,
    setIsDebtModalOpen,
    debtModalType,
    editingDebt,
    setEditingDebt,
    handleSaveDebt,
  } = useFinance();

  if (!isDebtModalOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 bg-bg/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-surface border border-border rounded-md w-full max-w-md p-5 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between pb-2 border-b border-border">
          <h3 className="text-sm font-semibold font-mono text-text">
            {editingDebt
              ? `Edit ${debtModalType === "I_OWE" ? "Dena" : "Paona"}`
              : `Add ${debtModalType === "I_OWE" ? "Dena (I Owe)" : "Paona (Owes Me)"}`}
          </h3>
          <button
            onClick={() => {
              setIsDebtModalOpen(false);
              setEditingDebt(null);
            }}
            className="text-text-muted hover:text-text"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSaveDebt} className="space-y-3">
          <div>
            <label className="text-[11px] font-mono text-text-muted block mb-1">
              {debtModalType === "I_OWE" ? "Payable To (Person / Entity) *" : "Receivable From (Person / Entity) *"}
            </label>
            <input
              name="personName"
              defaultValue={editingDebt?.personName || ""}
              placeholder="e.g. Rahim, Karim, Landlord, Bank Loan"
              required
              className="w-full bg-bg border border-border rounded-xs px-3 py-1.5 text-xs text-text font-mono focus:outline-none focus:border-text"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-mono text-text-muted block mb-1">Total Amount (৳) *</label>
              <input
                type="number"
                step="any"
                name="totalAmount"
                defaultValue={editingDebt?.totalAmount || ""}
                placeholder="0.00"
                required
                className="w-full bg-bg border border-border rounded-xs px-3 py-1.5 text-xs text-text font-mono focus:outline-none focus:border-text"
              />
            </div>

            <div>
              <label className="text-[11px] font-mono text-text-muted block mb-1">
                {debtModalType === "I_OWE" ? "Payment Due Date *" : "Expected Collection Date *"}
              </label>
              <input
                type="date"
                name="dueDate"
                defaultValue={editingDebt?.dueDate || ""}
                required
                className="w-full bg-bg border border-border rounded-xs px-3 py-1.5 text-xs text-text font-mono focus:outline-none focus:border-text"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-mono text-text-muted block mb-1">Phone Number (Optional)</label>
            <input
              name="contactNumber"
              defaultValue={editingDebt?.contactNumber || ""}
              placeholder="e.g. 017..."
              className="w-full bg-bg border border-border rounded-xs px-3 py-1.5 text-xs text-text font-mono focus:outline-none focus:border-text"
            />
          </div>

          <div>
            <label className="text-[11px] font-mono text-text-muted block mb-1">Notes (Optional)</label>
            <input
              name="notes"
              defaultValue={editingDebt?.notes || ""}
              placeholder="e.g. Borrowed for emergency"
              className="w-full bg-bg border border-border rounded-xs px-3 py-1.5 text-xs text-text font-mono focus:outline-none focus:border-text"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
            <button
              type="button"
              onClick={() => {
                setIsDebtModalOpen(false);
                setEditingDebt(null);
              }}
              className="px-3 py-1.5 rounded-xs text-xs font-mono text-text-muted hover:text-text"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-xs bg-text text-bg font-mono text-xs font-semibold hover:opacity-90"
            >
              Save Record
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
