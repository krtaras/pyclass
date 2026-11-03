ALTER TABLE "modules" ADD COLUMN IF NOT EXISTS "slug" text;
ALTER TABLE "modules" ADD COLUMN IF NOT EXISTS "repo_managed" boolean DEFAULT true NOT NULL;
ALTER TABLE "lessons" ADD COLUMN IF NOT EXISTS "slug" text;
ALTER TABLE "lessons" ADD COLUMN IF NOT EXISTS "repo_managed" boolean DEFAULT true NOT NULL;
ALTER TABLE "exercises" ADD COLUMN IF NOT EXISTS "slug" text;
ALTER TABLE "exercises" ADD COLUMN IF NOT EXISTS "repo_managed" boolean DEFAULT true NOT NULL;
ALTER TABLE "quiz_questions" ADD COLUMN IF NOT EXISTS "slug" text;
ALTER TABLE "quiz_questions" ADD COLUMN IF NOT EXISTS "repo_managed" boolean DEFAULT true NOT NULL;
--> statement-breakpoint
UPDATE "modules" SET "slug" = 'legacy-mod-' || "id"::text WHERE "slug" IS NULL;
--> statement-breakpoint
UPDATE "lessons" SET "slug" = 'legacy-lesson-' || "id"::text WHERE "slug" IS NULL;
--> statement-breakpoint
UPDATE "exercises" SET "slug" = 'legacy-ex-' || "id"::text WHERE "slug" IS NULL;
--> statement-breakpoint
UPDATE "quiz_questions" SET "slug" = 'legacy-q-' || "id"::text WHERE "slug" IS NULL;
--> statement-breakpoint
ALTER TABLE "modules" ALTER COLUMN "slug" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "lessons" ALTER COLUMN "slug" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "exercises" ALTER COLUMN "slug" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "quiz_questions" ALTER COLUMN "slug" SET NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "modules_slug_idx" ON "modules" USING btree ("slug");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "lessons_slug_idx" ON "lessons" USING btree ("slug");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "exercises_slug_idx" ON "exercises" USING btree ("slug");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "quiz_questions_slug_idx" ON "quiz_questions" USING btree ("slug");
