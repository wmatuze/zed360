CREATE TYPE "public"."business_availability_status" AS ENUM('available', 'busy', 'temporarily_unavailable');--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "availability_status" "business_availability_status" DEFAULT 'available' NOT NULL;--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "availability_note" text;--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "availability_updated_at" timestamp with time zone;