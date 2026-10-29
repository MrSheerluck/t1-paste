import { createDatabase } from "@t1/db";

import { createApp } from "./app.ts";
import { parseEnv } from "./env.ts";

const env = parseEnv({
  NODE_ENV: "production",
  DATABASE_URL: "postgres://invalid",
  AGENT_AUTH_SECRET: "worker-placeholder-secret-16",
});
const { db } = createDatabase(env.DATABASE_URL);
const app = createApp({
  env,
  version: "0.0.0",
  db,
});

export default {
  fetch(request: Request): Response | Promise<Response> {
    return app.fetch(request);
  },
};
