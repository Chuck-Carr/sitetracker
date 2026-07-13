import { z } from "zod"

const envSchema = z.object({
  // Node
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  // Database
  DATABASE_URL: z.string().min(1, { error: "DATABASE_URL is required" }),

  // Session
  SESSION_SECRET: z.string().min(32, { error: "SESSION_SECRET must be at least 32 characters" }),

  // App
  NEXT_PUBLIC_APP_URL: z.url({ error: "NEXT_PUBLIC_APP_URL must be a valid URL" }).default("http://localhost:3000"),

  // S3 / Object Storage
  S3_ENDPOINT: z.string().min(1, { error: "S3_ENDPOINT is required" }),
  S3_REGION: z.string().default("us-east-1"),
  S3_BUCKET: z.string().min(1, { error: "S3_BUCKET is required" }),
  S3_ACCESS_KEY_ID: z.string().min(1, { error: "S3_ACCESS_KEY_ID is required" }),
  S3_SECRET_ACCESS_KEY: z.string().min(1, { error: "S3_SECRET_ACCESS_KEY is required" }),
  S3_FORCE_PATH_STYLE: z
    .string()
    .optional()
    .transform((v) => v === "true"),
})

export type Env = z.infer<typeof envSchema>

function validateEnv(): Env {
  const result = envSchema.safeParse(process.env)

  if (!result.success) {
    const errors = result.error.issues
      .map((issue) => `  ${issue.path.join(".")}: ${issue.message}`)
      .join("\n")

    throw new Error(`\n\nEnvironment variable validation failed:\n${errors}\n`)
  }

  return result.data
}

export const env = validateEnv()
