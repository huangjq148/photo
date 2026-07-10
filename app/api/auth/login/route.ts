import { prisma } from "@/lib/db";
import { getAppEnv } from "@/lib/config";
import { createLoginHandler } from "@/lib/auth/login-handler";
import { loginUser } from "@/lib/users/auth";
import { getRateLimitStore } from "@/lib/auth/rate-limit";

export const POST = createLoginHandler({
  login: (input) => loginUser(prisma, getAppEnv(), input),
  rateLimitStore: getRateLimitStore(),
  logger: console,
});
