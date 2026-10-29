import { serve } from "@hono/node-server";

import { createApp } from "./app.ts";
import { parseEnv } from "./env.ts";

const env = parseEnv(process.env);
const app = createApp({
  env,
  version: "0.0.0",
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
