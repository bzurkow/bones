CREATE TABLE "terms_and_conditions" (
	"id" text PRIMARY KEY NOT NULL,
	"asset_url" text NOT NULL,
	"active" boolean DEFAULT false NOT NULL,
	"added_by" text NOT NULL,
	"terms_and_conditions_attribution" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_terms_and_conditions" (
	"terms_and_conditions_id" text NOT NULL,
	"user_id" text NOT NULL,
	"accepted" boolean DEFAULT false NOT NULL,
	"accepted_date" timestamp,
	CONSTRAINT "user_terms_and_conditions_terms_and_conditions_id_user_id_pk" PRIMARY KEY("terms_and_conditions_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "terms_and_conditions" ADD CONSTRAINT "terms_and_conditions_added_by_users_id_fk" FOREIGN KEY ("added_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_terms_and_conditions" ADD CONSTRAINT "user_terms_and_conditions_terms_and_conditions_id_terms_and_conditions_id_fk" FOREIGN KEY ("terms_and_conditions_id") REFERENCES "public"."terms_and_conditions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_terms_and_conditions" ADD CONSTRAINT "user_terms_and_conditions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;