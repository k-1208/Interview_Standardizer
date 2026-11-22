-- CreateEnum
CREATE TYPE "ApiKeyProvider" AS ENUM ('gemini', 'recall');

-- CreateTable
CREATE TABLE "workspace_api_keys" (
    "id" SERIAL NOT NULL,
    "workspaceId" INTEGER NOT NULL,
    "provider" "ApiKeyProvider" NOT NULL,
    "encryptedValue" TEXT NOT NULL,
    "maskedValue" VARCHAR(40) NOT NULL,
    "updatedById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workspace_api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "workspace_api_keys_workspaceId_provider_key" ON "workspace_api_keys"("workspaceId", "provider");

-- AddForeignKey
ALTER TABLE "workspace_api_keys" ADD CONSTRAINT "workspace_api_keys_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_api_keys" ADD CONSTRAINT "workspace_api_keys_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
