CREATE UNIQUE INDEX "business_members_one_owner_unique" ON "business_members" USING btree ("business_id") WHERE "business_members"."role" = 'owner';
