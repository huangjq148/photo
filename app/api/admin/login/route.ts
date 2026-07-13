import { getAppEnv } from "@/lib/config";
import { getAdminRateLimitStore } from "@/lib/auth/admin-rate-limit";
import { createAdminLoginHandler } from "@/lib/admin/login-handler";

export const POST = createAdminLoginHandler({
  adminPassword: getAppEnv().ADMIN_PASSWORD,
  secret: getAppEnv().JWT_SECRET,
  rateLimitStore: getAdminRateLimitStore(),
  logger: console,
});
