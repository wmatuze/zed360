CREATE TYPE "public"."service_coverage_scope" AS ENUM('business_location', 'selected_districts', 'selected_provinces', 'nationwide', 'remote');--> statement-breakpoint
CREATE TYPE "public"."service_fulfillment_mode" AS ENUM('at_business', 'customer_pickup', 'business_travel', 'delivery', 'remote');--> statement-breakpoint
CREATE TABLE "business_service_coverage_areas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"fulfillment_option_id" uuid NOT NULL,
	"province_id" uuid,
	"district_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "business_service_coverage_one_area_check" CHECK (num_nonnulls("business_service_coverage_areas"."province_id", "business_service_coverage_areas"."district_id") = 1)
);
--> statement-breakpoint
CREATE TABLE "business_service_fulfillment_options" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_service_id" uuid NOT NULL,
	"mode" "service_fulfillment_mode" NOT NULL,
	"coverage_scope" "service_coverage_scope" NOT NULL,
	"fee_minimum" numeric(14, 2),
	"fee_maximum" numeric(14, 2),
	"lead_time_minimum_days" integer,
	"lead_time_maximum_days" integer,
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_confirmed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "business_service_fulfillment_fee_range_check" CHECK ("business_service_fulfillment_options"."fee_minimum" is null or "business_service_fulfillment_options"."fee_maximum" is null or "business_service_fulfillment_options"."fee_minimum" <= "business_service_fulfillment_options"."fee_maximum"),
	CONSTRAINT "business_service_fulfillment_lead_range_check" CHECK ("business_service_fulfillment_options"."lead_time_minimum_days" is null or "business_service_fulfillment_options"."lead_time_maximum_days" is null or "business_service_fulfillment_options"."lead_time_minimum_days" <= "business_service_fulfillment_options"."lead_time_maximum_days")
);
--> statement-breakpoint
ALTER TABLE "business_service_coverage_areas" ADD CONSTRAINT "business_service_coverage_areas_fulfillment_option_id_business_service_fulfillment_options_id_fk" FOREIGN KEY ("fulfillment_option_id") REFERENCES "public"."business_service_fulfillment_options"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_service_coverage_areas" ADD CONSTRAINT "business_service_coverage_areas_province_id_provinces_id_fk" FOREIGN KEY ("province_id") REFERENCES "public"."provinces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_service_coverage_areas" ADD CONSTRAINT "business_service_coverage_areas_district_id_districts_id_fk" FOREIGN KEY ("district_id") REFERENCES "public"."districts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_service_fulfillment_options" ADD CONSTRAINT "business_service_fulfillment_options_business_service_id_business_services_id_fk" FOREIGN KEY ("business_service_id") REFERENCES "public"."business_services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "business_service_coverage_district_unique" ON "business_service_coverage_areas" USING btree ("fulfillment_option_id","district_id") WHERE "business_service_coverage_areas"."district_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "business_service_coverage_province_unique" ON "business_service_coverage_areas" USING btree ("fulfillment_option_id","province_id") WHERE "business_service_coverage_areas"."province_id" is not null;--> statement-breakpoint
CREATE INDEX "business_service_coverage_option_idx" ON "business_service_coverage_areas" USING btree ("fulfillment_option_id");--> statement-breakpoint
CREATE INDEX "business_service_coverage_district_idx" ON "business_service_coverage_areas" USING btree ("district_id");--> statement-breakpoint
CREATE INDEX "business_service_coverage_province_idx" ON "business_service_coverage_areas" USING btree ("province_id");--> statement-breakpoint
CREATE UNIQUE INDEX "business_service_fulfillment_mode_unique" ON "business_service_fulfillment_options" USING btree ("business_service_id","mode");--> statement-breakpoint
CREATE INDEX "business_service_fulfillment_service_idx" ON "business_service_fulfillment_options" USING btree ("business_service_id");