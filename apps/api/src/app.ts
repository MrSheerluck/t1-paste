import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { secureHeaders } from "hono/secure-headers";

import type { AppEnv } from "./env.ts";
import { errorHandler } from "./lib/error-handler.ts";
import { logger } from "./lib/logger.ts";
import { requestId } from "./lib/request-id.ts";

export type AppDependencies = {
  env: AppEnv;
  version: string;
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
