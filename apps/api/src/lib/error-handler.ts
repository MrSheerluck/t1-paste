import type { ErrorHandler } from "hono";
import { HTTPException } from "hono/http-exception";
import type { ContentfulStatusCode } from "hono/utils/http-status";

import { PasteDomainError } from "@t1/shared";

type AppBindings = {
  Variables: {
    requestId: string;
  };
};

export const errorHandler: ErrorHandler<AppBindings> = (err, c) => {
  const requestId = c.get("requestId") ?? "unknown";

  if (err instanceof PasteDomainError) {
    return c.json(
      {
        error: err.code,
        message: err.message,
        request_id: requestId,
      },
      err.status as ContentfulStatusCode,
    );
  }

  if (err instanceof HTTPException) {
    return c.json(
      {
        error: "http_error",
        message: err.message,
        request_id: requestId,
      },
      err.status as ContentfulStatusCode,
    );
  }

  const cause = err.cause;

  console.error(
    JSON.stringify({
      level: "error",
      request_id: requestId,
      error: err.message,
      cause: cause instanceof Error ? cause.message : cause ? String(cause) : undefined,
      stack: err.stack,
    }),
  );

  return c.json(
    {
      error: "internal_error",
      message: "Something went wrong.",
      request_id: requestId,
    },
    500,
  );
};
