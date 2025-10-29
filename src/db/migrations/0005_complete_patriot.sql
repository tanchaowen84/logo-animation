ALTER TABLE "logo_task" RENAME COLUMN "animation_file_path" TO "animation_module_url";--> statement-breakpoint
ALTER TABLE "logo_task" ADD COLUMN "animation_module_key" text;