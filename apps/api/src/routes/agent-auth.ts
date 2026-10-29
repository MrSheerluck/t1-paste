import type { OpenAPIHono } from "@hono/zod-openapi";

import type { Database } from "@t1/db";
import { PasteDomainError } from "@t1/shared";

import type { AppEnv } from "../env.ts";
import {
  AGENT_SCOPES,
  authenticateAgent,
  createAnonymousAgent,
  exchangeAssertion,
  getAgentProfile,
  revokeAccessToken,
} from "../services/agent-auth.ts";

type AppBindings = {
  Variables: {
    requestId: string;
  };
};

type AgentAuthDependencies = {
  db: Database;
  env: AppEnv;
};

export function registerAgentAuthRoutes(
  app: OpenAPIHono<AppBindings>,
  deps: AgentAuthDependencies,
): void {
  app.get("/auth.md", (c) =>
    c.text(authMarkdown(deps.env), 200, {
      "content-type": "text/markdown; charset=utf-8",
      "cache-control": "public, max-age=300",
    }),
  );

  app.get("/.well-known/oauth-protected-resource", (c) => {
    const base = baseUrl(deps.env);

    return c.json(
      {
        resource: base,
        resource_name: "t1-paste",
        resource_logo_uri: `${base}/favicon.svg`,
        authorization_servers: [base],
        scopes_supported: [...AGENT_SCOPES],
        bearer_methods_supported: ["header"],
      },
      200,
    );
  });

  app.get("/.well-known/oauth-authorization-server", (c) => {
    const base = baseUrl(deps.env);

    return c.json(
      {
        resource: base,
        authorization_servers: [base],
        scopes_supported: [...AGENT_SCOPES],
        bearer_methods_supported: ["header"],
        issuer: base,
        token_endpoint: `${base}/oauth2/token`,
        revocation_endpoint: `${base}/oauth2/revoke`,
        grant_types_supported: ["urn:ietf:params:oauth:grant-type:jwt-bearer"],
        agent_auth: {
          skill: `${base}/auth.md`,
          identity_endpoint: `${base}/agent/identity`,
          identity_types_supported: ["anonymous"],
          events_supported: [],
        },
      },
      200,
    );
  });

  app.post("/agent/identity", async (c) => {
    if (deps.env.AGENT_REGISTRATION_TOKEN) {
      const provided = c.req.header("x-bootstrap-token");

      if (provided !== deps.env.AGENT_REGISTRATION_TOKEN) {
        throw new PasteDomainError(
          "bootstrap_token_required",
          401,
          "This instance requires a bootstrap token for agent registration.",
        );
      }
    }

    const body = (await c.req.json().catch(() => null)) as {
      type?: unknown;
    } | null;

    if (body?.type === "service_auth") {
      throw new PasteDomainError(
        "service_auth_not_enabled",
        400,
        "This instance supports anonymous agent registration only.",
      );
    }

    if (body?.type !== "anonymous") {
      throw new PasteDomainError(
        "invalid_request",
        400,
        'Use {"type":"anonymous"} for agent registration.',
      );
    }

    const registration = await createAnonymousAgent(deps.db, deps.env);

    return c.json(
      {
        registration_id: registration.registrationId,
        registration_type: "anonymous",
        identity_assertion: registration.identityAssertion,
        assertion_expires: registration.assertionExpires.toISOString(),
        pre_claim_scopes: registration.scopes,
        post_claim_scopes: registration.scopes,
        scopes: registration.scopes,
      },
      200,
    );
  });

  app.post("/oauth2/token", async (c) => {
    const form = new URLSearchParams(await c.req.text());
    const grantType = form.get("grant_type");
    const assertion = form.get("assertion");
    const resource = form.get("resource") ?? undefined;

    if (grantType !== "urn:ietf:params:oauth:grant-type:jwt-bearer") {
      throw new PasteDomainError(
        "unsupported_grant_type",
        400,
        "Only the JWT-bearer grant is supported.",
      );
    }

    if (!assertion) {
      throw new PasteDomainError("invalid_request", 400, "The assertion parameter is required.");
    }

    const token = await exchangeAssertion(deps.db, deps.env, assertion, resource);

    c.header("cache-control", "no-store");
    c.header("pragma", "no-cache");

    return c.json(
      {
        access_token: token.accessToken,
        token_type: "Bearer",
        expires_in: token.expiresIn,
        scope: token.scopes.join(" "),
      },
      200,
    );
  });

  app.post("/oauth2/revoke", async (c) => {
    const form = new URLSearchParams(await c.req.text());
    const token = form.get("token");

    if (!token) {
      throw new PasteDomainError("invalid_request", 400, "The token parameter is required.");
    }

    await revokeAccessToken(deps.db, token);

    return c.body(null, 200);
  });

  app.get("/api/agents/me", async (c) => {
    const agent = await authenticateAgent(deps.db, c.req.header("authorization"));

    if (!agent) {
      throw new PasteDomainError("invalid_token", 401, "A Bearer access token is required.");
    }

    const profile = await getAgentProfile(deps.db, agent.agentId);

    return c.json(
      {
        id: profile.id,
        registration_id: profile.registrationId,
        status: profile.status,
        scopes: profile.scopes,
        created_at: profile.createdAt.toISOString(),
        last_seen_at: profile.lastSeenAt?.toISOString() ?? null,
      },
      200,
    );
  });
}

function baseUrl(env: AppEnv): string {
  return env.APP_URL.replace(/\/$/, "");
}

function authMarkdown(env: AppEnv): string {
  const base = baseUrl(env);

  return `# auth.md

You are an agent. This service supports **anonymous agent registration** using
the auth.md discovery flow. Follow these steps in order.

This instance does not support human accounts, \`service_auth\`, claim ceremonies,
or ID-JAG identity assertions. Use anonymous registration.

## Step 1 — Discover

Fetch the protected resource metadata:

\`\`\`http
GET ${base}/.well-known/oauth-protected-resource
\`\`\`

Fetch the authorization server metadata:

\`\`\`http
GET ${base}/.well-known/oauth-authorization-server
\`\`\`

The \`agent_auth\` block contains the registration and token endpoints.

## Step 2 — Register an anonymous agent

\`\`\`http
POST ${base}/agent/identity
Content-Type: application/json

{"type":"anonymous"}
\`\`\`

If the operator requires a bootstrap token, also send:

\`\`\`http
x-bootstrap-token: <operator-provided-token>
\`\`\`

Response:

\`\`\`json
{
  "registration_id": "agent_reg_...",
  "registration_type": "anonymous",
  "identity_assertion": "<signed JWT>",
  "assertion_expires": "2026-10-29T12:00:00.000Z",
  "pre_claim_scopes": ["paste:create", "paste:read", "..."],
  "post_claim_scopes": ["paste:create", "paste:read", "..."],
  "scopes": ["paste:create", "paste:read", "..."]
}
\`\`\`

Store the identity assertion and its expiry. There is no human claim step.

## Step 3 — Exchange the assertion for an access token

\`\`\`http
POST ${base}/oauth2/token
Content-Type: application/x-www-form-urlencoded

grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer
&assertion=<identity_assertion>
&resource=${base}
\`\`\`

Response:

\`\`\`json
{
  "access_token": "t1_at_...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "paste:create paste:read paste:update paste:delete paste:private paste:long-lived"
}
\`\`\`

Access tokens are short-lived. Re-exchange the same identity assertion while it
is valid to mint another access token.

## Step 4 — Use the access token

\`\`\`http
POST ${base}/api/pastes
Authorization: Bearer <access_token>
Content-Type: text/plain
Accept: text/plain

hello from an agent
\`\`\`

The response is a URL.

All paste creation requires an access token. Anonymous create requests are
rejected with \`401 agent_registration_required\`. Agent tokens can create private
pastes and use the 30-day maximum expiry.

## Step 5 — Revoke

\`\`\`http
POST ${base}/oauth2/revoke
Content-Type: application/x-www-form-urlencoded

token=<access_token>&token_type_hint=access_token
\`\`\`

Revocation is idempotent.

## Scopes

${AGENT_SCOPES.map((scope) => `- \`${scope}\``).join("\n")}

## Limits

- 256 KB of UTF-8 text per paste.
- 30-day maximum for agent access tokens.
- Text only. No files, images, or binary uploads.
- Public and unlisted links are readable without a token.
- Private pastes require the owning agent token.

## Errors

- \`invalid_request\` — malformed registration or token request.
- \`invalid_grant\` — assertion expired, invalid, or agent revoked.
- \`invalid_token\` — access token missing, expired, or revoked.
- \`agent_registration_required\` — register an agent before creating a paste.
- \`bootstrap_token_required\` — send \`x-bootstrap-token\`.
- \`service_auth_not_enabled\` — use anonymous registration.
- \`rate_limited\` — back off and honor \`Retry-After\`.

## Machine-readable metadata

- Protected resource: ${base}/.well-known/oauth-protected-resource
- Authorization server: ${base}/.well-known/oauth-authorization-server
- OpenAPI: ${base}/openapi.json
`;
}

export function resourceMetadataUrl(env: AppEnv): string {
  return `${baseUrl(env)}/.well-known/oauth-protected-resource`;
}
