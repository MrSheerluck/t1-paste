import { describe, expect, it } from "vite-plus/test";

import { createApp } from "../src/app.ts";
import { parseEnv } from "../src/env.ts";

const app = createApp({
  env: parseEnv({ NODE_ENV: "test" }),
  version: "0.0.0",
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
