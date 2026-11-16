-- AlterTable
ALTER TABLE "candidates" ADD COLUMN "assignedReviewerId" INTEGER;

-- AddForeignKey
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_assignedReviewerId_fkey" FOREIGN KEY ("assignedReviewerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
