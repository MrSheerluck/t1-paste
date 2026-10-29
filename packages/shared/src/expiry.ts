import {
  PASTE_ANONYMOUS_MAX_TTL_SECONDS,
  PASTE_DEFAULT_TTL_SECONDS,
  PASTE_MAX_TTL_SECONDS,
  PASTE_MIN_TTL_SECONDS,
} from "./constants.ts";
import { PasteDomainError } from "./errors.ts";
import type { Principal } from "./principal.ts";

const EXPIRY_RE = /^(\d+)(m|h|d)$/;

export function parseExpiryInput(
  input: string | undefined,
  principal: Principal,
  now = new Date(),
): Date {
  const raw = input?.trim();
  const maxSeconds = maxTtlSeconds(principal);

  if (!raw) {
    return new Date(now.getTime() + PASTE_DEFAULT_TTL_SECONDS * 1000);
  }

  const match = EXPIRY_RE.exec(raw);

  if (!match) {
    throw new PasteDomainError("invalid_expiry", 400, "Expiry must look like 30m, 12h, or 7d.");
  }

  const amountText = match[1];
  const unit = match[2];

  if (!amountText || !unit) {
    throw new PasteDomainError("invalid_expiry", 400, "Expiry must look like 30m, 12h, or 7d.");
  }

  const amount = Number(amountText);
  const seconds = amount * (unit === "m" ? 60 : unit === "h" ? 60 * 60 : 24 * 60 * 60);

  if (seconds < PASTE_MIN_TTL_SECONDS) {
    throw new PasteDomainError("expiry_too_short", 400, "Expiry must be at least 1 minute.");
  }

  if (seconds > maxSeconds) {
    throw new PasteDomainError(
      "expiry_too_long",
      400,
      `Maximum expiry for this account is ${maxSeconds / 86_400} days.`,
    );
  }

  return new Date(now.getTime() + seconds * 1000);
}

export function maxTtlSeconds(principal: Principal): number {
  if (principal.kind === "user" || (principal.kind === "agent" && principal.claimed)) {
    return PASTE_MAX_TTL_SECONDS;
  }

  return PASTE_ANONYMOUS_MAX_TTL_SECONDS;
}
