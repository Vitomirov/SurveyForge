-- Phase 6: subscriptions, invoices, and support threads per organization.

CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "subscription_plan_id" TEXT NOT NULL,
    "subscription_status" TEXT NOT NULL DEFAULT 'trialing',
    "subscription_seats" INTEGER NOT NULL DEFAULT 5,
    "subscription_price_cents" INTEGER NOT NULL DEFAULT 0,
    "subscription_currency" TEXT NOT NULL DEFAULT 'USD',
    "subscription_period_start" TIMESTAMP(3) NOT NULL,
    "subscription_period_end" TIMESTAMP(3) NOT NULL,
    "subscription_created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "subscription_updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "invoice_amount_cents" INTEGER NOT NULL,
    "invoice_currency" TEXT NOT NULL DEFAULT 'USD',
    "invoice_status" TEXT NOT NULL DEFAULT 'draft',
    "invoice_description" TEXT,
    "invoice_period_start" TIMESTAMP(3),
    "invoice_period_end" TIMESTAMP(3),
    "invoice_due_date" TIMESTAMP(3),
    "invoice_paid_at" TIMESTAMP(3),
    "invoice_created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "invoice_updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "support_threads" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "support_thread_status" TEXT NOT NULL DEFAULT 'open',
    "support_thread_created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "support_thread_updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "support_threads_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "support_messages" (
    "id" TEXT NOT NULL,
    "support_thread_id" TEXT NOT NULL,
    "support_message_author_id" TEXT NOT NULL,
    "support_message_body" TEXT NOT NULL,
    "support_message_created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "support_messages_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "subscriptions_organization_id_key" ON "subscriptions"("organization_id");
CREATE INDEX "invoices_organization_id_idx" ON "invoices"("organization_id");
CREATE INDEX "invoices_organization_id_invoice_created_at_idx" ON "invoices"("organization_id", "invoice_created_at" DESC);
CREATE UNIQUE INDEX "support_threads_organization_id_key" ON "support_threads"("organization_id");
CREATE INDEX "support_messages_support_thread_id_idx" ON "support_messages"("support_thread_id");
CREATE INDEX "support_messages_support_thread_id_support_message_created_at_idx" ON "support_messages"("support_thread_id", "support_message_created_at");

ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "support_threads" ADD CONSTRAINT "support_threads_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "support_messages" ADD CONSTRAINT "support_messages_support_thread_id_fkey" FOREIGN KEY ("support_thread_id") REFERENCES "support_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "support_messages" ADD CONSTRAINT "support_messages_support_message_author_id_fkey" FOREIGN KEY ("support_message_author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill starter trial subscription for every existing org.
INSERT INTO "subscriptions" (
    "id",
    "organization_id",
    "subscription_plan_id",
    "subscription_status",
    "subscription_seats",
    "subscription_price_cents",
    "subscription_currency",
    "subscription_period_start",
    "subscription_period_end",
    "subscription_created_at",
    "subscription_updated_at"
)
SELECT
    gen_random_uuid()::text,
    o."id",
    'starter',
    'trialing',
    5,
    4900,
    'USD',
    o."organization_created_at",
    o."organization_created_at" + INTERVAL '14 days',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "organizations" o
WHERE NOT EXISTS (
    SELECT 1 FROM "subscriptions" s WHERE s."organization_id" = o."id"
);

-- One support thread per org.
INSERT INTO "support_threads" (
    "id",
    "organization_id",
    "support_thread_status",
    "support_thread_created_at",
    "support_thread_updated_at"
)
SELECT
    gen_random_uuid()::text,
    o."id",
    'open',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "organizations" o
WHERE NOT EXISTS (
    SELECT 1 FROM "support_threads" t WHERE t."organization_id" = o."id"
);
