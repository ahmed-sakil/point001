import React from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useFinance } from "../FinanceContext";

export const MonthlyCostModal: React.FC = () => {
  const {
    isMonthlyCostModalOpen,
    setIsMonthlyCostModalOpen,
    editingMonthlyCost,
    setEditingMonthlyCost,
    costModalType,
    setCostModalType,
    handleSaveMonthlyCost,
    data,
    accounts,
  } = useFinance();

  if (!isMonthlyCostModalOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 bg-bg/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-surface border border-border rounded-md w-full max-w-md p-5 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between pb-2 border-b border-border">
          <h3 className="text-sm font-semibold font-mono text-text">
            {editingMonthlyCost ? "Edit Monthly Cost" : "New Cost"}
          </h3>
          <button
            onClick={() => {
              setIsMonthlyCostModalOpen(false);
              setEditingMonthlyCost(null);
            }}
            className="text-text-muted hover:text-text"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {!editingMonthlyCost && (
          <div className="flex items-center gap-1 p-1 bg-bg border border-border rounded-xs">
            <button
              type="button"
              onClick={() => setCostModalType("ONE_TIME")}
              className={`flex-1 py-1 text-xs font-mono rounded-xs transition-colors text-center ${
                costModalType === "ONE_TIME"
                  ? "bg-text text-bg font-semibold"
                  : "text-text-muted hover:text-text"
              }`}
            >
              One-time
            </button>
            <button
              type="button"
              onClick={() => setCostModalType("REPEATING")}
              className={`flex-1 py-1 text-xs font-mono rounded-xs transition-colors text-center ${
                costModalType === "REPEATING"
                  ? "bg-text text-bg font-semibold"
                  : "text-text-muted hover:text-text"
              }`}
            >
              Repeating
            </button>
          </div>
        )}

        {costModalType === "ONE_TIME" && !editingMonthlyCost ? (
          <form onSubmit={handleSaveMonthlyCost} className="space-y-3">
            <div>
              <label className="text-[11px] font-mono text-text-muted block mb-1">Title *</label>
              <input
                name="title"
                placeholder="e.g. Lunch, Groceries, Saloon, Taxi"
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
                  placeholder="500"
                  required
                  className="w-full bg-bg border border-border rounded-xs px-3 py-1.5 text-xs text-text font-mono focus:outline-none focus:border-text"
                />
              </div>

              <div>
                <label className="text-[11px] font-mono text-text-muted block mb-1">Paid From Account *</label>
                <select
                  name="accountId"
                  defaultValue={data?.accounts?.find((a) => a.isDefault)?.id || data?.accounts?.[0]?.id || ""}
                  required
                  className="w-full bg-bg border border-border rounded-xs px-2.5 py-1.5 text-xs text-text font-mono focus:outline-none focus:border-text"
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} (৳{a.balance})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-mono text-text-muted block mb-1">Date</label>
                <input
                  type="date"
                  name="date"
                  defaultValue={new Date().toISOString().split("T")[0]}
                  className="w-full bg-bg border border-border rounded-xs px-3 py-1.5 text-xs text-text font-mono focus:outline-none focus:border-text"
                />
              </div>

              <div>
                <label className="text-[11px] font-mono text-text-muted block mb-1">Category</label>
                <select
                  name="category"
                  defaultValue="Food"
                  className="w-full bg-bg border border-border rounded-xs px-2.5 py-1.5 text-xs text-text font-mono focus:outline-none focus:border-text"
                >
                  <option value="Food">Food / Dining</option>
                  <option value="Transport">Transport / Fuel</option>
                  <option value="Utility">Utility & Bills</option>
                  <option value="Shopping">Shopping</option>
                  <option value="Health">Medical / Health</option>
                  <option value="Entertainment">Entertainment</option>
                  <option value="Housing">Housing</option>
                  <option value="Family">Family Support</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-mono text-text-muted block mb-1">Notes (Optional)</label>
              <input
                name="notes"
                placeholder="e.g. Quick cost logged"
                className="w-full bg-bg border border-border rounded-xs px-3 py-1.5 text-xs text-text font-mono focus:outline-none focus:border-text"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => {
                  setIsMonthlyCostModalOpen(false);
                  setEditingMonthlyCost(null);
                }}
                className="px-3 py-1.5 rounded-xs text-xs font-mono text-text-muted hover:text-text"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-xs bg-text text-bg font-mono text-xs font-semibold hover:opacity-90"
              >
                Save Cost
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSaveMonthlyCost} className="space-y-3">
            <div>
              <label className="text-[11px] font-mono text-text-muted block mb-1">Title *</label>
              <input
                name="title"
                defaultValue={editingMonthlyCost?.title || ""}
                placeholder="e.g. Home Rent, Mess Bill, Wifi, Gym"
                required
                className="w-full bg-bg border border-border rounded-xs px-3 py-1.5 text-xs text-text font-mono focus:outline-none focus:border-text"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-mono text-text-muted block mb-1">Monthly Amount (৳) *</label>
                <input
                  type="number"
                  step="any"
                  name="amount"
                  defaultValue={editingMonthlyCost?.amount || ""}
                  placeholder="15000"
                  required
                  className="w-full bg-bg border border-border rounded-xs px-3 py-1.5 text-xs text-text font-mono focus:outline-none focus:border-text"
                />
              </div>

              <div>
                <label className="text-[11px] font-mono text-text-muted block mb-1">Due Day of Month (1 - 31) *</label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  name="dueDayOfMonth"
                  defaultValue={editingMonthlyCost?.dueDayOfMonth || 3}
                  required
                  className="w-full bg-bg border border-border rounded-xs px-3 py-1.5 text-xs text-text font-mono focus:outline-none focus:border-text"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-mono text-text-muted block mb-1">Contract Start Date *</label>
                <input
                  type="date"
                  name="startDate"
                  defaultValue={editingMonthlyCost?.startDate || new Date().toISOString().split("T")[0]}
                  required
                  className="w-full bg-bg border border-border rounded-xs px-3 py-1.5 text-xs text-text font-mono focus:outline-none focus:border-text"
                />
              </div>

              <div>
                <label className="text-[11px] font-mono text-text-muted block mb-1">Contract End Date (Optional)</label>
                <input
                  type="date"
                  name="endDate"
                  defaultValue={editingMonthlyCost?.endDate || ""}
                  placeholder="Ongoing if empty"
                  className="w-full bg-bg border border-border rounded-xs px-3 py-1.5 text-xs text-text font-mono focus:outline-none focus:border-text"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-mono text-text-muted block mb-1">Category</label>
                <select
                  name="category"
                  defaultValue={editingMonthlyCost?.category || "Housing"}
                  className="w-full bg-bg border border-border rounded-xs px-2.5 py-1.5 text-xs text-text font-mono focus:outline-none focus:border-text"
                >
                  <option value="Housing">Housing / Rent</option>
                  <option value="Utility">Utility & Bills</option>
                  <option value="Food">Food / Mess</option>
                  <option value="Family">Family Support</option>
                  <option value="Subscription">Subscription</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-mono text-text-muted block mb-1">Default Account</label>
                <select
                  name="defaultAccountId"
                  defaultValue={editingMonthlyCost?.defaultAccountId || ""}
                  className="w-full bg-bg border border-border rounded-xs px-2.5 py-1.5 text-xs text-text font-mono focus:outline-none focus:border-text"
                >
                  <option value="">None</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-mono text-text-muted block mb-1">Notes (Optional)</label>
              <input
                name="notes"
                defaultValue={editingMonthlyCost?.notes || ""}
                placeholder="e.g. Includes water and gas"
                className="w-full bg-bg border border-border rounded-xs px-3 py-1.5 text-xs text-text font-mono focus:outline-none focus:border-text"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => {
                  setIsMonthlyCostModalOpen(false);
                  setEditingMonthlyCost(null);
                }}
                className="px-3 py-1.5 rounded-xs text-xs font-mono text-text-muted hover:text-text"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-xs bg-text text-bg font-mono text-xs font-semibold hover:opacity-90"
              >
                Save Contract
              </button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body
  );
};
