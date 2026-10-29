import { describe, expect, it } from "vite-plus/test";
import { createDatabase } from "@t1/db";

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

describe("system routes", () => {
  it("returns health", async () => {
    const response = await app.request("/health");

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      service: "t1-paste-api",
      version: "0.0.0",
    });
  });

  it("returns version", async () => {
    const response = await app.request("/version");

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      name: "t1-paste-api",
      version: "0.0.0",
    });
  });

  it("serves OpenAPI", async () => {
    const response = await app.request("/openapi.json");

    expect(response.status).toBe(200);
    const spec = await response.json();
    expect(spec.openapi).toBe("3.1.0");
  });
});
