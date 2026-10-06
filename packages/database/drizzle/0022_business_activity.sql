CREATE TYPE "public"."business_activity_event" AS ENUM('profile_view', 'contact_whatsapp', 'contact_call', 'contact_email', 'contact_website', 'directions', 'share');--> statement-breakpoint
CREATE TABLE "business_activity_daily" (
	"business_id" uuid NOT NULL,
	"day" date NOT NULL,
	"event" "business_activity_event" NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "business_activity_daily_business_id_day_event_pk" PRIMARY KEY("business_id","day","event"),
	CONSTRAINT "business_activity_daily_count_check" CHECK ("business_activity_daily"."count" >= 0)
);
--> statement-breakpoint
ALTER TABLE "business_activity_daily" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "business_activity_daily" ADD CONSTRAINT "business_activity_daily_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "business_activity_daily_day_idx" ON "business_activity_daily" USING btree ("day");