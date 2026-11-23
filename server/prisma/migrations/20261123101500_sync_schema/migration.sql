-- AlterEnum
ALTER TYPE "EventType" ADD VALUE 'WEEKLY';
ALTER TYPE "EventType" ADD VALUE 'MONTHLY';
ALTER TYPE "EventType" ADD VALUE 'YEARLY';

-- DropIndex
DROP INDEX "MonthlyCommitment_userId_idx";

-- AlterTable
ALTER TABLE "Contact" ADD COLUMN     "addresses" JSONB,
ADD COLUMN     "avatarUrl" TEXT,
ADD COLUMN     "company" TEXT,
ADD COLUMN     "etag" TEXT,
ADD COLUMN     "jobTitle" TEXT;

-- AlterTable
ALTER TABLE "EmailMessage" ADD COLUMN     "senderAvatarUrl" TEXT;

-- AlterTable
ALTER TABLE "ExpectedInflow" ADD COLUMN     "depositToAccountId" TEXT,
ADD COLUMN     "dueDay" INTEGER,
ADD COLUMN     "endDate" DATE,
ADD COLUMN     "inflowType" TEXT NOT NULL DEFAULT 'ONE_TIME',
ADD COLUMN     "receivedDate" DATE,
ADD COLUMN     "startDate" DATE,
ALTER COLUMN "expectedDate" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Habit" ADD COLUMN     "isCompleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "time" TEXT;

-- AlterTable
ALTER TABLE "MonthlyCommitment" ADD COLUMN     "endDate" DATE,
ADD COLUMN     "startDate" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "SavingsGoal" ADD COLUMN     "notes" TEXT,
ALTER COLUMN "color" SET DEFAULT '#f4f4f6';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "googleApiKey" TEXT,
ADD COLUMN     "googleClientId" TEXT,
ADD COLUMN     "googleContactsSyncAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "DebtPaymentLog" (
    "id" TEXT NOT NULL,
    "debtId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "date" DATE NOT NULL,
    "accountId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DebtPaymentLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonthlyCostPayment" (
    "id" TEXT NOT NULL,
    "commitmentId" TEXT NOT NULL,
    "monthYear" TEXT NOT NULL,
    "isPaid" BOOLEAN NOT NULL DEFAULT true,
    "paidDate" DATE,
    "amountPaid" DECIMAL(12,2) NOT NULL,
    "paidFromAccountId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MonthlyCostPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavingsVaultLog" (
    "id" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "sourceAccountId" TEXT,
    "date" DATE NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavingsVaultLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DebtPaymentLog_debtId_idx" ON "DebtPaymentLog"("debtId");

-- CreateIndex
CREATE INDEX "MonthlyCostPayment_commitmentId_idx" ON "MonthlyCostPayment"("commitmentId");

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyCostPayment_commitmentId_monthYear_key" ON "MonthlyCostPayment"("commitmentId", "monthYear");

-- CreateIndex
CREATE INDEX "SavingsVaultLog_goalId_idx" ON "SavingsVaultLog"("goalId");

-- CreateIndex
CREATE INDEX "Contact_userId_displayName_idx" ON "Contact"("userId", "displayName");

-- CreateIndex
CREATE INDEX "MonthlyCommitment_userId_isActive_idx" ON "MonthlyCommitment"("userId", "isActive");

-- AddForeignKey
ALTER TABLE "DebtPaymentLog" ADD CONSTRAINT "DebtPaymentLog_debtId_fkey" FOREIGN KEY ("debtId") REFERENCES "DebtRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthlyCostPayment" ADD CONSTRAINT "MonthlyCostPayment_commitmentId_fkey" FOREIGN KEY ("commitmentId") REFERENCES "MonthlyCommitment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavingsVaultLog" ADD CONSTRAINT "SavingsVaultLog_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "SavingsGoal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
