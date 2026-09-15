-- Email verification: existing accounts predate the flow and are grandfathered in.
ALTER TABLE "users" ADD COLUMN "user_email_verified_at" TIMESTAMP(3);
UPDATE "users" SET "user_email_verified_at" = "user_created_at";

-- One-time links (invite / password_reset / email_verify). Hash only — never the raw token.
CREATE TABLE "auth_tokens" (
    "id" TEXT NOT NULL,
    "token_type" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "token_email" TEXT NOT NULL,
    "organization_id" TEXT,
    "user_id" TEXT,
    "invite_role" TEXT,
    "invited_by_id" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "auth_tokens_token_hash_key" ON "auth_tokens"("token_hash");
CREATE INDEX "auth_tokens_token_type_token_email_idx" ON "auth_tokens"("token_type", "token_email");
CREATE INDEX "auth_tokens_organization_id_token_type_idx" ON "auth_tokens"("organization_id", "token_type");

ALTER TABLE "auth_tokens" ADD CONSTRAINT "auth_tokens_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "auth_tokens" ADD CONSTRAINT "auth_tokens_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
