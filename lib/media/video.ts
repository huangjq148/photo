import { execFile } from "node:child_process";
import { readFile, writeFile, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

// ── MIME types ──

export const SUPPORTED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export const SUPPORTED_VIDEO_TYPES = new Set([
  "video/mp4",
  "video/webm",
  "video/quicktime",
]);

export const SUPPORTED_MIME_TYPES = new Set([
  "image/jpeg", "image/png", "image/webp",
  "video/mp4", "video/webm", "video/quicktime",
]);

export const MAX_IMAGE_SIZE = 20 * 1024 * 1024;  // 20MB
export const MAX_VIDEO_SIZE = 500 * 1024 * 1024; // 500MB

// ── Extension mapping ──

export function mimeToExtension(mimeType: string): string {
  switch (mimeType) {
    case "image/jpeg":
      return ".jpg";
    case "image/png":
      return ".png";
    case "image/webp":
      return ".webp";
    case "video/mp4":
      return ".mp4";
    case "video/webm":
      return ".webm";
    case "video/quicktime":
      return ".mov";
    default:
      return ".bin";
  }
}

// ── Video metadata ──

export type VideoMeta = {
  width: number;
  height: number;
  duration: number;
};

export async function getVideoMeta(filePath: string): Promise<VideoMeta> {
  const { stdout } = await execFileAsync("ffprobe", [
    "-v", "error",
    "-select_streams", "v:0",
    "-show_entries", "stream=width,height,duration",
    "-of", "csv=p=0",
    filePath,
  ]);

  const parts = stdout.trim().split(",");
  const width = parseInt(parts[0], 10);
  const height = parseInt(parts[1], 10);
  const duration = parseFloat(parts[2]);

  if (!width || !height || isNaN(duration)) {
    throw new Error("无法读取视频元数据：宽高或时长无效");
  }

  return { width, height, duration };
}

// ── Frame extraction ──

export async function extractVideoFrame(
  videoPath: string,
  outputPath: string,
  width: number,
): Promise<void> {
  const tmpPath = join(tmpdir(), `${randomUUID()}.jpg`);

  try {
    await execFileAsync("ffmpeg", [
      "-y",
      "-i", videoPath,
      "-vframes", "1",
      "-vf", `scale=${width}:-1`,
      "-q:v", "3",
      tmpPath,
    ]);

    // Read the temporary file and write to the final output path
    const data = await readFile(tmpPath);
    await writeFile(outputPath, data);
  } finally {
    await unlink(tmpPath).catch(() => {});
  }
}
