import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(8787),
  APP_URL: z.string().url().default("http://localhost:3000"),
  DATABASE_URL: z.string().min(1),
  AGENT_AUTH_SECRET: z.string().min(16),
  AGENT_REGISTRATION_TOKEN: z
    .string()
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined)),
  AGENT_ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().default(3600),
  AGENT_ASSERTION_TTL_SECONDS: z.coerce.number().int().positive().default(86400),
});

export type AppEnv = z.infer<typeof envSchema>;

export function parseEnv(input: Record<string, unknown>): AppEnv {
  return envSchema.parse(input);
}
