CREATE TYPE "public"."review_moderation_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN "moderation_status" "review_moderation_status" DEFAULT 'pending' NOT NULL;--> statement-breakpoint
UPDATE "reviews" SET "moderation_status" = 'approved' WHERE "is_published" = true;--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN "moderation_note" text;--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN "reviewed_by_user_id" uuid;--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN "reviewed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_reviewed_by_user_id_users_id_fk" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "reviews_moderation_created_idx" ON "reviews" USING btree ("moderation_status","created_at");--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_rating_check" CHECK ("reviews"."rating" between 1 and 5);
