import { and, eq, sql } from "drizzle-orm";

import { pastes, type Database } from "@t1/db";
import {
  generateSlug,
  PasteDomainError,
  validateCreatePasteInput,
  type CreatePasteInput,
  type Principal,
} from "@t1/shared";

import { hashPassword, verifyPassword } from "../lib/password.ts";

export type PasteRecord = typeof pastes.$inferSelect;

export type GetPasteOptions = {
  principal: Principal;
  password?: string;
  burn?: boolean;
};

export async function createPaste(
  db: Database,
  principal: Principal,
  input: CreatePasteInput,
): Promise<PasteRecord> {
  const validated = validateCreatePasteInput(principal, input);
  const passwordHash = validated.password ? await hashPassword(validated.password) : null;
  const ownerUserId = principal.kind === "user" ? principal.userId : null;
  const ownerAgentId = principal.kind === "agent" ? principal.agentId : null;

  let lastError: unknown;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const slug = validated.customSlug ?? generateSlug();

    try {
      const [row] = await db
        .insert(pastes)
        .values({
          slug,
          ownerUserId,
          ownerAgentId,
          title: validated.title,
          content: validated.content,
          language: validated.language,
          visibility: validated.visibility,
          passwordHash,
          expiresAt: validated.expiresAt,
          burnAfterRead: validated.burnAfterRead,
          sizeBytes: validated.sizeBytes,
        })
        .returning();

      if (!row) {
        throw new Error("Paste insert returned no row.");
      }

      return row;
    } catch (error) {
      lastError = error;

      if (isUniqueViolation(error) && !validated.customSlug) {
        continue;
      }

      if (isUniqueViolation(error) && validated.customSlug) {
        throw new PasteDomainError("slug_taken", 409, "That custom slug is already in use.");
      }

      throw error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Could not create a unique paste slug.");
}

export async function getPaste(
  db: Database,
  slug: string,
  options: GetPasteOptions,
): Promise<PasteRecord> {
  const [row] = await db.select().from(pastes).where(eq(pastes.slug, slug)).limit(1);

  if (!row || row.deletedAt) {
    throw new PasteDomainError("paste_not_found", 404, "Paste not found.");
  }

  if (row.expiresAt.getTime() <= Date.now()) {
    throw new PasteDomainError("paste_expired", 410, "This paste has expired.");
  }

  assertCanRead(row, options.principal);

  if (row.passwordHash) {
    if (!options.password) {
      throw new PasteDomainError("password_required", 401, "This paste is password protected.");
    }

    const valid = await verifyPassword(options.password, row.passwordHash);

    if (!valid) {
      throw new PasteDomainError("invalid_password", 401, "The paste password is incorrect.");
    }
  }

  if (row.burnAfterRead) {
    if (!options.burn) {
      throw new PasteDomainError(
        "burn_confirmation_required",
        409,
        "This paste requires an explicit burn read.",
      );
    }

    const [deleted] = await db
      .delete(pastes)
      .where(and(eq(pastes.id, row.id), eq(pastes.burnAfterRead, true)))
      .returning();

    if (!deleted) {
      throw new PasteDomainError("paste_not_found", 404, "This paste has already been read.");
    }

    return deleted;
  }

  await db
    .update(pastes)
    .set({ viewCount: sql`${pastes.viewCount} + 1` })
    .where(eq(pastes.id, row.id));

  return row;
}

export async function getPasteMeta(
  db: Database,
  slug: string,
  principal: Principal,
): Promise<PasteRecord> {
  const [row] = await db.select().from(pastes).where(eq(pastes.slug, slug)).limit(1);

  if (!row || row.deletedAt) {
    throw new PasteDomainError("paste_not_found", 404, "Paste not found.");
  }

  if (row.expiresAt.getTime() <= Date.now()) {
    throw new PasteDomainError("paste_expired", 410, "This paste has expired.");
  }

  assertCanRead(row, principal);

  return row;
}

function assertCanRead(row: PasteRecord, principal: Principal): void {
  if (row.visibility !== "private") {
    return;
  }

  const allowed =
    (principal.kind === "user" && row.ownerUserId === principal.userId) ||
    (principal.kind === "agent" && principal.claimed && row.ownerAgentId === principal.agentId);

  if (!allowed) {
    throw new PasteDomainError("paste_not_found", 404, "Paste not found.");
  }
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "23505"
  );
}
