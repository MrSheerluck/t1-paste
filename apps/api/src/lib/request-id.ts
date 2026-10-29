import { createMiddleware } from "hono/factory";

type AppBindings = {
  Variables: {
    requestId: string;
  };
};

export const requestId = createMiddleware<AppBindings>(async (c, next) => {
  const id = c.req.header("x-request-id") ?? crypto.randomUUID();

  c.set("requestId", id);
  c.header("x-request-id", id);

  await next();
});
