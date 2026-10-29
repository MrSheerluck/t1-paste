import { z } from "zod";

import {
  PASTE_MAX_BYTES,
  PASTE_MAX_LANGUAGE_LENGTH,
  PASTE_MAX_TAG_LENGTH,
  PASTE_MAX_TAGS,
  PASTE_MAX_TITLE_LENGTH,
} from "./constants.ts";
import { PasteDomainError } from "./errors.ts";
import { parseExpiryInput } from "./expiry.ts";
import type { Principal } from "./principal.ts";
import { assertValidCustomSlug } from "./slug.ts";

export const pasteVisibilitySchema = z.enum(["public", "unlisted", "private"]);

export type PasteVisibility = z.infer<typeof pasteVisibilitySchema>;

export const createPasteInputSchema = z.object({
  content: z.string(),
  title: z.string().trim().max(PASTE_MAX_TITLE_LENGTH).optional(),
  language: z.string().trim().min(1).max(PASTE_MAX_LANGUAGE_LENGTH).default("text"),
  visibility: pasteVisibilitySchema.default("unlisted"),
  expiresIn: z.string().trim().optional(),
  password: z.string().min(1).max(200).optional(),
  burnAfterRead: z.boolean().default(false),
  customSlug: z.string().trim().optional(),
  tags: z.array(z.string().trim().min(1).max(PASTE_MAX_TAG_LENGTH)).max(PASTE_MAX_TAGS).default([]),
});

export type CreatePasteInput = z.infer<typeof createPasteInputSchema>;

export type ValidatedPasteInput = {
  content: string;
  sizeBytes: number;
  title: string | null;
  language: string;
  visibility: PasteVisibility;
  expiresAt: Date;
  password: string | null;
  burnAfterRead: boolean;
  customSlug: string | null;
  tags: string[];
};

export function validateCreatePasteInput(
  principal: Principal,
  input: CreatePasteInput,
  now = new Date(),
): ValidatedPasteInput {
  const content = validatePasteContent(input.content);
  assertPastePermissions(principal, input);

  const expiresAt = parseExpiryInput(input.expiresIn, principal, now);
  const customSlug = input.customSlug ? assertValidCustomSlug(input.customSlug) : null;
  const tags = [...new Set(input.tags.map((tag) => tag.toLowerCase()))];

  return {
    content: content.content,
    sizeBytes: content.sizeBytes,
    title: input.title?.trim() || null,
    language: input.language,
    visibility: input.visibility,
    expiresAt,
    password: input.password ?? null,
    burnAfterRead: input.burnAfterRead,
    customSlug,
    tags,
  };
}

export function validatePasteContent(content: string): {
  content: string;
  sizeBytes: number;
} {
  if (content.includes("\0")) {
    throw new PasteDomainError("invalid_content", 400, "Paste content contains a null byte.");
  }

  if (content.length === 0) {
    throw new PasteDomainError("empty_content", 400, "Paste content cannot be empty.");
  }

  const sizeBytes = new TextEncoder().encode(content).byteLength;

  if (sizeBytes > PASTE_MAX_BYTES) {
    throw new PasteDomainError(
      "paste_too_large",
      413,
      `Paste exceeds the ${PASTE_MAX_BYTES / 1024} KB limit.`,
    );
  }

  return { content, sizeBytes };
}

export function assertPastePermissions(principal: Principal, input: CreatePasteInput): void {
  const anonymousLike =
    principal.kind === "anonymous" || (principal.kind === "agent" && !principal.claimed);

  if (input.burnAfterRead && input.visibility === "public") {
    throw new PasteDomainError(
      "burn_after_read_public",
      400,
      "Burn-after-read pastes must be unlisted or private.",
    );
  }

  if (!anonymousLike) {
    return;
  }

  if (input.visibility === "private") {
    throw new PasteDomainError(
      "private_requires_account",
      403,
      "Private pastes require an account.",
    );
  }

  if (input.customSlug) {
    throw new PasteDomainError(
      "custom_slug_requires_account",
      403,
      "Custom slugs require an account.",
    );
  }

  if (input.tags.length > 0) {
    throw new PasteDomainError("tags_require_account", 403, "Tags require an account.");
  }
}
