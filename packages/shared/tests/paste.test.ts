import { describe, expect, it } from "vite-plus/test";

import { PASTE_MAX_BYTES } from "../src/constants.ts";
import { PasteDomainError } from "../src/errors.ts";
import { parseExpiryInput } from "../src/expiry.ts";
import { createPasteInputSchema, validateCreatePasteInput } from "../src/paste.ts";
import { generateSlug, isReservedSlug } from "../src/slug.ts";

const anonymous = { kind: "anonymous" } as const;
const user = { kind: "user", userId: "user_1" } as const;

describe("expiry", () => {
  it("parses hours and days", () => {
    const now = new Date("2026-01-01T00:00:00.000Z");

    expect(parseExpiryInput("1h", anonymous, now).toISOString()).toBe("2026-01-01T01:00:00.000Z");
    expect(parseExpiryInput("7d", anonymous, now).toISOString()).toBe("2026-01-08T00:00:00.000Z");
  });

  it("rejects anonymous 30d", () => {
    expect(() => parseExpiryInput("30d", anonymous)).toThrow(PasteDomainError);
  });

  it("allows user 30d", () => {
    expect(() => parseExpiryInput("30d", user)).not.toThrow();
  });
});

describe("slug", () => {
  it("generates an 8-character slug", () => {
    expect(generateSlug()).toHaveLength(8);
  });

  it("recognizes reserved slugs", () => {
    expect(isReservedSlug("api")).toBe(true);
    expect(isReservedSlug("my-paste")).toBe(false);
  });
});

describe("paste validation", () => {
  it("rejects private anonymous pastes", () => {
    const input = createPasteInputSchema.parse({
      content: "hello",
      visibility: "private",
    });

    expect(() => validateCreatePasteInput(anonymous, input)).toThrow(PasteDomainError);
  });

  it("rejects oversized content", () => {
    const input = createPasteInputSchema.parse({
      content: "a".repeat(PASTE_MAX_BYTES + 1),
    });

    expect(() => validateCreatePasteInput(anonymous, input)).toThrow(PasteDomainError);
  });

  it("accepts a normal anonymous paste", () => {
    const input = createPasteInputSchema.parse({ content: "hello" });
    const validated = validateCreatePasteInput(anonymous, input);

    expect(validated.sizeBytes).toBe(5);
    expect(validated.visibility).toBe("unlisted");
    expect(validated.title).toBeNull();
  });
});
