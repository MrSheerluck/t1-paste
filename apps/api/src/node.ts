import { serve } from "@hono/node-server";
import { createDatabase } from "@t1/db";

import { createApp } from "./app.ts";
import { parseEnv } from "./env.ts";

const env = parseEnv(process.env);
const { db, client } = createDatabase(env.DATABASE_URL);
const app = createApp({
  env,
  version: "0.0.0",
  db,
});

serve(
  {
    fetch: app.fetch,
    port: env.PORT,
  },
  (info) => {
    console.log(`t1-paste API listening on http://localhost:${info.port}`);
  },
);

async function shutdown(): Promise<void> {
  await client.end();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
