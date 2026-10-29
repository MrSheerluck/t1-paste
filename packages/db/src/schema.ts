import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const agentStatus = pgEnum("agent_status", ["anonymous", "claimed", "revoked"]);

export const pasteVisibility = pgEnum("paste_visibility", ["public", "unlisted", "private"]);

export const reportStatus = pgEnum("report_status", ["open", "resolved", "dismissed"]);

export const cliAuthStatus = pgEnum("cli_auth_status", [
  "pending",
  "approved",
  "consumed",
  "expired",
]);

export const auditActorType = pgEnum("audit_actor_type", ["user", "agent", "system", "admin"]);

function timestamps() {
  return {
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  };
}

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workosUserId: text("workos_user_id").notNull(),
    email: text("email").notNull(),
    emailVerified: boolean("email_verified").notNull().default(false),
    displayName: text("display_name"),
    ...timestamps(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("users_workos_user_id_unique").on(table.workosUserId),
    uniqueIndex("users_email_unique").on(table.email),
  ],
);

export const agents = pgTable(
  "agents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // The physical column name is legacy from the WorkOS prototype. The
    // application treats it as the agent registration id.
    registrationId: text("workos_registration_id").notNull(),
    status: agentStatus("status").notNull().default("anonymous"),
    claimedByUserId: uuid("claimed_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    scopes: text("scopes")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
    ...timestamps(),
  },
  (table) => [
    uniqueIndex("agents_workos_registration_id_unique").on(table.registrationId),
    index("agents_claimed_by_user_idx").on(table.claimedByUserId),
    index("agents_status_idx").on(table.status),
  ],
);

export const agentAccessTokens = pgTable(
  "agent_access_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    agentId: uuid("agent_id")
      .notNull()
      .references(() => agents.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    scopes: text("scopes")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("agent_access_tokens_token_hash_unique").on(table.tokenHash),
    index("agent_access_tokens_agent_idx").on(table.agentId),
    index("agent_access_tokens_expires_at_idx").on(table.expiresAt),
  ],
);

export const pastes = pgTable(
  "pastes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    ownerUserId: uuid("owner_user_id").references(() => users.id, {
      onDelete: "cascade",
    }),
    ownerAgentId: uuid("owner_agent_id").references(() => agents.id, {
      onDelete: "cascade",
    }),
    title: text("title"),
    content: text("content").notNull(),
    language: text("language").notNull().default("text"),
    visibility: pasteVisibility("visibility").notNull().default("unlisted"),
    passwordHash: text("password_hash"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    burnAfterRead: boolean("burn_after_read").notNull().default(false),
    sizeBytes: integer("size_bytes").notNull(),
    viewCount: integer("view_count").notNull().default(0),
    ...timestamps(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("pastes_slug_unique").on(table.slug),
    index("pastes_owner_user_idx").on(table.ownerUserId),
    index("pastes_owner_agent_idx").on(table.ownerAgentId),
    index("pastes_expires_at_idx").on(table.expiresAt),
    index("pastes_visibility_idx").on(table.visibility),
    index("pastes_created_at_idx").on(table.createdAt),
    index("pastes_deleted_at_idx").on(table.deletedAt),
    check(
      "pastes_at_most_one_owner",
      sql`num_nonnulls(${table.ownerUserId}, ${table.ownerAgentId}) <= 1`,
    ),
    check("pastes_content_size", sql`octet_length(${table.content}) <= 262144`),
  ],
);

export const tags = pgTable(
  "tags",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerUserId: uuid("owner_user_id").references(() => users.id, {
      onDelete: "cascade",
    }),
    ownerAgentId: uuid("owner_agent_id").references(() => agents.id, {
      onDelete: "cascade",
    }),
    name: text("name").notNull(),
    ...timestamps(),
  },
  (table) => [
    uniqueIndex("tags_owner_user_name_unique").on(table.ownerUserId, table.name),
    uniqueIndex("tags_owner_agent_name_unique").on(table.ownerAgentId, table.name),
    index("tags_owner_user_idx").on(table.ownerUserId),
    index("tags_owner_agent_idx").on(table.ownerAgentId),
    check(
      "tags_exactly_one_owner",
      sql`num_nonnulls(${table.ownerUserId}, ${table.ownerAgentId}) = 1`,
    ),
  ],
);

export const pasteTags = pgTable(
  "paste_tags",
  {
    pasteId: uuid("paste_id")
      .notNull()
      .references(() => pastes.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.pasteId, table.tagId] })],
);

export const cliTokens = pgTable(
  "cli_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    tokenHash: text("token_hash").notNull(),
    tokenPrefix: text("token_prefix").notNull(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("cli_tokens_token_hash_unique").on(table.tokenHash),
    index("cli_tokens_user_idx").on(table.userId),
    index("cli_tokens_expires_at_idx").on(table.expiresAt),
  ],
);

export const cliAuthRequests = pgTable(
  "cli_auth_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userCode: text("user_code").notNull(),
    deviceCodeHash: text("device_code_hash").notNull(),
    userId: uuid("user_id").references(() => users.id, {
      onDelete: "cascade",
    }),
    status: cliAuthStatus("status").notNull().default("pending"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("cli_auth_requests_user_code_unique").on(table.userCode),
    uniqueIndex("cli_auth_requests_device_code_hash_unique").on(table.deviceCodeHash),
    index("cli_auth_requests_status_idx").on(table.status),
    index("cli_auth_requests_expires_at_idx").on(table.expiresAt),
  ],
);

export const reports = pgTable(
  "reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    pasteId: uuid("paste_id").references(() => pastes.id, {
      onDelete: "set null",
    }),
    reason: text("reason").notNull(),
    details: text("details"),
    reporterEmail: text("reporter_email"),
    status: reportStatus("status").notNull().default("open"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    resolvedByUserId: uuid("resolved_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
  },
  (table) => [
    index("reports_status_created_idx").on(table.status, table.createdAt),
    index("reports_paste_idx").on(table.pasteId),
  ],
);

export const auditEvents = pgTable(
  "audit_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorType: auditActorType("actor_type").notNull(),
    actorId: uuid("actor_id"),
    action: text("action").notNull(),
    targetType: text("target_type").notNull(),
    targetId: uuid("target_id"),
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    ipHash: text("ip_hash"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("audit_events_created_at_idx").on(table.createdAt),
    index("audit_events_actor_idx").on(table.actorType, table.actorId),
    index("audit_events_target_idx").on(table.targetType, table.targetId),
  ],
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Agent = typeof agents.$inferSelect;
export type NewAgent = typeof agents.$inferInsert;

export type Paste = typeof pastes.$inferSelect;
export type NewPaste = typeof pastes.$inferInsert;
