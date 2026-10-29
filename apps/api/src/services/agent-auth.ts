import { eq } from "drizzle-orm";
import { SignJWT, jwtVerify } from "jose";

import { agentAccessTokens, agents, type Database } from "@t1/db";
import { PasteDomainError, type Principal } from "@t1/shared";

import type { AppEnv } from "../env.ts";

const ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

export const AGENT_SCOPES = [
  "paste:create",
  "paste:read",
  "paste:update",
  "paste:delete",
  "paste:private",
  "paste:long-lived",
] as const;

export type AgentIdentity = {
  registrationId: string;
  agentId: string;
  identityAssertion: string;
  assertionExpires: Date;
  scopes: string[];
};

export type AuthenticatedAgent = {
  agentId: string;
  registrationId: string;
  scopes: string[];
};

export async function createAnonymousAgent(db: Database, env: AppEnv): Promise<AgentIdentity> {
  const registrationId = `agent_reg_${randomString(20)}`;

  const [agent] = await db
    .insert(agents)
    .values({
      registrationId,
      status: "anonymous",
      scopes: [...AGENT_SCOPES],
    })
    .returning();

  if (!agent) {
    throw new Error("Could not create agent registration.");
  }

  const now = Math.floor(Date.now() / 1000);
  const assertionExpires = now + env.AGENT_ASSERTION_TTL_SECONDS;
  const identityAssertion = await new SignJWT({
    type: "agent_identity",
    scope: AGENT_SCOPES.join(" "),
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuer(env.APP_URL)
    .setAudience(env.APP_URL)
    .setSubject(registrationId)
    .setJti(randomString(24))
    .setIssuedAt(now)
    .setExpirationTime(assertionExpires)
    .sign(secretKey(env));

  return {
    registrationId,
    agentId: agent.id,
    identityAssertion,
    assertionExpires: new Date(assertionExpires * 1000),
    scopes: [...AGENT_SCOPES],
  };
}

export async function exchangeAssertion(
  db: Database,
  env: AppEnv,
  assertion: string,
  resource?: string,
): Promise<{ accessToken: string; expiresIn: number; scopes: string[] }> {
  if (resource && resource !== env.APP_URL) {
    throw new PasteDomainError(
      "invalid_target",
      400,
      "The requested resource is not this service.",
    );
  }

  let payload;

  try {
    ({ payload } = await jwtVerify(assertion, secretKey(env), {
      issuer: env.APP_URL,
      audience: env.APP_URL,
    }));
  } catch {
    throw new PasteDomainError(
      "invalid_grant",
      400,
      "The identity assertion is invalid or expired.",
    );
  }

  if (payload.type !== "agent_identity" || typeof payload.sub !== "string") {
    throw new PasteDomainError("invalid_grant", 400, "The identity assertion has the wrong type.");
  }

  const [agent] = await db
    .select()
    .from(agents)
    .where(eq(agents.registrationId, payload.sub))
    .limit(1);

  if (!agent || agent.status === "revoked") {
    throw new PasteDomainError("invalid_grant", 400, "The agent registration is not active.");
  }

  const scopes = Array.isArray(agent.scopes) ? agent.scopes : [...AGENT_SCOPES];
  const accessToken = `t1_at_${randomString(40)}`;
  const tokenHash = await hashToken(accessToken);
  const expiresAt = new Date(Date.now() + env.AGENT_ACCESS_TOKEN_TTL_SECONDS * 1000);

  await db.insert(agentAccessTokens).values({
    agentId: agent.id,
    tokenHash,
    scopes,
    expiresAt,
  });

  return {
    accessToken,
    expiresIn: env.AGENT_ACCESS_TOKEN_TTL_SECONDS,
    scopes,
  };
}

export async function authenticateAgent(
  db: Database,
  authorization: string | undefined,
): Promise<AuthenticatedAgent | null> {
  if (!authorization) {
    return null;
  }

  const [scheme, token] = authorization.split(" ");

  if (scheme?.toLowerCase() !== "bearer" || !token) {
    throw new PasteDomainError("invalid_token", 401, "Expected a Bearer access token.");
  }

  const tokenHash = await hashToken(token);
  const [accessToken] = await db
    .select()
    .from(agentAccessTokens)
    .where(eq(agentAccessTokens.tokenHash, tokenHash))
    .limit(1);

  if (!accessToken || accessToken.revokedAt || accessToken.expiresAt.getTime() <= Date.now()) {
    throw new PasteDomainError(
      "invalid_token",
      401,
      "The access token is invalid, expired, or revoked.",
    );
  }

  const [agent] = await db.select().from(agents).where(eq(agents.id, accessToken.agentId)).limit(1);

  if (!agent || agent.status === "revoked") {
    throw new PasteDomainError("invalid_token", 401, "The agent registration is not active.");
  }

  await db.update(agents).set({ lastSeenAt: new Date() }).where(eq(agents.id, agent.id));

  return {
    agentId: agent.id,
    registrationId: agent.registrationId,
    scopes: accessToken.scopes,
  };
}

export async function resolvePrincipal(
  db: Database,
  authorization: string | undefined,
): Promise<Principal> {
  const agent = await authenticateAgent(db, authorization);

  if (!agent) {
    return { kind: "anonymous" };
  }

  return {
    kind: "agent",
    agentId: agent.agentId,
    claimed: true,
  };
}

export async function revokeAccessToken(db: Database, token: string): Promise<void> {
  const tokenHash = await hashToken(token);

  await db
    .update(agentAccessTokens)
    .set({ revokedAt: new Date() })
    .where(eq(agentAccessTokens.tokenHash, tokenHash));
}

export async function getAgentProfile(
  db: Database,
  agentId: string,
): Promise<{
  id: string;
  registrationId: string;
  status: string;
  scopes: string[];
  createdAt: Date;
  lastSeenAt: Date | null;
}> {
  const [agent] = await db.select().from(agents).where(eq(agents.id, agentId)).limit(1);

  if (!agent) {
    throw new PasteDomainError("agent_not_found", 404, "Agent registration not found.");
  }

  return {
    id: agent.id,
    registrationId: agent.registrationId,
    status: agent.status,
    scopes: agent.scopes,
    createdAt: agent.createdAt,
    lastSeenAt: agent.lastSeenAt,
  };
}

function secretKey(env: AppEnv): Uint8Array {
  return new TextEncoder().encode(env.AGENT_AUTH_SECRET);
}

function randomString(length: number): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);

  let value = "";

  for (const byte of bytes) {
    value += ALPHABET[byte % ALPHABET.length];
  }

  return value;
}

async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));

  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
