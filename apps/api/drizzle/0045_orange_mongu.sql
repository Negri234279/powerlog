CREATE TYPE "public"."webhook_event_status" AS ENUM('received', 'processed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."invoice_status" AS ENUM('draft', 'open', 'paid', 'uncollectible', 'void');--> statement-breakpoint
CREATE TABLE "billing_webhook_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"gateway" "payment_gateway" NOT NULL,
	"event_id" text NOT NULL,
	"type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"status" "webhook_event_status" DEFAULT 'received' NOT NULL,
	"error" text,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"subscription_id" uuid,
	"gateway" "payment_gateway" NOT NULL,
	"gateway_invoice_id" text NOT NULL,
	"number" text,
	"status" "invoice_status" NOT NULL,
	"amount_due_cents" integer NOT NULL,
	"amount_paid_cents" integer NOT NULL,
	"currency" "currency" NOT NULL,
	"hosted_url" text,
	"pdf_url" text,
	"issued_at" timestamp with time zone NOT NULL,
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "billing_webhook_events_gateway_event" ON "billing_webhook_events" USING btree ("gateway","event_id");--> statement-breakpoint
CREATE INDEX "billing_webhook_events_status_received" ON "billing_webhook_events" USING btree ("status","received_at");--> statement-breakpoint
CREATE UNIQUE INDEX "invoices_gateway_invoice" ON "invoices" USING btree ("gateway","gateway_invoice_id");