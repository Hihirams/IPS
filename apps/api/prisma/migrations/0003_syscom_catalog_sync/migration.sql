-- Migracion 0003: Catalogo SYSCOM y sync_logs

ALTER TABLE "categories" ADD COLUMN "syscom_id" TEXT;
ALTER TABLE "categories" ADD COLUMN "level" INTEGER NOT NULL DEFAULT 1;
CREATE UNIQUE INDEX "categories_syscom_id_key" ON "categories"("syscom_id");
CREATE INDEX "categories_syscom_id_idx" ON "categories"("syscom_id");

ALTER TABLE "brands" ADD COLUMN "syscom_id" TEXT;
CREATE UNIQUE INDEX "brands_syscom_id_key" ON "brands"("syscom_id");
CREATE INDEX "brands_syscom_id_idx" ON "brands"("syscom_id");

ALTER TABLE "products" ADD COLUMN "syscom_id" TEXT;
ALTER TABLE "products" ADD COLUMN "sat_key" TEXT;
ALTER TABLE "products" ADD COLUMN "original_link" TEXT;
ALTER TABLE "products" ADD COLUMN "last_synced_at" TIMESTAMP(3);
CREATE UNIQUE INDEX "products_syscom_id_key" ON "products"("syscom_id");
CREATE INDEX "products_syscom_id_idx" ON "products"("syscom_id");

CREATE TYPE "SyncStatus" AS ENUM ('RUNNING', 'COMPLETED', 'FAILED');
CREATE TYPE "SyncEntityType" AS ENUM ('CATEGORIES', 'BRANDS', 'PRODUCTS', 'EXCHANGE_RATE');

CREATE TABLE "sync_logs" (
  "id" TEXT NOT NULL,
  "entity_type" "SyncEntityType" NOT NULL,
  "status" "SyncStatus" NOT NULL DEFAULT 'RUNNING',
  "records_processed" INTEGER NOT NULL DEFAULT 0,
  "records_created" INTEGER NOT NULL DEFAULT 0,
  "records_updated" INTEGER NOT NULL DEFAULT 0,
  "records_skipped" INTEGER NOT NULL DEFAULT 0,
  "error_message" TEXT,
  "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completed_at" TIMESTAMP(3),
  "triggered_by" TEXT,
  CONSTRAINT "sync_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "sync_logs_entity_type_idx" ON "sync_logs"("entity_type");
CREATE INDEX "sync_logs_status_idx" ON "sync_logs"("status");
CREATE INDEX "sync_logs_started_at_idx" ON "sync_logs"("started_at");