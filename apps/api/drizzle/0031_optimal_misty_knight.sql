ALTER TABLE "ai_plan_draft_sets" DROP CONSTRAINT "ai_plan_draft_sets_draft_id_set_id_pk";--> statement-breakpoint
ALTER TABLE "ai_plan_draft_sets" ALTER COLUMN "set_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "ai_plan_draft_sets" ADD COLUMN "entry_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "ai_plan_draft_sets" ADD COLUMN "order" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "ai_plan_draft_sets" ADD CONSTRAINT "ai_plan_draft_sets_draft_id_entry_id_order_pk" PRIMARY KEY("draft_id","entry_id","order");
