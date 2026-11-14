ALTER TABLE "partner" ADD COLUMN "user_id" text;--> statement-breakpoint
ALTER TABLE "partner" ADD CONSTRAINT "partner_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_partner_user" ON "partner" USING btree ("user_id");