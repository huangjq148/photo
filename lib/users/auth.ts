import type { PrismaClient } from "@prisma/client";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth/session";

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
    throw new Error("邮箱或密码错误");
  }

  const ok = await verifyPassword(input.password, user.password_hash);

  if (!ok) {
    throw new Error("邮箱或密码错误");
  }

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
