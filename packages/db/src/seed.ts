import { randomUUID } from "node:crypto";

import { eq } from "drizzle-orm";

import { createDatabase } from "./client.ts";
import { agents, pastes, users } from "./schema.ts";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set");
}

const { db, client } = createDatabase(databaseUrl);

const now = new Date();
const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

await db.delete(users).where(eq(users.workosUserId, "user_seed_demo"));
await db.delete(agents).where(eq(agents.workosRegistrationId, "agent_reg_seed_demo"));

const userId = randomUUID();
const agentId = randomUUID();

await db.insert(users).values({
  id: userId,
  workosUserId: "user_seed_demo",
  email: "seed@example.com",
  emailVerified: true,
  displayName: "Seed User",
});

await db.insert(agents).values({
  id: agentId,
  workosRegistrationId: "agent_reg_seed_demo",
  status: "claimed",
  claimedByUserId: userId,
  scopes: ["paste:create", "paste:read"],
});

const helloContent = "Hello from t1-paste.\n";
const agentContent = "console.log('hello from an agent');\n";
const anonymousContent = "This paste has no owner.\n";

await db.insert(pastes).values([
  {
    slug: "seed-hello",
    ownerUserId: userId,
    title: "Hello from the seed",
    content: helloContent,
    language: "text",
    visibility: "unlisted",
    expiresAt,
    sizeBytes: Buffer.byteLength(helloContent),
  },
  {
    slug: "seed-agent",
    ownerAgentId: agentId,
    title: "Agent paste",
    content: agentContent,
    language: "typescript",
    visibility: "unlisted",
    expiresAt,
    sizeBytes: Buffer.byteLength(agentContent),
  },
  {
    slug: "seed-anonymous",
    title: "Anonymous paste",
    content: anonymousContent,
    language: "text",
    visibility: "unlisted",
    expiresAt,
    sizeBytes: Buffer.byteLength(anonymousContent),
  },
]);

console.log("Seed complete.");
await client.end();
