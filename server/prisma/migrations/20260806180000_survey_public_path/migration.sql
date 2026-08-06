-- White-label public survey path (e.g. brand-tracking-060826)
ALTER TABLE "surveys" ADD COLUMN "survey_public_path" TEXT;

CREATE UNIQUE INDEX "surveys_survey_public_path_key" ON "surveys"("survey_public_path");
