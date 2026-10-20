CREATE TABLE "sessions" (
	"id" text PRIMARY KEY,
	"user_id" integer NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" serial PRIMARY KEY,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"team_id" integer NOT NULL,
	"status" text DEFAULT 'To Do' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tasks_status_check" CHECK ("status" IN ('To Do', 'In Progress', 'Done'))
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" serial PRIMARY KEY,
	"name" text NOT NULL,
	"created_by" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY,
	"email" text NOT NULL UNIQUE,
	"password" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "tasks_team_id_created_at_idx" ON "tasks" ("team_id","created_at" DESC NULLS LAST);--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_team_id_teams_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_created_by_users_id_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE CASCADE;