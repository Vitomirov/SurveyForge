-- Survey ownership: who created each survey (used for editor scoping in Phase 3).

ALTER TABLE "surveys" ADD COLUMN "survey_created_by_id" TEXT;

CREATE INDEX "surveys_organization_id_survey_created_by_id_idx"
  ON "surveys"("organization_id", "survey_created_by_id");

ALTER TABLE "surveys" ADD CONSTRAINT "surveys_survey_created_by_id_fkey"
  FOREIGN KEY ("survey_created_by_id") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Existing surveys: assign each org's oldest admin (fallback: oldest user).
UPDATE "surveys" s
SET "survey_created_by_id" = (
  SELECT u.id
  FROM "users" u
  WHERE u.organization_id = s.organization_id
  ORDER BY
    CASE WHEN u.user_role = 'admin' THEN 0 ELSE 1 END,
    u.user_created_at ASC
  LIMIT 1
)
WHERE s."survey_created_by_id" IS NULL;
