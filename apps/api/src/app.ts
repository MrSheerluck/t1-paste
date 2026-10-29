import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { bodyLimit } from "hono/body-limit";
import { secureHeaders } from "hono/secure-headers";

import type { Database } from "@t1/db";
import { PASTE_MAX_BYTES } from "@t1/shared";

import type { AppEnv } from "./env.ts";
import { errorHandler } from "./lib/error-handler.ts";
import { logger } from "./lib/logger.ts";
import { requestId } from "./lib/request-id.ts";
import { registerAgentAuthRoutes, resourceMetadataUrl } from "./routes/agent-auth.ts";
import { registerPasteRoutes } from "./routes/pastes.ts";

export type AppDependencies = {
  env: AppEnv;
  version: string;
  db: Database;
};

const healthResponse = z.object({
  ok: z.literal(true),
  service: z.literal("t1-paste-api"),
  version: z.string(),
});

const healthRoute = createRoute({
  method: "get",
  path: "/health",
  tags: ["system"],
  responses: {
    200: {
      description: "Service is healthy.",
      content: {
        "application/json": {
          schema: healthResponse,
        },
      },
    },
  },
});

const versionResponse = z.object({
  name: z.literal("t1-paste-api"),
  version: z.string(),
});

const versionRoute = createRoute({
  method: "get",
  path: "/version",
  tags: ["system"],
  responses: {
    200: {
      description: "Service version.",
      content: {
        "application/json": {
          schema: versionResponse,
        },
      },
    },
  },
});

export function createApp(deps: AppDependencies) {
  const app = new OpenAPIHono<{
    Variables: {
      requestId: string;
    };
  }>({
    defaultHook: (result, c) => {
      if (!result.success) {
        return c.json(
          {
            error: "validation_error",
            message: "The request is invalid.",
            request_id: c.get("requestId") ?? "unknown",
            issues: result.error.issues,
          },
          400,
        );
      }
    },
  });

  app.use("*", requestId);
  app.use("*", logger);
  app.use("*", secureHeaders());
  app.use("*", async (c, next) => {
    await next();

    if (c.res.status === 401) {
      c.header("WWW-Authenticate", `Bearer resource_metadata="${resourceMetadataUrl(deps.env)}"`);
    }
  });
  app.use(
    "/api/pastes",
    bodyLimit({
      maxSize: PASTE_MAX_BYTES,
      onError: (c) =>
        c.json(
          {
            error: "paste_too_large",
            message: `Paste exceeds the ${PASTE_MAX_BYTES / 1024} KB limit.`,
            request_id: c.get("requestId") ?? "unknown",
          },
          413,
        ),
    }),
  );
  app.onError(errorHandler);

  app.openapi(healthRoute, (c) =>
    c.json(
      {
        ok: true,
        service: "t1-paste-api",
        version: deps.version,
      } satisfies z.infer<typeof healthResponse>,
      200,
    ),
  );

  app.openapi(versionRoute, (c) =>
    c.json(
      {
        name: "t1-paste-api",
        version: deps.version,
      } satisfies z.infer<typeof versionResponse>,
      200,
    ),
  );

  registerAgentAuthRoutes(app, deps);
  registerPasteRoutes(app, deps);

  app.doc("/openapi.json", {
    openapi: "3.1.0",
    info: {
      title: "t1-paste API",
      version: deps.version,
      description: "Agent-first pastebin API.",
    },
  });

  return app;
}
