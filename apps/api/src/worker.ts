import { createApp } from "./app.ts";
import { parseEnv } from "./env.ts";

export default {
  fetch(request: Request): Response | Promise<Response> {
    const app = createApp({
      env: parseEnv({ NODE_ENV: "production" }),
      version: "0.0.0",
    });

    return app.fetch(request);
  },
};
