import type { PrismaClient } from "@prisma/client";
import { AppError } from "@/lib/api/errors";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSessionToken, SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from "@/lib/auth/session";

type RegisterInput = {
  email: string;
  password: string;
  nickname: string;
};

type LoginInput = {
  email: string;
  password: string;
};

type AppEnv = {
  JWT_SECRET: string;
};

function invalidCredentialsError() {
  return new AppError("邮箱或密码错误", "INVALID_CREDENTIALS", 401);
}

export async function registerUser(
  prisma: PrismaClient,
  env: AppEnv,
  input: RegisterInput
) {
  const passwordHash = await hashPassword(input.password);

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: input.email,
        password_hash: passwordHash,
        nickname: input.nickname
      }
    });

    const album = await tx.album.create({
      data: {
        creator_id: user.id,
        name: "全部照片",
        description: "所有上传的照片",
        is_default: true,
        is_immutable: true
      }
    });

    await tx.albumMember.create({
      data: {
        album_id: album.id,
        user_id: user.id,
        role: "owner"
      }
    });

    return { user, album };
  });

  return {
    user: {
      id: result.user.id,
      email: result.user.email,
      nickname: result.user.nickname,
      avatarUrl: result.user.avatar_url,
      storageLimit: result.user.storage_limit.toString(),
      storageUsed: result.user.storage_used.toString()
    },
    album: {
      id: result.album.id,
      name: result.album.name
    },
    sessionToken: createSessionToken(result.user.id, result.user.session_version, env.JWT_SECRET),
    cookieName: SESSION_COOKIE_NAME
  };
}

export async function loginUser(
  prisma: PrismaClient,
  env: AppEnv,
  input: LoginInput
) {
  const user = await prisma.user.findUnique({
    where: { email: input.email }
  });

  if (!user) {
    throw invalidCredentialsError();
  }

  const ok = await verifyPassword(input.password, user.password_hash);

  if (!ok) {
    throw invalidCredentialsError();
  }

  console.log("[login] user.session_version:", user.session_version, "typeof:", typeof user.session_version);

  return {
    user: {
      id: user.id,
      email: user.email,
      nickname: user.nickname,
      avatarUrl: user.avatar_url,
      storageLimit: user.storage_limit.toString(),
      storageUsed: user.storage_used.toString()
    },
    sessionToken: createSessionToken(user.id, user.session_version, env.JWT_SECRET),
    cookieName: SESSION_COOKIE_NAME
  };
}

export async function changePassword(
  prisma: PrismaClient,
  env: AppEnv,
  input: { userId: string; currentPassword: string; newPassword: string }
) {
  const user = await prisma.user.findUnique({ where: { id: input.userId } });
  if (!user) throw new Error("用户不存在");

  // Verify current password
  const ok = await verifyPassword(input.currentPassword, user.password_hash);
  if (!ok) throw new Error("当前密码错误");

  // Check new password is different
  if (input.currentPassword === input.newPassword) {
    throw new Error("新密码不能与当前密码相同");
  }

  const newHash = await hashPassword(input.newPassword);

  // Increment session_version to invalidate all existing sessions
  const newVersion = user.session_version + 1;

  await prisma.user.update({
    where: { id: user.id },
    data: {
      password_hash: newHash,
      session_version: newVersion,
    },
  });

  // Issue new token with the new version
  return {
    sessionToken: createSessionToken(user.id, newVersion, env.JWT_SECRET),
    cookieName: SESSION_COOKIE_NAME,
    maxAge: SESSION_MAX_AGE_SECONDS,
  };
}

export async function logoutAllDevices(
  prisma: PrismaClient,
  env: AppEnv,
  userId: string
) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("用户不存在");

  // Increment session_version to invalidate all existing sessions
  await prisma.user.update({
    where: { id: user.id },
    data: { session_version: user.session_version + 1 },
  });
}
