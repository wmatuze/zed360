CREATE TYPE "public"."business_status" AS ENUM('draft', 'active', 'suspended', 'closed');--> statement-breakpoint
CREATE TYPE "public"."match_status" AS ENUM('queued', 'sent', 'viewed', 'responded', 'declined', 'expired');--> statement-breakpoint
CREATE TYPE "public"."membership_role" AS ENUM('owner', 'manager', 'staff');--> statement-breakpoint
CREATE TYPE "public"."request_status" AS ENUM('draft', 'open', 'matched', 'resolved', 'expired', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."response_status" AS ENUM('available', 'unavailable', 'needs_more_information');--> statement-breakpoint
CREATE TYPE "public"."verification_status" AS ENUM('pending', 'verified', 'rejected', 'expired');--> statement-breakpoint
CREATE TYPE "public"."verification_type" AS ENUM('contact', 'ownership', 'registration');--> statement-breakpoint
CREATE TABLE "business_locations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"district_id" uuid,
	"name" text NOT NULL,
	"address" text,
	"coordinates" geometry(point, 4326),
	"service_radius_km" integer,
	"opening_hours" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_members" (
	"business_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "membership_role" DEFAULT 'staff' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_responses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"match_id" uuid NOT NULL,
	"responded_by_user_id" uuid,
	"status" "response_status" NOT NULL,
	"message" text,
	"price_minimum" numeric(14, 2),
	"price_maximum" numeric(14, 2),
	"available_at" timestamp with time zone,
	"valid_until" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"price_from" numeric(14, 2),
	"price_to" numeric(14, 2),
	"attributes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_available" boolean DEFAULT true NOT NULL,
	"last_confirmed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_verifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"type" "verification_type" NOT NULL,
	"status" "verification_status" DEFAULT 'pending' NOT NULL,
	"evidence" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"reviewed_by_user_id" uuid,
	"reviewed_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "businesses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"status" "business_status" DEFAULT 'draft' NOT NULL,
	"phone" text,
	"whatsapp" text,
	"email" text,
	"website" text,
	"logo_url" text,
	"cover_url" text,
	"last_confirmed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"parent_id" uuid,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"request_schema" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_by_user_id" uuid,
	"category_id" uuid NOT NULL,
	"district_id" uuid,
	"status" "request_status" DEFAULT 'draft' NOT NULL,
	"summary" text NOT NULL,
	"details" text,
	"answers" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"coordinates" geometry(point, 4326),
	"needed_at" timestamp with time zone,
	"budget_minimum" numeric(14, 2),
	"budget_maximum" numeric(14, 2),
	"share_token" uuid DEFAULT gen_random_uuid() NOT NULL,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "districts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"province_id" uuid NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"centre" geometry(point, 4326)
);
--> statement-breakpoint
CREATE TABLE "interactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"business_id" uuid NOT NULL,
	"customer_user_id" uuid,
	"contacted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone,
	"outcome_confirmed" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "provinces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "request_matches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"business_id" uuid NOT NULL,
	"status" "match_status" DEFAULT 'queued' NOT NULL,
	"score" numeric(6, 3),
	"reasons" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"sent_at" timestamp with time zone,
	"viewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"interaction_id" uuid NOT NULL,
	"business_id" uuid NOT NULL,
	"author_user_id" uuid,
	"rating" integer NOT NULL,
	"body" text,
	"is_published" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"display_name" text,
	"email" text,
	"phone" text,
	"email_verified_at" timestamp with time zone,
	"phone_verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "business_locations" ADD CONSTRAINT "business_locations_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_locations" ADD CONSTRAINT "business_locations_district_id_districts_id_fk" FOREIGN KEY ("district_id") REFERENCES "public"."districts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_members" ADD CONSTRAINT "business_members_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_members" ADD CONSTRAINT "business_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_responses" ADD CONSTRAINT "business_responses_match_id_request_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."request_matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_responses" ADD CONSTRAINT "business_responses_responded_by_user_id_users_id_fk" FOREIGN KEY ("responded_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_services" ADD CONSTRAINT "business_services_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_services" ADD CONSTRAINT "business_services_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_verifications" ADD CONSTRAINT "business_verifications_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_verifications" ADD CONSTRAINT "business_verifications_reviewed_by_user_id_users_id_fk" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_requests" ADD CONSTRAINT "customer_requests_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_requests" ADD CONSTRAINT "customer_requests_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_requests" ADD CONSTRAINT "customer_requests_district_id_districts_id_fk" FOREIGN KEY ("district_id") REFERENCES "public"."districts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "districts" ADD CONSTRAINT "districts_province_id_provinces_id_fk" FOREIGN KEY ("province_id") REFERENCES "public"."provinces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interactions" ADD CONSTRAINT "interactions_request_id_customer_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."customer_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interactions" ADD CONSTRAINT "interactions_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interactions" ADD CONSTRAINT "interactions_customer_user_id_users_id_fk" FOREIGN KEY ("customer_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "request_matches" ADD CONSTRAINT "request_matches_request_id_customer_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."customer_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "request_matches" ADD CONSTRAINT "request_matches_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_interaction_id_interactions_id_fk" FOREIGN KEY ("interaction_id") REFERENCES "public"."interactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_author_user_id_users_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "business_locations_business_idx" ON "business_locations" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "business_locations_district_idx" ON "business_locations" USING btree ("district_id");--> statement-breakpoint
CREATE UNIQUE INDEX "business_members_unique" ON "business_members" USING btree ("business_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "business_responses_match_unique" ON "business_responses" USING btree ("match_id");--> statement-breakpoint
CREATE INDEX "business_services_business_idx" ON "business_services" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "business_services_category_idx" ON "business_services" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "business_verifications_business_idx" ON "business_verifications" USING btree ("business_id");--> statement-breakpoint
CREATE UNIQUE INDEX "businesses_slug_unique" ON "businesses" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "businesses_status_idx" ON "businesses" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "categories_slug_unique" ON "categories" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "categories_parent_idx" ON "categories" USING btree ("parent_id");--> statement-breakpoint
CREATE UNIQUE INDEX "customer_requests_share_token_unique" ON "customer_requests" USING btree ("share_token");--> statement-breakpoint
CREATE INDEX "customer_requests_status_idx" ON "customer_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "customer_requests_category_idx" ON "customer_requests" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "customer_requests_district_idx" ON "customer_requests" USING btree ("district_id");--> statement-breakpoint
CREATE UNIQUE INDEX "districts_province_slug_unique" ON "districts" USING btree ("province_id","slug");--> statement-breakpoint
CREATE INDEX "districts_province_idx" ON "districts" USING btree ("province_id");--> statement-breakpoint
CREATE INDEX "interactions_business_idx" ON "interactions" USING btree ("business_id");--> statement-breakpoint
CREATE UNIQUE INDEX "provinces_slug_unique" ON "provinces" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "request_matches_unique" ON "request_matches" USING btree ("request_id","business_id");--> statement-breakpoint
CREATE INDEX "request_matches_business_status_idx" ON "request_matches" USING btree ("business_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "reviews_interaction_unique" ON "reviews" USING btree ("interaction_id");--> statement-breakpoint
CREATE INDEX "reviews_business_published_idx" ON "reviews" USING btree ("business_id","is_published");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_unique" ON "users" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "users_phone_unique" ON "users" USING btree ("phone");
