CREATE TABLE "logo_task" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"status" text DEFAULT 'vectorized' NOT NULL,
	"original_file_key" text NOT NULL,
	"original_file_url" text,
	"vectorized_file_key" text,
	"vectorized_file_url" text,
	"vectorized_svg" text,
	"labels" jsonb DEFAULT '[]'::jsonb,
	"width" integer,
	"height" integer,
	"original_format" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "logo_task_log" (
	"id" text PRIMARY KEY NOT NULL,
	"task_id" text NOT NULL,
	"level" text NOT NULL,
	"message" text NOT NULL,
	"details" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "logo_task" ADD CONSTRAINT "logo_task_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "logo_task_log" ADD CONSTRAINT "logo_task_log_task_id_logo_task_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."logo_task"("id") ON DELETE cascade ON UPDATE no action;