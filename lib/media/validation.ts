import type { MediaFileLike, MediaType } from "@/lib/media/types";

const IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const VIDEO_MIME_TYPES = new Set(["video/mp4", "video/quicktime", "video/webm"]);

export function detectMediaType(mimeType: string): MediaType {
  if (IMAGE_MIME_TYPES.has(mimeType)) return "image";
  if (VIDEO_MIME_TYPES.has(mimeType)) return "video";
  throw new Error("不支持的媒体格式");
}

export function validateMediaFile(
  file: MediaFileLike,
  limits: { maxImageMb: number; maxVideoMb: number }
) {
  const mediaType = detectMediaType(file.type);
  const maxMb = mediaType === "image" ? limits.maxImageMb : limits.maxVideoMb;
  const label = mediaType === "image" ? "图片" : "视频";

  if (file.size > maxMb * 1024 * 1024) {
    throw new Error(`${label}大小超过${maxMb}MB限制`);
  }

  return mediaType;
}
