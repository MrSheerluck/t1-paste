import type { Context } from "hono";
import { z, type OpenAPIHono } from "@hono/zod-openapi";

import type { Database } from "@t1/db";
import { createPasteInputSchema, PasteDomainError, type CreatePasteInput } from "@t1/shared";

import type { AppEnv } from "../env.ts";
import { resolvePrincipal } from "../services/agent-auth.ts";
import {
  createPaste,
  getPaste,
  getPasteMeta,
  type PasteRecord,
} from "../services/paste-service.ts";

type AppBindings = {
  Variables: {
    requestId: string;
  };
};

type PasteRoutesDependencies = {
  db: Database;
  env: AppEnv;
};

export function registerPasteRoutes(
  app: OpenAPIHono<AppBindings>,
  deps: PasteRoutesDependencies,
): void {
  app.post("/api/pastes", async (c) => {
    const input = await parseCreatePasteInput(c.req.raw);
    const principal = await resolvePrincipal(deps.db, c.req.header("authorization"));
    const row = await createPaste(deps.db, principal, input);
    const url = new URL(`/${row.slug}`, deps.env.APP_URL).toString();

    if ((c.req.header("accept") ?? "").includes("text/plain")) {
      return c.text(url, 201);
    }

    return c.json(
      {
        id: row.id,
        slug: row.slug,
        url,
        expires_at: row.expiresAt.toISOString(),
      },
      201,
    );
  });

  app.get("/api/pastes/:slug", async (c) => {
    const slug = c.req.param("slug");
    const principal = await resolvePrincipal(deps.db, c.req.header("authorization"));
    const row = await getPaste(deps.db, slug, {
      principal,
      password: c.req.header("x-paste-password") ?? c.req.query("password"),
      burn: isTruthy(c.req.query("burn")),
    });

    if ((c.req.header("accept") ?? "").includes("text/plain") || isTruthy(c.req.query("raw"))) {
      return rawResponse(c, row, isTruthy(c.req.query("download")));
    }

    return c.json(toJson(row), 200);
  });

  app.get("/api/pastes/:slug/raw", async (c) => {
    const slug = c.req.param("slug");
    const principal = await resolvePrincipal(deps.db, c.req.header("authorization"));
    const row = await getPaste(deps.db, slug, {
      principal,
      password: c.req.header("x-paste-password") ?? c.req.query("password"),
      burn: isTruthy(c.req.query("burn")),
    });

    return rawResponse(c, row, isTruthy(c.req.query("download")));
  });

  app.get("/api/pastes/:slug/meta", async (c) => {
    const slug = c.req.param("slug");
    const principal = await resolvePrincipal(deps.db, c.req.header("authorization"));
    const row = await getPasteMeta(deps.db, slug, principal);

    return c.json(toMetaJson(row), 200);
  });

  const slugParams = z.object({
    slug: z.string().min(1),
  });

  const createdPaste = z.object({
    id: z.string(),
    slug: z.string(),
    url: z.string().url(),
    expires_at: z.string(),
  });

  const metaResponse = z.object({
    id: z.string(),
    slug: z.string(),
    title: z.string().nullable(),
    language: z.string(),
    visibility: z.enum(["public", "unlisted", "private"]),
    size_bytes: z.number().int(),
    burn_after_read: z.boolean(),
    has_password: z.boolean(),
    view_count: z.number().int(),
    created_at: z.string(),
    updated_at: z.string(),
    expires_at: z.string(),
  });

  app.openAPIRegistry.registerPath({
    method: "post",
    path: "/api/pastes",
    tags: ["pastes"],
    summary: "Create a paste",
    request: {
      body: {
        content: {
          "text/plain": {
            schema: z.string(),
          },
          "application/json": {
            schema: createPasteInputSchema,
          },
        },
      },
    },
    responses: {
      201: {
        description: "Paste created.",
        content: {
          "application/json": {
            schema: createdPaste,
          },
          "text/plain": {
            schema: z.string().url(),
          },
        },
      },
      400: {
        description: "Invalid paste input.",
      },
      413: {
        description: "Paste exceeds the size limit.",
      },
    },
  });

  app.openAPIRegistry.registerPath({
    method: "get",
    path: "/api/pastes/{slug}/meta",
    tags: ["pastes"],
    summary: "Read paste metadata",
    request: {
      params: slugParams,
    },
    responses: {
      200: {
        description: "Paste metadata.",
        content: {
          "application/json": {
            schema: metaResponse,
          },
        },
      },
      404: {
        description: "Paste not found.",
      },
    },
  });

  app.openAPIRegistry.registerPath({
    method: "get",
    path: "/api/pastes/{slug}/raw",
    tags: ["pastes"],
    summary: "Read raw paste content",
    request: {
      params: slugParams,
    },
    responses: {
      200: {
        description: "Raw paste content.",
        content: {
          "text/plain": {
            schema: z.string(),
          },
        },
      },
      401: {
        description: "Password required.",
      },
      404: {
        description: "Paste not found.",
      },
    },
  });
}

async function parseCreatePasteInput(request: Request): Promise<CreatePasteInput> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    let body: unknown;

    try {
      body = await request.json();
    } catch {
      throw new PasteDomainError("invalid_json", 400, "Request body must be valid JSON.");
    }

    return parseCreateInput(body);
  }

  const url = new URL(request.url);
  const content = await request.text();

  return parseCreateInput({
    content,
    title: url.searchParams.get("title") ?? undefined,
    language: url.searchParams.get("lang") ?? url.searchParams.get("language") ?? "text",
    visibility: url.searchParams.get("visibility") ?? "unlisted",
    expiresIn: url.searchParams.get("expires") ?? undefined,
    password: request.headers.get("x-paste-password") ?? undefined,
    burnAfterRead: isTruthy(url.searchParams.get("burn")),
    customSlug: url.searchParams.get("slug") ?? undefined,
  });
}

function parseCreateInput(input: unknown): CreatePasteInput {
  const parsed = createPasteInputSchema.safeParse(input);

  if (!parsed.success) {
    throw new PasteDomainError(
      "validation_error",
      400,
      parsed.error.issues[0]?.message ?? "Invalid paste input.",
    );
  }

  return parsed.data;
}

function rawResponse(c: Context<AppBindings>, row: PasteRecord, download: boolean) {
  c.header("content-type", "text/plain; charset=utf-8");
  c.header("x-content-type-options", "nosniff");
  c.header("cache-control", "no-store");

  if (download) {
    c.header("content-disposition", `attachment; filename="${row.slug}.txt"`);
  }

  return c.body(row.content, 200);
}

function toJson(row: PasteRecord) {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    language: row.language,
    visibility: row.visibility,
    content: row.content,
    size_bytes: row.sizeBytes,
    burn_after_read: row.burnAfterRead,
    has_password: Boolean(row.passwordHash),
    view_count: row.viewCount,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
    expires_at: row.expiresAt.toISOString(),
  };
}

function toMetaJson(row: PasteRecord) {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    language: row.language,
    visibility: row.visibility,
    size_bytes: row.sizeBytes,
    burn_after_read: row.burnAfterRead,
    has_password: Boolean(row.passwordHash),
    view_count: row.viewCount,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
    expires_at: row.expiresAt.toISOString(),
  };
}

function isTruthy(value: string | null | undefined): boolean {
  return value === "1" || value === "true";
}
