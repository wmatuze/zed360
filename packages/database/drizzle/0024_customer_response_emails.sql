CREATE TABLE "email_outbox" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dedupe_key" text NOT NULL,
	"to_email" text NOT NULL,
	"subject" text NOT NULL,
	"text_body" text NOT NULL,
	"html_body" text NOT NULL,
	"status" "notification_delivery_status" DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"provider_message_id" text,
	"last_error" text,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "email_outbox" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "customer_requests" ADD COLUMN "notify_email" text;--> statement-breakpoint
CREATE UNIQUE INDEX "email_outbox_dedupe_unique" ON "email_outbox" USING btree ("dedupe_key");--> statement-breakpoint
CREATE INDEX "email_outbox_due_idx" ON "email_outbox" USING btree ("status","next_attempt_at");