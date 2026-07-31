-- Rename generic column names to entity-prefixed names for clarity.

-- organizations
ALTER TABLE "organizations" RENAME COLUMN "name" TO "organization_name";
ALTER TABLE "organizations" RENAME COLUMN "settings" TO "organization_settings";
ALTER TABLE "organizations" RENAME COLUMN "created_at" TO "organization_created_at";

-- users
ALTER TABLE "users" RENAME COLUMN "email" TO "user_email";
ALTER TABLE "users" RENAME COLUMN "username" TO "user_username";
ALTER TABLE "users" RENAME COLUMN "password_hash" TO "user_password_hash";
ALTER TABLE "users" RENAME COLUMN "name" TO "user_name";
ALTER TABLE "users" RENAME COLUMN "role" TO "user_role";
ALTER TABLE "users" RENAME COLUMN "created_at" TO "user_created_at";
ALTER TABLE "users" RENAME COLUMN "updated_at" TO "user_updated_at";

-- surveys
ALTER TABLE "surveys" RENAME COLUMN "survey" TO "survey_data";
ALTER TABLE "surveys" RENAME COLUMN "items" TO "survey_items";
ALTER TABLE "surveys" RENAME COLUMN "revision" TO "survey_revision";
ALTER TABLE "surveys" RENAME COLUMN "created_at" TO "survey_created_at";
ALTER TABLE "surveys" RENAME COLUMN "updated_at" TO "survey_updated_at";

-- responses
ALTER TABLE "responses" RENAME COLUMN "payload" TO "response_payload";
ALTER TABLE "responses" RENAME COLUMN "status" TO "response_status";
ALTER TABLE "responses" RENAME COLUMN "timestamp" TO "response_timestamp";

-- clients
ALTER TABLE "clients" RENAME COLUMN "name" TO "client_name";
ALTER TABLE "clients" RENAME COLUMN "created_at" TO "client_created_at";

-- topics
ALTER TABLE "topics" RENAME COLUMN "name" TO "topic_name";
ALTER TABLE "topics" RENAME COLUMN "created_at" TO "topic_created_at";

-- dnc_entries
ALTER TABLE "dnc_entries" RENAME COLUMN "email" TO "dnc_email";
