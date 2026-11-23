-- CreateTable
CREATE TABLE "ClipboardNote" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "elements" JSONB NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClipboardNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClipboardNote_userId_idx" ON "ClipboardNote"("userId");

-- AddForeignKey
ALTER TABLE "ClipboardNote" ADD CONSTRAINT "ClipboardNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
