CREATE TYPE "public"."user_account_status" AS ENUM('active', 'suspended');--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "account_status" "user_account_status" DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "status_reason" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "status_changed_at" timestamp with time zone;