-- Auth identity: email globally unique; username unique per organization.

-- Backfill missing usernames from email local-part.
UPDATE "users"
SET "user_username" = LOWER(SPLIT_PART("user_email", '@', 1))
WHERE "user_username" IS NULL OR TRIM("user_username") = '';

-- Resolve duplicate legacy .local emails (keep earliest row per email).
WITH ranked AS (
  SELECT
    id,
    user_email,
    organization_id,
    ROW_NUMBER() OVER (
      PARTITION BY LOWER("user_email")
      ORDER BY "user_created_at" ASC, id ASC
    ) AS rn
  FROM "users"
  WHERE LOWER("user_email") LIKE '%@rescopesurveys.local'
)
UPDATE "users" u
SET "user_email" = LOWER(SPLIT_PART(u."user_email", '@', 1))
  || '+'
  || SUBSTRING(u."organization_id" FROM 1 FOR 8)
  || '@rescopesurveys.local'
FROM ranked r
WHERE u.id = r.id AND r.rn > 1;

-- Fail if non-legacy duplicate emails remain.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "users"
    GROUP BY LOWER("user_email")
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot migrate: duplicate user_email values exist. Resolve manually before applying global email uniqueness.';
  END IF;
END $$;

-- Resolve duplicate usernames within the same org (keep earliest row).
WITH ranked AS (
  SELECT
    id,
    user_username,
    organization_id,
    ROW_NUMBER() OVER (
      PARTITION BY "organization_id", LOWER("user_username")
      ORDER BY "user_created_at" ASC, id ASC
    ) AS rn
  FROM "users"
  WHERE "user_username" IS NOT NULL AND TRIM("user_username") <> ''
)
UPDATE "users" u
SET "user_username" = r."user_username" || '-' || r.rn
FROM ranked r
WHERE u.id = r.id AND r.rn > 1;

DROP INDEX IF EXISTS "users_organization_id_email_key";

CREATE UNIQUE INDEX "users_user_email_key" ON "users"("user_email");

CREATE UNIQUE INDEX "users_organization_id_user_username_key" ON "users"("organization_id", "user_username");
