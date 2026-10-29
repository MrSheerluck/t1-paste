CREATE TYPE "public"."agent_status" AS ENUM('anonymous', 'claimed', 'revoked');--> statement-breakpoint
CREATE TYPE "public"."audit_actor_type" AS ENUM('user', 'agent', 'system', 'admin');--> statement-breakpoint
CREATE TYPE "public"."cli_auth_status" AS ENUM('pending', 'approved', 'consumed', 'expired');--> statement-breakpoint
CREATE TYPE "public"."paste_visibility" AS ENUM('public', 'unlisted', 'private');--> statement-breakpoint
CREATE TYPE "public"."report_status" AS ENUM('open', 'resolved', 'dismissed');--> statement-breakpoint
CREATE TABLE "agents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workos_registration_id" text NOT NULL,
	"status" "agent_status" DEFAULT 'anonymous' NOT NULL,
	"claimed_by_user_id" uuid,
	"scopes" text[] DEFAULT '{}'::text[] NOT NULL,
	"last_seen_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_type" "audit_actor_type" NOT NULL,
	"actor_id" uuid,
	"action" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" uuid,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"ip_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cli_auth_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_code" text NOT NULL,
	"device_code_hash" text NOT NULL,
	"user_id" uuid,
	"status" "cli_auth_status" DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"approved_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "cli_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"token_hash" text NOT NULL,
	"token_prefix" text NOT NULL,
	"last_used_at" timestamp with time zone,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "paste_tags" (
	"paste_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	CONSTRAINT "paste_tags_paste_id_tag_id_pk" PRIMARY KEY("paste_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "pastes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"owner_user_id" uuid,
	"owner_agent_id" uuid,
	"title" text,
	"content" text NOT NULL,
	"language" text DEFAULT 'text' NOT NULL,
	"visibility" "paste_visibility" DEFAULT 'unlisted' NOT NULL,
	"password_hash" text,
	"expires_at" timestamp with time zone NOT NULL,
	"burn_after_read" boolean DEFAULT false NOT NULL,
	"size_bytes" integer NOT NULL,
	"view_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "pastes_at_most_one_owner" CHECK (num_nonnulls("pastes"."owner_user_id", "pastes"."owner_agent_id") <= 1),
	CONSTRAINT "pastes_content_size" CHECK (octet_length("pastes"."content") <= 262144)
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"paste_id" uuid,
	"reason" text NOT NULL,
	"details" text,
	"reporter_email" text,
	"status" "report_status" DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone,
	"resolved_by_user_id" uuid
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_user_id" uuid,
	"owner_agent_id" uuid,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tags_exactly_one_owner" CHECK (num_nonnulls("tags"."owner_user_id", "tags"."owner_agent_id") = 1)
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workos_user_id" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"display_name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "agents" ADD CONSTRAINT "agents_claimed_by_user_id_users_id_fk" FOREIGN KEY ("claimed_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cli_auth_requests" ADD CONSTRAINT "cli_auth_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cli_tokens" ADD CONSTRAINT "cli_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paste_tags" ADD CONSTRAINT "paste_tags_paste_id_pastes_id_fk" FOREIGN KEY ("paste_id") REFERENCES "public"."pastes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paste_tags" ADD CONSTRAINT "paste_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pastes" ADD CONSTRAINT "pastes_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pastes" ADD CONSTRAINT "pastes_owner_agent_id_agents_id_fk" FOREIGN KEY ("owner_agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_paste_id_pastes_id_fk" FOREIGN KEY ("paste_id") REFERENCES "public"."pastes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_resolved_by_user_id_users_id_fk" FOREIGN KEY ("resolved_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tags" ADD CONSTRAINT "tags_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tags" ADD CONSTRAINT "tags_owner_agent_id_agents_id_fk" FOREIGN KEY ("owner_agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "agents_workos_registration_id_unique" ON "agents" USING btree ("workos_registration_id");--> statement-breakpoint
CREATE INDEX "agents_claimed_by_user_idx" ON "agents" USING btree ("claimed_by_user_id");--> statement-breakpoint
CREATE INDEX "agents_status_idx" ON "agents" USING btree ("status");--> statement-breakpoint
CREATE INDEX "audit_events_created_at_idx" ON "audit_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "audit_events_actor_idx" ON "audit_events" USING btree ("actor_type","actor_id");--> statement-breakpoint
CREATE INDEX "audit_events_target_idx" ON "audit_events" USING btree ("target_type","target_id");--> statement-breakpoint
CREATE UNIQUE INDEX "cli_auth_requests_user_code_unique" ON "cli_auth_requests" USING btree ("user_code");--> statement-breakpoint
CREATE UNIQUE INDEX "cli_auth_requests_device_code_hash_unique" ON "cli_auth_requests" USING btree ("device_code_hash");--> statement-breakpoint
CREATE INDEX "cli_auth_requests_status_idx" ON "cli_auth_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "cli_auth_requests_expires_at_idx" ON "cli_auth_requests" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "cli_tokens_token_hash_unique" ON "cli_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "cli_tokens_user_idx" ON "cli_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "cli_tokens_expires_at_idx" ON "cli_tokens" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "pastes_slug_unique" ON "pastes" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "pastes_owner_user_idx" ON "pastes" USING btree ("owner_user_id");--> statement-breakpoint
CREATE INDEX "pastes_owner_agent_idx" ON "pastes" USING btree ("owner_agent_id");--> statement-breakpoint
CREATE INDEX "pastes_expires_at_idx" ON "pastes" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "pastes_visibility_idx" ON "pastes" USING btree ("visibility");--> statement-breakpoint
CREATE INDEX "pastes_created_at_idx" ON "pastes" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "pastes_deleted_at_idx" ON "pastes" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "reports_status_created_idx" ON "reports" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "reports_paste_idx" ON "reports" USING btree ("paste_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tags_owner_user_name_unique" ON "tags" USING btree ("owner_user_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "tags_owner_agent_name_unique" ON "tags" USING btree ("owner_agent_id","name");--> statement-breakpoint
CREATE INDEX "tags_owner_user_idx" ON "tags" USING btree ("owner_user_id");--> statement-breakpoint
CREATE INDEX "tags_owner_agent_idx" ON "tags" USING btree ("owner_agent_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_workos_user_id_unique" ON "users" USING btree ("workos_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_unique" ON "users" USING btree ("email");