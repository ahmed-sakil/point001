import React from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useFinance } from "../FinanceContext";
import { formatCurrency } from "../types";

export const ReceiveInflowModal: React.FC = () => {
  const {
    isReceiveInflowModalOpen,
    setIsReceiveInflowModalOpen,
    activeInflowForReceive,
    setActiveInflowForReceive,
    receiveInflowAmount,
    setReceiveInflowAmount,
    receiveAccountId,
    setReceiveAccountId,
    handleConfirmReceiveInflow,
    accounts,
  } = useFinance();

  if (!isReceiveInflowModalOpen || !activeInflowForReceive) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 bg-bg/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-surface border border-border rounded-md w-full max-w-md p-5 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between pb-2 border-b border-border">
          <h3 className="text-sm font-semibold font-mono text-text">
            Receive: {activeInflowForReceive.title}
          </h3>
          <button
            onClick={() => {
              setIsReceiveInflowModalOpen(false);
              setActiveInflowForReceive(null);
            }}
            className="text-text-muted hover:text-text"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleConfirmReceiveInflow} className="space-y-3">
          <div>
            <label className="text-[11px] font-mono text-text-muted block mb-1">
              Amount Received (৳) *
            </label>
            <input
              type="number"
              step="any"
              value={receiveInflowAmount}
              onChange={(e) => setReceiveInflowAmount(e.target.value)}
              placeholder="5000"
              required
              className="w-full bg-bg border border-border rounded-xs px-3 py-1.5 text-xs text-text font-mono focus:outline-none focus:border-text font-bold"
            />
            {activeInflowForReceive && parseFloat(receiveInflowAmount) !== activeInflowForReceive.amount && (
              <span className="text-[10px] font-mono text-text-muted mt-1 block">
                Expected inflow: {formatCurrency(activeInflowForReceive.amount)}
              </span>
            )}
          </div>

          <div>
            <label className="text-[11px] font-mono text-text-muted block mb-1">Deposit into Account</label>
            <select
              value={receiveAccountId}
              onChange={(e) => setReceiveAccountId(e.target.value)}
              className="w-full bg-bg border border-border rounded-xs px-2.5 py-1.5 text-xs text-text font-mono focus:outline-none focus:border-text"
            >
              <option value="">Do not deposit to any account</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({formatCurrency(a.balance)})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
            <button
              type="button"
              onClick={() => {
                setIsReceiveInflowModalOpen(false);
                setActiveInflowForReceive(null);
              }}
              className="px-3 py-1.5 rounded-xs text-xs font-mono text-text-muted hover:text-text"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-xs bg-text text-bg font-mono text-xs font-semibold hover:opacity-90"
            >
              Confirm Receipt
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
