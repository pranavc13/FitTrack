CREATE TABLE "fit_journal" (
	"user_id" uuid NOT NULL,
	"date" date NOT NULL,
	"steps" integer,
	"heart_points" integer,
	"move_minutes" integer,
	"distance_km" real,
	"calories_burned" integer,
	"avg_heart_rate" smallint,
	"goal" "goal_type" NOT NULL,
	"recorded_at" timestamp with time zone NOT NULL,
	"is_full_day" boolean DEFAULT false NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fit_journal_user_id_date_pk" PRIMARY KEY("user_id","date")
);
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "password_hash" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "google_sub" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "avatar_url" text;--> statement-breakpoint
ALTER TABLE "fit_journal" ADD CONSTRAINT "fit_journal_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "users_google_sub_idx" ON "users" USING btree ("google_sub");