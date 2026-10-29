import { describe, expect, it } from "vite-plus/test";
import { eq } from "drizzle-orm";
import { createDatabase, agents, pastes } from "@t1/db";

import { createApp } from "../src/app.ts";
import { parseEnv } from "../src/env.ts";

const databaseUrl = process.env.DATABASE_URL ?? "postgres://t1:t1@localhost:5432/t1";

const env = parseEnv({
  NODE_ENV: "test",
  DATABASE_URL: databaseUrl,
  AGENT_AUTH_SECRET: "test-agent-auth-secret-16",
  APP_URL: "http://localhost:3000",
});
const { db } = createDatabase(databaseUrl);
const app = createApp({
  env,
  version: "0.0.0",
  db,
});

describe("agent auth.md flow", () => {
  it("serves auth.md and discovery metadata", async () => {
    const authMd = await app.request("/auth.md");
    expect(authMd.status).toBe(200);
    expect(await authMd.text()).toContain("anonymous agent registration");

    const prm = await app.request("/.well-known/oauth-protected-resource");
    expect(prm.status).toBe(200);
    const prmBody = (await prm.json()) as {
      authorization_servers: string[];
    };
    expect(prmBody.authorization_servers).toEqual(["http://localhost:3000"]);

    const as = await app.request("/.well-known/oauth-authorization-server");
    expect(as.status).toBe(200);
    const asBody = (await as.json()) as {
      agent_auth: { identity_types_supported: string[] };
    };
    expect(asBody.agent_auth.identity_types_supported).toEqual(["anonymous"]);
  });

  it("registers, exchanges, uses, and revokes an agent token", async () => {
    const registrationResponse = await app.request("/agent/identity", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ type: "anonymous" }),
    });

    expect(registrationResponse.status).toBe(200);

    const registration = (await registrationResponse.json()) as {
      registration_id: string;
      identity_assertion: string;
    };

    expect(registration.registration_id).toMatch(/^agent_reg_/);

    const tokenResponse = await app.request("/oauth2/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: registration.identity_assertion,
        resource: "http://localhost:3000",
      }).toString(),
    });

    expect(tokenResponse.status).toBe(200);

    const token = (await tokenResponse.json()) as {
      access_token: string;
      token_type: string;
      scope: string;
    };

    expect(token.token_type).toBe("Bearer");
    expect(token.scope).toContain("paste:private");

    const profileResponse = await app.request("/api/agents/me", {
      headers: { authorization: `Bearer ${token.access_token}` },
    });
    expect(profileResponse.status).toBe(200);

    const createResponse = await app.request("/api/pastes", {
      method: "POST",
      headers: {
        authorization: `Bearer ${token.access_token}`,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        content: "private agent paste",
        visibility: "private",
        expiresIn: "30d",
      }),
    });

    expect(createResponse.status).toBe(201);

    const created = (await createResponse.json()) as { slug: string };

    try {
      const readResponse = await app.request(`/api/pastes/${created.slug}/raw`, {
        headers: { authorization: `Bearer ${token.access_token}` },
      });
      expect(readResponse.status).toBe(200);
      expect(await readResponse.text()).toBe("private agent paste");

      const anonymousRead = await app.request(`/api/pastes/${created.slug}/raw`);
      expect(anonymousRead.status).toBe(404);

      const revokeResponse = await app.request("/oauth2/revoke", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          token: token.access_token,
          token_type_hint: "access_token",
        }).toString(),
      });
      expect(revokeResponse.status).toBe(200);

      const revokedProfile = await app.request("/api/agents/me", {
        headers: { authorization: `Bearer ${token.access_token}` },
      });
      expect(revokedProfile.status).toBe(401);
      expect(revokedProfile.headers.get("www-authenticate")).toContain("resource_metadata");
    } finally {
      await db.delete(pastes).where(eq(pastes.slug, created.slug));
      await db.delete(agents).where(eq(agents.registrationId, registration.registration_id));
    }
  });

  it("rejects malformed assertions", async () => {
    const response = await app.request("/oauth2/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: "not-a-jwt",
      }).toString(),
    });

    expect(response.status).toBe(400);
  });
});
