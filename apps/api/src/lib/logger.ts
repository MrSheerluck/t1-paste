import { createMiddleware } from "hono/factory";

type AppBindings = {
  Variables: {
    requestId: string;
  };
};

export const logger = createMiddleware<AppBindings>(async (c, next) => {
  const startedAt = performance.now();

  try {
    await next();
  } finally {
    console.log(
      JSON.stringify({
        level: "info",
        request_id: c.get("requestId"),
        method: c.req.method,
        path: c.req.path,
        status: c.res.status,
        duration_ms: Math.round(performance.now() - startedAt),
      }),
    );
  }
});
