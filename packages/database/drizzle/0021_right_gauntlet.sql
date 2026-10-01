CREATE TABLE "review_contact_verifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"contact_hash" text NOT NULL,
	"code_hash" text NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "review_contact_verifications" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN "reviewer_contact_hash" text;--> statement-breakpoint
ALTER TABLE "review_contact_verifications" ADD CONSTRAINT "review_contact_verifications_request_id_customer_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."customer_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "review_contact_verifications_request_idx" ON "review_contact_verifications" USING btree ("request_id","created_at");--> statement-breakpoint
CREATE INDEX "reviews_business_contact_idx" ON "reviews" USING btree ("business_id","reviewer_contact_hash");