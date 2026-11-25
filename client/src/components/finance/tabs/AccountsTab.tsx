import React from "react";
import { ArrowRightLeft, Plus, Edit3, Trash2 } from "lucide-react";
import { useFinance } from "../FinanceContext";
import { formatCurrency, getAccountIcon } from "../types";

export const AccountsTab: React.FC = () => {
  const {
    data,
    isEditMode,
    setTransferFromId,
    setTransferToId,
    setIsTransferModalOpen,
    setEditingAccount,
    setIsAccountModalOpen,
    handleDeleteAccount,
  } = useFinance();

  const accounts = data?.accounts || [];
  const summary = data?.summary;

  return (
    <div className="space-y-6">
      {/* Consolidated Top Overview Card */}
      <div className="p-3.5 sm:p-4 bg-surface border border-border rounded-md flex justify-between items-stretch gap-3 sm:gap-4">
        {/* Left Column: Total Accounts (Top Left) & Total Balance (Bottom Left) */}
        <div className="flex flex-col justify-between gap-3 min-w-0">
          <div>
            <span className="text-[10px] uppercase font-mono text-text-muted block leading-none">Total Accounts</span>
            <span className="text-sm font-bold font-mono text-text block mt-1">
              {accounts.length}
            </span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-mono text-text-muted block leading-none">Total Balance</span>
            <span className="text-sm font-bold font-mono text-text block mt-1">
              {formatCurrency(summary?.totalLiquidBalance || 0)}
            </span>
          </div>
        </div>

        {/* Right Column: Transfer (Right Top) & New Account (Right Bottom) */}
        <div className="flex flex-col justify-between items-end gap-3 shrink-0">
          <button
            onClick={() => {
              setTransferFromId(accounts[0]?.id || "");
              setTransferToId(accounts[1]?.id || "");
              setIsTransferModalOpen(true);
            }}
            disabled={accounts.length < 2}
            className="interactive-tap flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-bg border border-border hover:border-text hover:bg-surface-hover text-text font-mono text-xs font-semibold transition-colors disabled:opacity-40"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>Transfer</span>
          </button>

          <button
            onClick={() => {
              setEditingAccount(null);
              setIsAccountModalOpen(true);
            }}
            className="interactive-tap flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-bg border border-border hover:border-text hover:bg-surface-hover text-text font-mono text-xs font-semibold transition-colors"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span>New Account</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {accounts.map((acc) => (
          <div key={acc.id} className="p-4 bg-surface border border-border rounded-md flex flex-col justify-between space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-md bg-bg border border-border">
                  {getAccountIcon(acc.accountType)}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-text leading-tight">{acc.name}</h3>
                  <span className="text-[10px] font-mono text-text-muted mt-0.5 block">
                    {acc.accountType} {acc.accountNumber ? `• ${acc.accountNumber}` : ""}
                  </span>
                </div>
              </div>
              {acc.isDefault && (
                <span className="px-1.5 py-0.5 text-[9px] font-mono bg-bg border border-border text-text-muted rounded-xs">
                  Default
                </span>
              )}
            </div>

            <div className="pt-2 border-t border-border/60 flex items-baseline justify-between">
              <span className="text-[10px] font-mono uppercase text-text-muted">Balance</span>
              <span className="text-lg font-bold font-mono text-text">
                {formatCurrency(acc.balance)}
              </span>
            </div>

            {isEditMode && (
              <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-border/40">
                <button
                  onClick={() => {
                    setEditingAccount(acc);
                    setIsAccountModalOpen(true);
                  }}
                  className="interactive-tap p-1.5 rounded-xs text-text-muted hover:text-text hover:bg-bg"
                  title="Edit Account"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDeleteAccount(acc.id)}
                  className="interactive-tap p-1.5 rounded-xs text-text-muted hover:text-text hover:bg-surface-hover"
                  title="Delete Account"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
