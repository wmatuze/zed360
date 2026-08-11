CREATE TYPE "public"."business_media_purpose" AS ENUM('logo', 'cover', 'gallery', 'work_sample', 'product');--> statement-breakpoint
CREATE TYPE "public"."catalog_availability" AS ENUM('available', 'out_of_stock', 'made_to_order', 'contact_business');--> statement-breakpoint
CREATE TYPE "public"."catalog_item_status" AS ENUM('active', 'archived');--> statement-breakpoint
CREATE TYPE "public"."media_moderation_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TABLE "business_media_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"product_id" uuid,
	"purpose" "business_media_purpose" NOT NULL,
	"storage_bucket" text NOT NULL,
	"storage_path" text NOT NULL,
	"mime_type" text NOT NULL,
	"file_size_bytes" integer NOT NULL,
	"width" integer,
	"height" integer,
	"title" text,
	"alt_text" text NOT NULL,
	"caption" text,
	"moderation_status" "media_moderation_status" DEFAULT 'pending' NOT NULL,
	"moderation_note" text,
	"reviewed_by_user_id" uuid,
	"reviewed_at" timestamp with time zone,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "business_media_product_purpose_check" CHECK (("business_media_assets"."purpose" = 'product') = ("business_media_assets"."product_id" is not null)),
	CONSTRAINT "business_media_file_size_check" CHECK ("business_media_assets"."file_size_bytes" > 0 and "business_media_assets"."file_size_bytes" <= 5242880),
	CONSTRAINT "business_media_dimensions_check" CHECK (("business_media_assets"."width" is null or "business_media_assets"."width" > 0) and ("business_media_assets"."height" is null or "business_media_assets"."height" > 0))
);
--> statement-breakpoint
CREATE TABLE "business_products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"price_from" numeric(14, 2),
	"price_to" numeric(14, 2),
	"availability" "catalog_availability" DEFAULT 'contact_business' NOT NULL,
	"status" "catalog_item_status" DEFAULT 'active' NOT NULL,
	"is_published" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"last_confirmed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "business_products_price_range_check" CHECK ("business_products"."price_from" is null or "business_products"."price_to" is null or "business_products"."price_from" <= "business_products"."price_to")
);
--> statement-breakpoint
ALTER TABLE "business_media_assets" ADD CONSTRAINT "business_media_assets_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_media_assets" ADD CONSTRAINT "business_media_assets_product_id_business_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."business_products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_media_assets" ADD CONSTRAINT "business_media_assets_reviewed_by_user_id_users_id_fk" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_products" ADD CONSTRAINT "business_products_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "business_media_storage_object_unique" ON "business_media_assets" USING btree ("storage_bucket","storage_path");--> statement-breakpoint
CREATE INDEX "business_media_business_moderation_idx" ON "business_media_assets" USING btree ("business_id","moderation_status");--> statement-breakpoint
CREATE INDEX "business_media_product_idx" ON "business_media_assets" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "business_products_business_status_idx" ON "business_products" USING btree ("business_id","status");