import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  STORAGE_ROOT: z.string().min(1).default("./data/storage"),
  ADMIN_PASSWORD: z.string().min(1).optional(),
});

export type AppEnv = z.infer<typeof envSchema>;
export type LoadedAppEnv = Omit<AppEnv, "ADMIN_PASSWORD"> & {
  ADMIN_PASSWORD: string;
};

export function loadEnv(source: NodeJS.ProcessEnv = process.env): LoadedAppEnv {
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

  const adminPassword = parsed.data.ADMIN_PASSWORD ?? (source.NODE_ENV === "production" ? undefined : "qwerty123");

  if (source.NODE_ENV === "production" && !adminPassword) {
    throw new Error("Invalid environment configuration: ADMIN_PASSWORD: ADMIN_PASSWORD is required in production");
  }

  return {
    ...parsed.data,
    ADMIN_PASSWORD: adminPassword ?? "qwerty123",
  } as LoadedAppEnv;
}
