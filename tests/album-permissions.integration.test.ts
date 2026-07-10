import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import {
  updateAlbum,
  setAlbumCover,
  getAlbumInvites,
  createAlbumInvite,
  addAlbumMemberByEmail,
  removeAlbumMember,
  deleteAlbum,
  updateMemberPermissions,
  leaveAlbum,
  addPhotosToAlbum,
  removePhotoFromAlbum,
} from "@/lib/albums/library";

const tinyPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jx2kAAAAASUVORK5CYII=",
  "base64"
);

describe("album permission matrix", () => {
  const storageRoot = mkdtempSync(join(tmpdir(), "perm-"));
  let prisma: PrismaClient;

  beforeAll(() => {
    process.env.STORAGE_ROOT = storageRoot;
    prisma = new PrismaClient();
  });

  afterAll(async () => {
    await prisma.albumInvite.deleteMany();
    await prisma.photoShare.deleteMany();
    await prisma.albumPhoto.deleteMany();
    await prisma.favorite.deleteMany();
    await prisma.media.deleteMany();
    await prisma.albumMember.deleteMany();
    await prisma.album.deleteMany();
    await prisma.user.deleteMany();
    await prisma.$disconnect();
    rmSync(storageRoot, { recursive: true, force: true });
  });

  async function setupUsers() {
    const owner = await prisma.user.create({
      data: { email: `owner-${Date.now()}@test.local`, password_hash: "hash", nickname: "Owner" },
    });
    const member = await prisma.user.create({
      data: { email: `member-${Date.now()}@test.local`, password_hash: "hash", nickname: "Member" },
    });
    const uploader = await prisma.user.create({
      data: { email: `uploader-${Date.now()}@test.local`, password_hash: "hash", nickname: "Uploader" },
    });
    const deleter = await prisma.user.create({
      data: { email: `deleter-${Date.now()}@test.local`, password_hash: "hash", nickname: "Deleter" },
    });
    const outsider = await prisma.user.create({
      data: { email: `outsider-${Date.now()}@test.local`, password_hash: "hash", nickname: "Outsider" },
    });

    const album = await prisma.album.create({
      data: { creator_id: owner.id, name: "Test Album" },
    });

    // Create memberships
    await prisma.albumMember.createMany({
      data: [
        { album_id: album.id, user_id: owner.id, role: "owner" },
        { album_id: album.id, user_id: member.id, role: "member", can_upload: false, can_delete: false },
        { album_id: album.id, user_id: uploader.id, role: "member", can_upload: true, can_delete: false },
        { album_id: album.id, user_id: deleter.id, role: "member", can_upload: false, can_delete: true },
      ],
    });

    // Create a photo
    const photo = await prisma.media.create({
      data: {
        album_id: album.id,
        uploader_id: owner.id,
        original_name: "test.png",
        file_name: "test.png",
        mime_type: "image/png",
        media_type: "image",
        size: tinyPng.length,
        width: 1,
        height: 1,
        original_url: "/api/files/originals/test.png",
        preview_url: "/api/files/previews/test.png",
        thumbnail_url: "/api/files/thumbnails/test.png",
        storage_path: "test.png",
        processing_status: "normal",
      },
    });

    await prisma.albumPhoto.create({
      data: { album_id: album.id, photo_id: photo.id, added_by: owner.id },
    });

    return { album, photo, owner, member, uploader, deleter, outsider };
  }

  // ── View ──

  it("allows owner to view album", async () => {
    const { album, owner } = await setupUsers();
    await expect(
      (await import("@/lib/albums/library")).getAlbumDetail(prisma, { albumId: album.id, userId: owner.id })
    ).resolves.toBeDefined();
  });

  it("allows regular member to view album", async () => {
    const { album, member } = await setupUsers();
    await expect(
      (await import("@/lib/albums/library")).getAlbumDetail(prisma, { albumId: album.id, userId: member.id })
    ).resolves.toBeDefined();
  });

  it("rejects outsider from viewing album", async () => {
    const { album, outsider } = await setupUsers();
    await expect(
      (await import("@/lib/albums/library")).getAlbumDetail(prisma, { albumId: album.id, userId: outsider.id })
    ).rejects.toThrow(/不在这个相册/);
  });

  // ── Upload ──

  it("allows owner to upload/add photos", async () => {
    const { album, owner, photo } = await setupUsers();
    // Create a new album for upload test
    const album2 = await prisma.album.create({ data: { creator_id: owner.id, name: "Upload Test" } });
    await prisma.albumMember.create({ data: { album_id: album2.id, user_id: owner.id, role: "owner" } });
    const photo2 = await prisma.media.create({
      data: {
        album_id: album2.id, uploader_id: owner.id, original_name: "u.png", file_name: "u.png",
        mime_type: "image/png", media_type: "image", size: 1, width: 1, height: 1,
        original_url: "/f", preview_url: "/f", thumbnail_url: "/f", storage_path: "u.png",
        processing_status: "normal",
      },
    });
    await expect(
      addPhotosToAlbum(prisma, { albumId: album2.id, userId: owner.id, photoIds: [photo2.id] })
    ).resolves.toBeDefined();
  });

  it("allows can_upload member to upload", async () => {
    const { album, uploader } = await setupUsers();
    const album2 = await prisma.album.create({ data: { creator_id: uploader.id, name: "UL Test" } });
    await prisma.albumMember.create({ data: { album_id: album2.id, user_id: uploader.id, role: "owner" } });
    const photo2 = await prisma.media.create({
      data: {
        album_id: album2.id, uploader_id: uploader.id, original_name: "ul.png", file_name: "ul.png",
        mime_type: "image/png", media_type: "image", size: 1, width: 1, height: 1,
        original_url: "/f", preview_url: "/f", thumbnail_url: "/f", storage_path: "ul.png",
        processing_status: "normal",
      },
    });
    await expect(
      addPhotosToAlbum(prisma, { albumId: album2.id, userId: uploader.id, photoIds: [photo2.id] })
    ).resolves.toBeDefined();
  });

  it("rejects regular member from uploading", async () => {
    const { album, member, owner } = await setupUsers();
    const album2 = await prisma.album.create({ data: { creator_id: owner.id, name: "ULR Test" } });
    await prisma.albumMember.create({ data: { album_id: album2.id, user_id: owner.id, role: "owner" } });
    await prisma.albumMember.create({ data: { album_id: album2.id, user_id: member.id, role: "member", can_upload: false, can_delete: false } });
    const photo2 = await prisma.media.create({
      data: {
        album_id: album2.id, uploader_id: owner.id, original_name: "ulr.png", file_name: "ulr.png",
        mime_type: "image/png", media_type: "image", size: 1, width: 1, height: 1,
        original_url: "/f", preview_url: "/f", thumbnail_url: "/f", storage_path: "ulr.png",
        processing_status: "normal",
      },
    });
    await expect(
      addPhotosToAlbum(prisma, { albumId: album2.id, userId: member.id, photoIds: [photo2.id] })
    ).rejects.toThrow(/上传权限/);
  });

  // ── Delete ──

  it("allows can_delete member to remove photo", async () => {
    const { album, deleter, owner } = await setupUsers();
    const album2 = await prisma.album.create({ data: { creator_id: owner.id, name: "DEL Test" } });
    await prisma.albumMember.create({ data: { album_id: album2.id, user_id: owner.id, role: "owner" } });
    await prisma.albumMember.create({ data: { album_id: album2.id, user_id: deleter.id, role: "member", can_upload: false, can_delete: true } });
    const photo2 = await prisma.media.create({
      data: {
        album_id: album2.id, uploader_id: owner.id, original_name: "del.png", file_name: "del.png",
        mime_type: "image/png", media_type: "image", size: 1, width: 1, height: 1,
        original_url: "/f", preview_url: "/f", thumbnail_url: "/f", storage_path: "del.png",
        processing_status: "normal",
      },
    });
    await prisma.albumPhoto.create({ data: { album_id: album2.id, photo_id: photo2.id, added_by: owner.id } });
    await expect(
      removePhotoFromAlbum(prisma, { albumId: album2.id, userId: deleter.id, photoId: photo2.id })
    ).resolves.toBeDefined();
  });

  it("rejects regular member from deleting", async () => {
    const { album, member, owner } = await setupUsers();
    const album2 = await prisma.album.create({ data: { creator_id: owner.id, name: "DELR Test" } });
    await prisma.albumMember.create({ data: { album_id: album2.id, user_id: owner.id, role: "owner" } });
    await prisma.albumMember.create({ data: { album_id: album2.id, user_id: member.id, role: "member", can_upload: false, can_delete: false } });
    const photo2 = await prisma.media.create({
      data: {
        album_id: album2.id, uploader_id: owner.id, original_name: "delr.png", file_name: "delr.png",
        mime_type: "image/png", media_type: "image", size: 1, width: 1, height: 1,
        original_url: "/f", preview_url: "/f", thumbnail_url: "/f", storage_path: "delr.png",
        processing_status: "normal",
      },
    });
    await prisma.albumPhoto.create({ data: { album_id: album2.id, photo_id: photo2.id, added_by: owner.id } });
    await expect(
      removePhotoFromAlbum(prisma, { albumId: album2.id, userId: member.id, photoId: photo2.id })
    ).rejects.toThrow(/删除权限/);
  });

  // ── Edit Album ──

  it("allows owner to edit album", async () => {
    const { album, owner } = await setupUsers();
    await expect(
      updateAlbum(prisma, { albumId: album.id, userId: owner.id, name: "New Name" })
    ).resolves.toBeDefined();
  });

  it("rejects member from editing album", async () => {
    const { album, member } = await setupUsers();
    await expect(
      updateAlbum(prisma, { albumId: album.id, userId: member.id, name: "Hack" })
    ).rejects.toThrow();
  });

  // ── Set Cover ──

  it("allows owner to set cover", async () => {
    const { album, photo, owner } = await setupUsers();
    await expect(
      setAlbumCover(prisma, { albumId: album.id, userId: owner.id, photoId: photo.id })
    ).resolves.toBeDefined();
  });

  it("rejects member from setting cover", async () => {
    const { album, photo, member } = await setupUsers();
    await expect(
      setAlbumCover(prisma, { albumId: album.id, userId: member.id, photoId: photo.id })
    ).rejects.toThrow();
  });

  // ── Invite Management ──

  it("allows owner to create invites", async () => {
    const { album, owner } = await setupUsers();
    await expect(
      createAlbumInvite(prisma, { albumId: album.id, userId: owner.id, email: "invitee@test.local" })
    ).resolves.toBeDefined();
  });

  it("rejects member from creating invites", async () => {
    const { album, member } = await setupUsers();
    await expect(
      createAlbumInvite(prisma, { albumId: album.id, userId: member.id, email: "invitee2@test.local" })
    ).rejects.toThrow();
  });

  it("rejects member from viewing invites", async () => {
    const { album, member } = await setupUsers();
    await expect(
      getAlbumInvites(prisma, { albumId: album.id, userId: member.id })
    ).rejects.toThrow();
  });

  // ── Member Management ──

  it("rejects member from adding members directly", async () => {
    const { album, member } = await setupUsers();
    // Create another user to add
    const otherUser = await prisma.user.create({
      data: { email: `other-${Date.now()}@test.local`, password_hash: "hash", nickname: "Other" },
    });
    await expect(
      addAlbumMemberByEmail(prisma, { albumId: album.id, userId: member.id, email: otherUser.email })
    ).rejects.toThrow();
  });

  it("rejects member from removing members", async () => {
    const { album, member, uploader } = await setupUsers();
    await expect(
      removeAlbumMember(prisma, { albumId: album.id, userId: member.id, targetUserId: uploader.id })
    ).rejects.toThrow();
  });

  // ── Delete Album ──

  it("rejects member from deleting album", async () => {
    const { album, member } = await setupUsers();
    await expect(
      deleteAlbum(prisma, { albumId: album.id, userId: member.id })
    ).rejects.toThrow();
  });

  // ── Leave Album ──

  it("allows member to leave album", async () => {
    const { album, member } = await setupUsers();
    await expect(
      leaveAlbum(prisma, { albumId: album.id, userId: member.id })
    ).resolves.toBeDefined();
  });

  it("rejects owner from leaving album", async () => {
    const { album, owner } = await setupUsers();
    await expect(
      leaveAlbum(prisma, { albumId: album.id, userId: owner.id })
    ).rejects.toThrow(/不能退出/);
  });
});
