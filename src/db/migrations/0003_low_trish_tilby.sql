ALTER TABLE "logo_task" ADD COLUMN "composition_id" text;--> statement-breakpoint
ALTER TABLE "logo_task" ADD COLUMN "composition_duration_in_frames" integer;--> statement-breakpoint
ALTER TABLE "logo_task" ADD COLUMN "composition_fps" integer;--> statement-breakpoint
ALTER TABLE "logo_task" ADD COLUMN "composition_width" integer;--> statement-breakpoint
ALTER TABLE "logo_task" ADD COLUMN "composition_height" integer;--> statement-breakpoint
ALTER TABLE "logo_task" ADD COLUMN "composition_props" jsonb DEFAULT '{}'::jsonb;--> statement-breakpoint
ALTER TABLE "logo_task" ADD COLUMN "animation_file_path" text;