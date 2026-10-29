import { PASTE_SLUG_LENGTH } from "./constants.ts";
import { PasteDomainError } from "./errors.ts";

const ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

const RESERVED_SLUGS = new Set([
  "about",
  "acceptable-use",
  "admin",
  "agents.md",
  "api",
  "assets",
  "auth",
  "auth.md",
  "claim",
  "cli",
  "dashboard",
  "dmca",
  "docs",
  "embed",
  "favicon.ico",
  "health",
  "legal",
  "llms.txt",
  "login",
  "logout",
  "new",
  "openapi.json",
  "privacy",
  "raw",
  "reports",
  "robots.txt",
  "security",
  "settings",
  "signin",
  "signup",
  "sitemap.xml",
  "static",
  "status",
  "terms",
  "version",
  "_next",
]);

const CUSTOM_SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{1,30}[a-z0-9])$/;

export function generateSlug(length = PASTE_SLUG_LENGTH): string {
  let slug = "";

  do {
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);

    slug = "";
    for (const byte of bytes) {
      slug += ALPHABET[byte % ALPHABET.length];
    }
  } while (isReservedSlug(slug));

  return slug;
}

export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.has(slug.toLowerCase());
}

export function assertValidCustomSlug(slug: string): string {
  const normalized = slug.trim().toLowerCase();

  if (!CUSTOM_SLUG_RE.test(normalized)) {
    throw new PasteDomainError(
      "invalid_slug",
      400,
      "Custom slugs must be 3-32 lowercase letters, numbers, or hyphens, and cannot start or end with a hyphen.",
    );
  }

  if (isReservedSlug(normalized)) {
    throw new PasteDomainError("reserved_slug", 400, "That slug is reserved by the application.");
  }

  return normalized;
}
