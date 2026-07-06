import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { join } from "node:path";
import { Readable } from "node:stream";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUserFromRequest } from "@/lib/auth/current-user";
import { getAppEnv } from "@/lib/config";
import { getStorageLayout } from "@/lib/storage/paths";

const VARIANT_DIRS = {
  originals: "originals",
  previews: "previews",
  thumbnails: "thumbnails"
} as const;

type Variant = keyof typeof VARIANT_DIRS;

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ variant: string; fileName: string }> }
) {
  const user = await getCurrentUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const { variant, fileName } = await context.params;
  if (!(variant in VARIANT_DIRS)) {
    return NextResponse.json({ error: "无效的文件类型" }, { status: 400 });
  }

  const photo = await prisma.photo.findFirst({
    where: {
      storage_path: fileName,
      OR: [
        {
          album: {
            members: {
              some: { user_id: user.id }
            }
          }
        },
        {
          albumPhotos: {
            some: {
              album: {
                members: {
                  some: { user_id: user.id }
                }
              }
            }
          }
        }
      ]
    },
    select: {
      mime_type: true,
      original_name: true,
      storage_path: true,
      album: {
        select: {
          id: true
        }
      }
    }
  });

  if (!photo) {
    return NextResponse.json({ error: "资源不存在" }, { status: 404 });
  }

  const layout = getStorageLayout(getAppEnv().STORAGE_ROOT);
  const filePath = join(layout[variant as Variant], fileName);

  try {
    await stat(filePath);
  } catch {
    return NextResponse.json({ error: "文件不存在" }, { status: 404 });
  }

  const stream = createReadStream(filePath);

  return new Response(Readable.toWeb(stream) as never, {
    headers: {
      "Content-Type": photo.mime_type
    }
  });
}
