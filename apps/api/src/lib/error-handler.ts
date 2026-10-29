import type { ErrorHandler } from "hono";
import { HTTPException } from "hono/http-exception";

type AppBindings = {
  Variables: {
    requestId: string;
  };
};

export const errorHandler: ErrorHandler<AppBindings> = (err, c) => {
  const requestId = c.get("requestId") ?? "unknown";

  if (err instanceof HTTPException) {
    return c.json(
      {
        error: "http_error",
        message: err.message,
        request_id: requestId,
      },
      err.status,
    );
  }

  console.error(
    JSON.stringify({
      level: "error",
      request_id: requestId,
      error: err.message,
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
