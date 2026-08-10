CREATE TYPE "public"."business_review_decision" AS ENUM('approved', 'rejected', 'changes_requested');--> statement-breakpoint
CREATE TYPE "public"."business_review_status" AS ENUM('pending', 'approved', 'rejected', 'changes_requested');--> statement-breakpoint
CREATE TYPE "public"."platform_role" AS ENUM('admin', 'reviewer');--> statement-breakpoint
CREATE TABLE "business_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"decision" "business_review_decision" NOT NULL,
	"reason" text,
	"reviewed_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_roles" (
	"user_id" uuid NOT NULL,
	"role" "platform_role" NOT NULL,
	"granted_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "review_status" "business_review_status" DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "business_reviews" ADD CONSTRAINT "business_reviews_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_reviews" ADD CONSTRAINT "business_reviews_reviewed_by_user_id_users_id_fk" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_granted_by_user_id_users_id_fk" FOREIGN KEY ("granted_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "business_reviews_business_created_idx" ON "business_reviews" USING btree ("business_id","created_at");--> statement-breakpoint
CREATE INDEX "business_reviews_reviewer_idx" ON "business_reviews" USING btree ("reviewed_by_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_roles_unique" ON "user_roles" USING btree ("user_id","role");--> statement-breakpoint
CREATE INDEX "user_roles_role_idx" ON "user_roles" USING btree ("role");