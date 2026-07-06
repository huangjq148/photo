import { describe, expect, it, vi } from "vitest";
import { addAlbumMemberByEmail } from "@/lib/albums/library";

describe("addAlbumMemberByEmail", () => {
  it("adds an existing user to an album directly", async () => {
    const prisma = {
      albumMember: {
        findUnique: vi.fn()
          .mockResolvedValueOnce({ role: "owner" })
          .mockResolvedValueOnce(null),
        create: vi.fn().mockResolvedValue({ id: "member-1" }),
      },
      user: {
        findUnique: vi.fn().mockResolvedValue({ id: "user-2", email: "member@photo.test" }),
      },
      album: {
        update: vi.fn().mockResolvedValue({}),
      },
    };

    const result = await addAlbumMemberByEmail(prisma as never, {
      albumId: "album-1",
      userId: "owner-1",
      email: " MEMBER@PHOTO.TEST ",
    });

    expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { email: "member@photo.test" } });
    expect(prisma.albumMember.create).toHaveBeenCalledWith({
      data: {
        album_id: "album-1",
        user_id: "user-2",
        role: "member",
      },
    });
    expect(result.email).toBe("member@photo.test");
  });

  it("rejects unknown email addresses", async () => {
    const prisma = {
      albumMember: {
        findUnique: vi.fn().mockResolvedValue({ role: "owner" }),
      },
      user: {
        findUnique: vi.fn().mockResolvedValue(null),
      },
    };

    await expect(
      addAlbumMemberByEmail(prisma as never, {
        albumId: "album-1",
        userId: "owner-1",
        email: "missing@photo.test",
      }),
    ).rejects.toThrow("用户不存在，请先注册");
  });
});
