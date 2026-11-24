import { Router } from "express";
import {
  getFinanceOverview,
  createAccount,
  updateAccount,
  deleteAccount,
  transferFunds,
  createQuickTransaction,
  deleteQuickTransaction,
  createDebt,
  updateDebt,
  deleteDebt,
  recordDebtPayment,
  deleteDebtPaymentLog,
  createMonthlyCommitment,
  updateMonthlyCommitment,
  deleteMonthlyCommitment,
  toggleMonthlyCostPayment,
  createExpectedInflow,
  updateExpectedInflow,
  deleteExpectedInflow,
  markInflowReceived,
  revertInflowReceived,
  createSavingsVault,
  updateSavingsVault,
  deleteSavingsVault,
  transactVault,
} from "../controllers/finance.controller.js";
import { authenticateToken } from "../middlewares/auth.middleware.js";

const router = Router();

// Protect all finance endpoints with active user authentication
router.use(authenticateToken);

// 1. Overview & Dashboard
router.get("/overview", getFinanceOverview);

// 2. Accounts
router.post("/accounts", createAccount);
router.put("/accounts/:id", updateAccount);
router.delete("/accounts/:id", deleteAccount);
router.post("/accounts/transfer", transferFunds);
router.post("/quick-transaction", createQuickTransaction);
router.delete("/quick-transaction/:id", deleteQuickTransaction);

// 3. Dena & Paona (Debts)
router.post("/debts", createDebt);
router.put("/debts/:id", updateDebt);
router.delete("/debts/:id", deleteDebt);
router.post("/debts/:id/pay", recordDebtPayment);
router.delete("/debts/:id/payments/:paymentId", deleteDebtPaymentLog);

// 4. Monthly Costs
router.post("/monthly-costs", createMonthlyCommitment);
router.put("/monthly-costs/:id", updateMonthlyCommitment);
router.delete("/monthly-costs/:id", deleteMonthlyCommitment);
router.post("/monthly-costs/:id/toggle-payment", toggleMonthlyCostPayment);

// 5. Expected Inflows
router.post("/inflows", createExpectedInflow);
router.put("/inflows/:id", updateExpectedInflow);
router.delete("/inflows/:id", deleteExpectedInflow);
router.post("/inflows/:id/received", markInflowReceived);
router.post("/inflows/:id/revert", revertInflowReceived);

// 6. Savings Vaults
router.post("/vaults", createSavingsVault);
router.put("/vaults/:id", updateSavingsVault);
router.delete("/vaults/:id", deleteSavingsVault);
router.post("/vaults/:id/transact", transactVault);

export default router;
