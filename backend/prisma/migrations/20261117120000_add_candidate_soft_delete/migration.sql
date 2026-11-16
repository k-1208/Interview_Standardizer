-- AlterTable
ALTER TABLE "candidates" ADD COLUMN "isDeleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "deletedAt" TIMESTAMP(3),
ADD COLUMN "deletedById" INTEGER;

-- CreateIndex
CREATE INDEX "candidates_workspaceId_isDeleted_idx" ON "candidates"("workspaceId", "isDeleted");
