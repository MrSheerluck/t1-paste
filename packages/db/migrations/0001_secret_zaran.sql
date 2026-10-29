CREATE TABLE "agent_access_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"scopes" text[] DEFAULT '{}'::text[] NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agent_access_tokens" ADD CONSTRAINT "agent_access_tokens_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "agent_access_tokens_token_hash_unique" ON "agent_access_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "agent_access_tokens_agent_idx" ON "agent_access_tokens" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "agent_access_tokens_expires_at_idx" ON "agent_access_tokens" USING btree ("expires_at");