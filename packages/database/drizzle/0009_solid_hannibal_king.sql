CREATE TYPE "public"."business_profile_revision_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TABLE "business_profile_revisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"submitted_by_user_id" uuid NOT NULL,
	"status" "business_profile_revision_status" DEFAULT 'pending' NOT NULL,
	"proposed" jsonb NOT NULL,
	"review_note" text,
	"reviewed_by_user_id" uuid,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "business_profile_revisions" ADD CONSTRAINT "business_profile_revisions_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_profile_revisions" ADD CONSTRAINT "business_profile_revisions_submitted_by_user_id_users_id_fk" FOREIGN KEY ("submitted_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_profile_revisions" ADD CONSTRAINT "business_profile_revisions_reviewed_by_user_id_users_id_fk" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "business_profile_revisions_one_pending_unique" ON "business_profile_revisions" USING btree ("business_id") WHERE "business_profile_revisions"."status" = 'pending';--> statement-breakpoint
CREATE INDEX "business_profile_revisions_status_created_idx" ON "business_profile_revisions" USING btree ("status","created_at");