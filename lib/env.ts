import { z } from "zod";

const numberFromEnv = (defaultValue: number) =>
  z.preprocess((value) => {
    if (value === undefined || value === "") return defaultValue;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : value;
  }, z.number().int().positive());

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  STORAGE_ROOT: z.string().min(1).default("./data/storage"),
  MAX_IMAGE_UPLOAD_MB: numberFromEnv(20),
  MAX_VIDEO_UPLOAD_MB: numberFromEnv(512),
  MEDIA_WORKER_POLL_INTERVAL_MS: numberFromEnv(5000),
  MEDIA_WORKER_CONCURRENCY: numberFromEnv(1),
  MEDIA_TRANSCODE_PRESET: z.string().min(1).default("medium"),
});

export type AppEnv = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): AppEnv {
  const parsed = envSchema.safeParse(source);

  if (!parsed.success) {
    const message = parsed.error.issues
      .map((issue) => {
        const field = issue.path.join(".");
        return field ? `${field}: ${issue.message}` : issue.message;
      })
      .join(", ");
    throw new Error(`Invalid environment configuration: ${message}`);
  }

  return parsed.data;
}
