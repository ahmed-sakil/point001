import React from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useFinance } from "../FinanceContext";

export const InflowModal: React.FC = () => {
  const {
    isInflowModalOpen,
    setIsInflowModalOpen,
    editingInflow,
    setEditingInflow,
    inflowModalType,
    setInflowModalType,
    handleSaveInflow,
    isSubmitting,
  } = useFinance();

  if (!isInflowModalOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 bg-bg/80 backdrop-blur-xs flex items-center justify-center p-4 animate-modal-backdrop">
      <div className="bg-surface border border-border rounded-md w-full max-w-md p-5 space-y-4 shadow-2xl animate-modal-card">
        <div className="flex items-center justify-between pb-2 border-b border-border">
          <h3 className="text-sm font-semibold font-mono text-text">
            {editingInflow ? "Edit Income" : "New Income"}
          </h3>
          <button
            onClick={() => {
              setIsInflowModalOpen(false);
              setEditingInflow(null);
            }}
            className="text-text-muted hover:text-text"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {!editingInflow && (
          <div className="flex items-center gap-1 p-1 bg-bg border border-border rounded-xs">
            <button
              type="button"
              onClick={() => setInflowModalType("ONE_TIME")}
              className={`flex-1 py-1 text-xs font-mono rounded-xs transition-colors text-center ${
                inflowModalType === "ONE_TIME"
                  ? "bg-text text-bg font-semibold"
                  : "text-text-muted hover:text-text"
              }`}
            >
              One-time
            </button>
            <button
              type="button"
              onClick={() => setInflowModalType("MONTHLY")}
              className={`flex-1 py-1 text-xs font-mono rounded-xs transition-colors text-center ${
                inflowModalType === "MONTHLY"
                  ? "bg-text text-bg font-semibold"
                  : "text-text-muted hover:text-text"
              }`}
            >
              Monthly
            </button>
          </div>
        )}

        <form onSubmit={handleSaveInflow} className="space-y-3">
          <input type="hidden" name="inflowType" value={inflowModalType} />

          <div>
            <label className="text-[11px] font-mono text-text-muted block mb-1">Title *</label>
            <input
              name="title"
              defaultValue={editingInflow?.title || ""}
              placeholder={
                inflowModalType === "ONE_TIME"
                  ? "e.g. Freelance Web Project, Bonus, Sold Laptop"
                  : "e.g. Monthly Salary, House Rent Inflow, Tuition"
              }
              required
              className="w-full bg-bg border border-border rounded-xs px-3 py-1.5 text-xs text-text font-mono focus:outline-none focus:border-text"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-mono text-text-muted block mb-1">Amount (৳) *</label>
              <input
                type="number"
                step="any"
                name="amount"
                defaultValue={editingInflow?.amount || ""}
                placeholder="25000"
                required
                className="w-full bg-bg border border-border rounded-xs px-3 py-1.5 text-xs text-text font-mono focus:outline-none focus:border-text"
              />
            </div>

            {inflowModalType === "MONTHLY" ? (
              <div>
                <label className="text-[11px] font-mono text-text-muted block mb-1">Due Day of Month (1 - 31) *</label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  name="dueDay"
                  defaultValue={editingInflow?.dueDay || 5}
                  required
                  className="w-full bg-bg border border-border rounded-xs px-3 py-1.5 text-xs text-text font-mono focus:outline-none focus:border-text"
                />
              </div>
            ) : (
              <div>
                <label className="text-[11px] font-mono text-text-muted block mb-1">Expected Date</label>
                <input
                  type="date"
                  name="expectedDate"
                  defaultValue={editingInflow?.expectedDateStr || new Date().toISOString().split("T")[0]}
                  className="w-full bg-bg border border-border rounded-xs px-3 py-1.5 text-xs text-text font-mono focus:outline-none focus:border-text"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-mono text-text-muted block mb-1">Confidence</label>
              <select
                name="confidence"
                defaultValue={editingInflow?.confidence || "CERTAIN"}
                className="w-full bg-bg border border-border rounded-xs px-2.5 py-1.5 text-xs text-text font-mono focus:outline-none focus:border-text"
              >
                <option value="CERTAIN">Certain (Guaranteed)</option>
                <option value="PROBABLE">Probable (Likely)</option>
                <option value="TENTATIVE">Tentative (Uncertain)</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-mono text-text-muted block mb-1">Notes (Optional)</label>
              <input
                name="notes"
                defaultValue={editingInflow?.notes || ""}
                placeholder="Optional details"
                className="w-full bg-bg border border-border rounded-xs px-3 py-1.5 text-xs text-text font-mono focus:outline-none focus:border-text"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
            <button
              type="button"
              onClick={() => {
                setIsInflowModalOpen(false);
                setEditingInflow(null);
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
              {isSubmitting ? "Saving..." : "Save Income"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
