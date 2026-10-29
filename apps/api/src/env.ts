import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(8787),
});

export type AppEnv = z.infer<typeof envSchema>;

export function parseEnv(input: Record<string, unknown>): AppEnv {
  return envSchema.parse(input);
}
