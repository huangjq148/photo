import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";

import {
  createAlbumInvite,
  createAlbum,
  acceptAlbumInvite,
} from "@/lib/albums/library";

describe("album invite lifecycle", () => {
  const storageRoot = mkdtempSync(join(tmpdir(), "invite-lifecycle-"));
  let prisma: PrismaClient;

  beforeAll(() => {
    process.env.STORAGE_ROOT = storageRoot;
    prisma = new PrismaClient();
  });

  afterAll(async () => {
    await prisma.albumInvite.deleteMany();
    await prisma.albumMember.deleteMany();
    await prisma.album.deleteMany();
    await prisma.user.deleteMany();
    await prisma.$disconnect();
    rmSync(storageRoot, { recursive: true, force: true });
  });

  async function setupOwner() {
    const owner = await prisma.user.create({
      data: {
        email: `invite-owner-${Date.now()}@test.local`,
        password_hash: "hash",
        nickname: "Owner",
      },
    });
    const album = await createAlbum(prisma, {
      userId: owner.id,
      name: "Invite Album",
    });
    return { owner, album };
  }

  it("creates invite for unregistered email", async () => {
    const { owner, album } = await setupOwner();
    const invite = await createAlbumInvite(prisma, {
      albumId: album.id,
      userId: owner.id,
      email: "newuser@test.local",
    });
    expect(invite.status).toBe("pending");
    expect(invite.token).toBeTruthy();
    // Expires in ~7 days
    const diff = invite.expired_at.getTime() - Date.now();
    expect(diff).toBeGreaterThan(6 * 24 * 60 * 60 * 1000);
  });

  it("creates invite for registered email", async () => {
    const { owner, album } = await setupOwner();
    const targetUser = await prisma.user.create({
      data: { email: `target-${Date.now()}@test.local`, password_hash: "hash", nickname: "Target" },
    });
    const invite = await createAlbumInvite(prisma, {
      albumId: album.id,
      userId: owner.id,
      email: targetUser.email,
    });
    expect(invite.status).toBe("pending");
  });

  it("rejects duplicate pending invite for same email", async () => {
    const { owner, album } = await setupOwner();
    await createAlbumInvite(prisma, {
      albumId: album.id,
      userId: owner.id,
      email: "dup@test.local",
    });
    await expect(
      createAlbumInvite(prisma, {
        albumId: album.id,
        userId: owner.id,
        email: "dup@test.local",
      })
    ).rejects.toThrow(/已存在|待处理/);
  });

  it("rejects empty email", async () => {
    const { owner, album } = await setupOwner();
    await expect(
      createAlbumInvite(prisma, { albumId: album.id, userId: owner.id, email: "" })
    ).rejects.toThrow();
    await expect(
      createAlbumInvite(prisma, { albumId: album.id, userId: owner.id, email: "   " })
    ).rejects.toThrow();
  });

  it("rejects invite for existing member", async () => {
    const { owner, album } = await setupOwner();
    const member = await prisma.user.create({
      data: { email: `member-${Date.now()}@test.local`, password_hash: "hash", nickname: "Member" },
    });
    await prisma.albumMember.create({
      data: { album_id: album.id, user_id: member.id, role: "member" },
    });
    await expect(
      createAlbumInvite(prisma, { albumId: album.id, userId: owner.id, email: member.email })
    ).rejects.toThrow(/成员/);
  });

  it("rejects expired invite acceptance", async () => {
    const { owner, album } = await setupOwner();
    const targetUser = await prisma.user.create({
      data: { email: `expiree-${Date.now()}@test.local`, password_hash: "hash", nickname: "Expiree" },
    });

    const invite = await createAlbumInvite(prisma, {
      albumId: album.id,
      userId: owner.id,
      email: targetUser.email,
    });

    // Manually expire it
    await prisma.albumInvite.update({
      where: { id: invite.id },
      data: { expired_at: new Date(Date.now() - 1000) },
    });

    await expect(
      acceptAlbumInvite(prisma, { token: invite.token, userId: targetUser.id })
    ).rejects.toThrow(/过期/);
  });

  it("rejects acceptance with wrong email", async () => {
    const { owner, album } = await setupOwner();
    const wrongUser = await prisma.user.create({
      data: { email: `wrong-${Date.now()}@test.local`, password_hash: "hash", nickname: "Wrong" },
    });

    const invite = await createAlbumInvite(prisma, {
      albumId: album.id,
      userId: owner.id,
      email: "right@test.local",
    });

    await expect(
      acceptAlbumInvite(prisma, { token: invite.token, userId: wrongUser.id })
    ).rejects.toThrow(/不一致/);
  });

  it("revokes pending invite", async () => {
    const { owner, album } = await setupOwner();

    const invite = await createAlbumInvite(prisma, {
      albumId: album.id,
      userId: owner.id,
      email: "revoke@test.local",
    });

    // Revoke
    await prisma.albumInvite.update({
      where: { id: invite.id },
      data: { status: "revoked" },
    });

    const targetUser = await prisma.user.create({
      data: { email: "revoke@test.local", password_hash: "hash", nickname: "Revoked" },
    });

    await expect(
      acceptAlbumInvite(prisma, { token: invite.token, userId: targetUser.id })
    ).rejects.toThrow(/失效/);
  });

  it("accepts invite and creates membership", async () => {
    const { owner, album } = await setupOwner();
    const targetUser = await prisma.user.create({
      data: { email: `acceptor-${Date.now()}@test.local`, password_hash: "hash", nickname: "Acceptor" },
    });

    const invite = await createAlbumInvite(prisma, {
      albumId: album.id,
      userId: owner.id,
      email: targetUser.email,
    });

    const result = await acceptAlbumInvite(prisma, {
      token: invite.token,
      userId: targetUser.id,
    });

    expect(result.albumId).toBe(album.id);

    // Check membership was created
    const membership = await prisma.albumMember.findUnique({
      where: {
        album_id_user_id: { album_id: album.id, user_id: targetUser.id },
      },
    });
    expect(membership).toBeDefined();
    expect(membership!.role).toBe("member");

    // Invite should be accepted
    const updated = await prisma.albumInvite.findUnique({ where: { id: invite.id } });
    expect(updated!.status).toBe("accepted");
  });

  it("duplicate acceptance is idempotent", async () => {
    const { owner, album } = await setupOwner();
    const targetUser = await prisma.user.create({
      data: { email: `dual-${Date.now()}@test.local`, password_hash: "hash", nickname: "Dual" },
    });

    const invite = await createAlbumInvite(prisma, {
      albumId: album.id,
      userId: owner.id,
      email: targetUser.email,
    });

    // First accept
    const r1 = await acceptAlbumInvite(prisma, { token: invite.token, userId: targetUser.id });
    expect(r1.albumId).toBe(album.id);

    // Second accept — should succeed without creating duplicate
    const r2 = await acceptAlbumInvite(prisma, { token: invite.token, userId: targetUser.id });
    expect(r2.albumId).toBe(album.id);

    // No duplicate membership
    const count = await prisma.albumMember.count({
      where: { album_id: album.id, user_id: targetUser.id },
    });
    expect(count).toBe(1);
  });

  it("resends invite creating new token", async () => {
    const { owner, album } = await setupOwner();
    const email = `resend-${Date.now()}@test.local`;

    const invite1 = await createAlbumInvite(prisma, {
      albumId: album.id,
      userId: owner.id,
      email,
    });

    // Mark old as expired (simulating resend)
    await prisma.albumInvite.update({
      where: { id: invite1.id },
      data: { status: "expired" },
    });

    // Create new one
    const invite2 = await createAlbumInvite(prisma, {
      albumId: album.id,
      userId: owner.id,
      email,
    });

    expect(invite2.token).not.toBe(invite1.token);
    expect(invite2.status).toBe("pending");
  });
});
