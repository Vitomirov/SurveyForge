ALTER TABLE "support_threads"
  ADD COLUMN "support_org_last_read_at" TIMESTAMP(3),
  ADD COLUMN "support_vendor_last_read_at" TIMESTAMP(3);
