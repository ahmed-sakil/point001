import React from "react";
import { Plus, PiggyBank, Edit3, Trash2 } from "lucide-react";
import { useFinance } from "../FinanceContext";
import { formatCurrency } from "../types";

export const SavingsVaultsTab: React.FC = () => {
  const {
    data,
    isEditMode,
    setEditingVault,
    setIsVaultModalOpen,
    handleDeleteVault,
    setActiveVaultForTransact,
    setVaultTransactType,
    setVaultTransactAmount,
    setVaultTransactAccountId,
    setIsVaultTransactModalOpen,
    savingsVaults,
  } = useFinance();

  const accounts = data?.accounts || [];
  const summary = data?.summary;

  return (
    <div className="space-y-6">
      {/* Consolidated Top Overview Card */}
      <div className="p-3.5 sm:p-4 bg-surface border border-border rounded-md flex justify-between items-stretch gap-3 sm:gap-4">
        {/* Left Column: Total Vault (Top Left) & Total Saved (Bottom Left) */}
        <div className="flex flex-col justify-between gap-3 min-w-0">
          <div>
            <span className="text-[10px] uppercase font-mono text-text-muted block leading-none">Total Vault</span>
            <span className="text-sm font-bold font-mono text-text block mt-1">
              {savingsVaults.length}
            </span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-mono text-text-muted block leading-none">Total Saved</span>
            <span className="text-sm font-bold font-mono text-text block mt-1">
              {formatCurrency(summary?.totalVaultSavings || 0)}
            </span>
          </div>
        </div>

        {/* Right Column: New Vault (Right Top) */}
        <div className="flex flex-col justify-start items-end gap-3 shrink-0">
          <button
            onClick={() => {
              setEditingVault(null);
              setIsVaultModalOpen(true);
            }}
            className="interactive-tap flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-bg border border-border hover:border-text hover:bg-surface-hover text-text font-mono text-xs font-semibold transition-colors"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span>New Vault</span>
          </button>
        </div>
      </div>

      {savingsVaults.length === 0 ? (
        <div className="py-12 flex flex-col items-center justify-center text-center bg-surface border border-border rounded-md">
          <PiggyBank className="w-8 h-8 text-text-muted mb-2" />
          <p className="text-xs font-mono text-text">No savings vaults</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {savingsVaults.map((vault) => (
            <div
              key={vault.id}
              className={`p-4 bg-surface border rounded-md flex flex-col justify-between space-y-3.5 ${
                vault.isCompleted ? "border-text/60" : "border-border"
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <PiggyBank className="w-4 h-4 text-text" />
                    <h3 className="text-sm font-semibold text-text">{vault.title}</h3>
                    {vault.isCompleted && (
                      <span className="px-1.5 py-0.2 text-[9px] font-mono bg-text text-bg font-bold rounded-xs">
                        ACHIEVED!
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-mono text-text-muted block mt-0.5">
                    {vault.targetDate ? `Target Date: ${vault.targetDate}` : "No deadline"}
                    {vault.monthlyTarget > 0 ? ` • Goal: ${formatCurrency(vault.monthlyTarget)}/mo` : ""}
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-base font-bold font-mono text-text block">
                    {formatCurrency(vault.currentAmount)}
                  </span>
                  <span className="text-[10px] font-mono text-text-muted">
                    of {formatCurrency(vault.targetAmount)}
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1">
                <div className="w-full h-2 bg-bg border border-border rounded-full overflow-hidden">
                  <div
                    className="h-full bg-text transition-all duration-500 rounded-full"
                    style={{ width: `${vault.progressPercent}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] font-mono text-text-muted">
                  <span>{vault.progressPercent}% complete</span>
                  <span>Remaining: {formatCurrency(vault.remainingAmount)}</span>
                </div>
              </div>

              {/* Vault Actions */}
              <div className="pt-2 border-t border-border/60 flex items-center justify-between">
                {isEditMode ? (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setEditingVault(vault);
                        setIsVaultModalOpen(true);
                      }}
                      className="interactive-tap p-1.5 rounded-xs text-text-muted hover:text-text hover:bg-bg"
                      title="Edit Vault"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteVault(vault.id)}
                      className="interactive-tap p-1.5 rounded-xs text-text-muted hover:text-text hover:bg-surface-hover"
                      title="Delete Vault"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <span />
                )}

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      setActiveVaultForTransact(vault);
                      setVaultTransactType("WITHDRAWAL");
                      setVaultTransactAmount("");
                      const defaultAcc = accounts.find((a) => a.isDefault)?.id || accounts[0]?.id || "";
                      setVaultTransactAccountId(defaultAcc);
                      setIsVaultTransactModalOpen(true);
                    }}
                    disabled={vault.currentAmount <= 0}
                    className="interactive-tap px-2.5 py-1 rounded-xs bg-bg border border-border hover:border-text text-[10px] font-mono text-text transition-colors disabled:opacity-40"
                  >
                    Withdraw
                  </button>
                  <button
                    onClick={() => {
                      setActiveVaultForTransact(vault);
                      setVaultTransactType("DEPOSIT");
                      setVaultTransactAmount("");
                      const defaultAcc = accounts.find((a) => a.isDefault)?.id || accounts[0]?.id || "";
                      setVaultTransactAccountId(defaultAcc);
                      setIsVaultTransactModalOpen(true);
                    }}
                    className="interactive-tap px-2.5 py-1 rounded-xs bg-text text-bg font-semibold text-[10px] font-mono hover:opacity-90 transition-opacity"
                  >
                    + Deposit
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
