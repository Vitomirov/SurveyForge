-- CreateTable
CREATE TABLE "survey_types" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "survey_type_name" TEXT NOT NULL,
    "survey_type_created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "survey_types_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "survey_types_organization_id_idx" ON "survey_types"("organization_id");

-- AddForeignKey
ALTER TABLE "survey_types" ADD CONSTRAINT "survey_types_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
