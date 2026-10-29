export type Principal =
  | { kind: "anonymous" }
  | { kind: "user"; userId: string }
  | { kind: "agent"; agentId: string; claimed: boolean };

export function isAnonymousLike(principal: Principal): boolean {
  return principal.kind === "anonymous" || (principal.kind === "agent" && !principal.claimed);
}
