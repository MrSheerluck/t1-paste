import { describe, expect, it } from "vite-plus/test";
import { eq } from "drizzle-orm";
import { createDatabase, pastes } from "@t1/db";

import { createApp } from "../src/app.ts";
import { parseEnv } from "../src/env.ts";

const databaseUrl = process.env.DATABASE_URL ?? "postgres://t1:t1@localhost:5432/t1";

const env = parseEnv({
  NODE_ENV: "test",
  DATABASE_URL: databaseUrl,
});
const { db } = createDatabase(databaseUrl);
const app = createApp({
  env,
  version: "0.0.0",
  db,
});

async function createTextPaste(body: string, query = ""): Promise<{ slug: string; url: string }> {
  const response = await app.request(`/api/pastes${query}`, {
    method: "POST",
    headers: {
      "content-type": "text/plain",
      accept: "text/plain",
    },
    body,
  });

  expect(response.status).toBe(201);

  const url = await response.text();
  const slug = new URL(url).pathname.replace(/^\//, "");

  return { slug, url };
}

async function removePaste(slug: string): Promise<void> {
  await db.delete(pastes).where(eq(pastes.slug, slug));
}

describe("paste routes", () => {
  it("creates and reads a paste as plain text", async () => {
    const { slug, url } = await createTextPaste("hello from a test");

    try {
      expect(url).toContain(`/${slug}`);

      const response = await app.request(`/api/pastes/${slug}/raw`);

      expect(response.status).toBe(200);
      expect(await response.text()).toBe("hello from a test");
    } finally {
      await removePaste(slug);
    }
  });

  it("returns metadata without the content", async () => {
    const { slug } = await createTextPaste("metadata test");

    try {
      const response = await app.request(`/api/pastes/${slug}/meta`);
      const body = (await response.json()) as Record<string, unknown>;

      expect(response.status).toBe(200);
      expect(body.slug).toBe(slug);
      expect(body).not.toHaveProperty("content");
      expect(body.has_password).toBe(false);
    } finally {
      await removePaste(slug);
    }
  });

  it("rejects private pastes for anonymous users", async () => {
    const response = await app.request("/api/pastes", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        content: "private",
        visibility: "private",
      }),
    });

    expect(response.status).toBe(403);
  });

  it("rejects anonymous expiry beyond 7 days", async () => {
    const response = await app.request("/api/pastes?expires=30d", {
      method: "POST",
      headers: {
        "content-type": "text/plain",
      },
      body: "too long",
    });

    expect(response.status).toBe(400);
  });

  it("requires an explicit read for burn-after-read pastes", async () => {
    const { slug } = await createTextPaste("burn me", "?burn=1");

    try {
      const blocked = await app.request(`/api/pastes/${slug}/raw`);
      expect(blocked.status).toBe(409);

      const first = await app.request(`/api/pastes/${slug}/raw?burn=1`);
      expect(first.status).toBe(200);
      expect(await first.text()).toBe("burn me");

      const second = await app.request(`/api/pastes/${slug}/raw?burn=1`);
      expect(second.status).toBe(404);
    } finally {
      await removePaste(slug);
    }
  });

  it("checks paste passwords", async () => {
    const response = await app.request("/api/pastes", {
      method: "POST",
      headers: {
        "content-type": "text/plain",
        accept: "text/plain",
        "x-paste-password": "correct horse",
      },
      body: "secret",
    });

    expect(response.status).toBe(201);
    const url = await response.text();
    const slug = new URL(url).pathname.replace(/^\//, "");

    try {
      const missing = await app.request(`/api/pastes/${slug}/raw`);
      expect(missing.status).toBe(401);

      const wrong = await app.request(`/api/pastes/${slug}/raw`, {
        headers: { "x-paste-password": "wrong" },
      });
      expect(wrong.status).toBe(401);

      const correct = await app.request(`/api/pastes/${slug}/raw`, {
        headers: { "x-paste-password": "correct horse" },
      });
      expect(correct.status).toBe(200);
      expect(await correct.text()).toBe("secret");
    } finally {
      await removePaste(slug);
    }
  });
});
