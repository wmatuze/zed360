CREATE TYPE "public"."content_report_reason" AS ENUM('misleading', 'scam_or_fraud', 'impersonation', 'prohibited_content', 'harassment', 'privacy', 'spam', 'other');--> statement-breakpoint
CREATE TYPE "public"."content_report_status" AS ENUM('open', 'dismissed', 'actioned');--> statement-breakpoint
CREATE TYPE "public"."content_report_target_type" AS ENUM('business', 'review');--> statement-breakpoint
CREATE TABLE "content_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"target_type" "content_report_target_type" NOT NULL,
	"target_id" uuid NOT NULL,
	"reason" "content_report_reason" NOT NULL,
	"details" text NOT NULL,
	"reporter_email" text,
	"status" "content_report_status" DEFAULT 'open' NOT NULL,
	"decision_note" text,
	"reviewed_by_user_id" uuid,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "content_reports" ADD CONSTRAINT "content_reports_reviewed_by_user_id_users_id_fk" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "content_reports_status_created_idx" ON "content_reports" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "content_reports_target_idx" ON "content_reports" USING btree ("target_type","target_id");