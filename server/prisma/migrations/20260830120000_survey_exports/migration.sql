-- Persist CSV export events so "new since last export" works in API mode.

CREATE TABLE "survey_exports" (
    "id" TEXT NOT NULL,
    "survey_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "exported_by_id" TEXT,
    "exported_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "row_count" INTEGER NOT NULL,
    "export_filters" JSONB,

    CONSTRAINT "survey_exports_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "survey_exports_survey_id_exported_at_idx"
  ON "survey_exports"("survey_id", "exported_at" DESC);

CREATE INDEX "survey_exports_organization_id_idx"
  ON "survey_exports"("organization_id");

ALTER TABLE "survey_exports"
  ADD CONSTRAINT "survey_exports_survey_id_fkey"
  FOREIGN KEY ("survey_id") REFERENCES "surveys"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "survey_exports"
  ADD CONSTRAINT "survey_exports_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "survey_exports"
  ADD CONSTRAINT "survey_exports_exported_by_id_fkey"
  FOREIGN KEY ("exported_by_id") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
