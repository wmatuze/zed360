CREATE TYPE "public"."business_notification_type" AS ENUM('request_matched', 'customer_selected', 'business_review_decision');--> statement-breakpoint
CREATE TABLE "business_notification_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"type" "business_notification_type" NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"action_url" text,
	"event_key" text NOT NULL,
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"recipient_user_id" uuid NOT NULL,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "business_notification_events" ADD CONSTRAINT "business_notification_events_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_notifications" ADD CONSTRAINT "business_notifications_event_id_business_notification_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."business_notification_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_notifications" ADD CONSTRAINT "business_notifications_recipient_user_id_users_id_fk" FOREIGN KEY ("recipient_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "business_notification_events_key_unique" ON "business_notification_events" USING btree ("event_key");--> statement-breakpoint
CREATE INDEX "business_notification_events_business_created_idx" ON "business_notification_events" USING btree ("business_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "business_notifications_event_recipient_unique" ON "business_notifications" USING btree ("event_id","recipient_user_id");--> statement-breakpoint
CREATE INDEX "business_notifications_recipient_read_idx" ON "business_notifications" USING btree ("recipient_user_id","read_at","created_at");