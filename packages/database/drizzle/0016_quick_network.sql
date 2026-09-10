CREATE TABLE "admin_audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_user_id" uuid NOT NULL,
	"action" text NOT NULL,
	"subject_type" text NOT NULL,
	"subject_id" text NOT NULL,
	"reason" text,
	"before_state" jsonb,
	"after_state" jsonb,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "admin_audit_events" ADD CONSTRAINT "admin_audit_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "admin_audit_events_actor_created_idx" ON "admin_audit_events" USING btree ("actor_user_id","created_at");--> statement-breakpoint
CREATE INDEX "admin_audit_events_subject_created_idx" ON "admin_audit_events" USING btree ("subject_type","subject_id","created_at");--> statement-breakpoint
CREATE FUNCTION prevent_admin_audit_event_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
	RAISE EXCEPTION 'admin audit events are immutable';
END;
$$;--> statement-breakpoint
CREATE TRIGGER admin_audit_events_immutable
BEFORE UPDATE OR DELETE ON "admin_audit_events"
FOR EACH ROW EXECUTE FUNCTION prevent_admin_audit_event_mutation();
