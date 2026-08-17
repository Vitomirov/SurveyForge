-- Access-token epoch: increment on password change so existing JWTs fail immediately.
ALTER TABLE "users" ADD COLUMN "user_token_version" INTEGER NOT NULL DEFAULT 0;
