import React from "react";
import {
  AccountModal,
  TransferModal,
  DebtDetailModal,
  DebtModal,
  DebtPaymentModal,
  MonthlyCostModal,
  PayMonthlyCostModal,
  InflowModal,
  ReceiveInflowModal,
  VaultModal,
  VaultTransactModal,
} from "./index";

export const FinanceModals: React.FC = () => {
  return (
    <>
      <AccountModal />
      <TransferModal />
      <DebtDetailModal />
      <DebtModal />
      <DebtPaymentModal />
      <MonthlyCostModal />
      <PayMonthlyCostModal />
      <InflowModal />
      <ReceiveInflowModal />
      <VaultModal />
      <VaultTransactModal />
    </>
  );
};
