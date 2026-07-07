export type CommandRunner = (command: string, args: string[], options?: { outputPath?: string }) => Promise<{ stdout: string }>;

import { spawn } from "node:child_process";

export async function runFfprobe(
  run: CommandRunner,
  inputPath: string
): Promise<{ width: number; height: number; duration: number; codec: string }> {
  const result = await run("ffprobe", [
    "-v", "quiet",
    "-print_format", "json",
    "-show_format",
    "-show_streams",
    inputPath,
  ]);

  const probe = JSON.parse(result.stdout);
  const videoStream = probe.streams?.find((s: { codec_type: string }) => s.codec_type === "video");

  return {
    width: videoStream?.width ?? 0,
    height: videoStream?.height ?? 0,
    duration: parseFloat(probe.format?.duration ?? "0"),
    codec: videoStream?.codec_name ?? "unknown",
  };
}

export async function generatePoster(
  run: CommandRunner,
  inputPath: string,
  outputPath: string
): Promise<void> {
  await run("ffmpeg", [
    "-y",
    "-i", inputPath,
    "-vframes", "1",
    "-q:v", "2",
    outputPath,
  ], { outputPath });
}

export async function generateThumbnail(
  run: CommandRunner,
  inputPath: string,
  outputPath: string
): Promise<void> {
  await run("ffmpeg", [
    "-y",
    "-i", inputPath,
    "-vf", "scale=512:-1",
    "-vframes", "1",
    "-q:v", "5",
    outputPath,
  ], { outputPath });
}

export async function transcodePlayback(
  run: CommandRunner,
  inputPath: string,
  outputPath: string,
  preset: string
): Promise<void> {
  const crf = preset === "fast" ? "28" : preset === "high" ? "20" : "23";

  await run("ffmpeg", [
    "-y",
    "-i", inputPath,
    "-c:v", "libx264",
    "-preset", preset === "fast" ? "ultrafast" : "medium",
    "-crf", crf,
    "-c:a", "aac",
    "-b:a", "128k",
    "-movflags", "+faststart",
    outputPath,
  ], { outputPath });
}

export function makeRealCommandRunner(): CommandRunner {
  return (command: string, args: string[], _options?: { outputPath?: string }) => {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
      let stdout = "";
      let stderr = "";

      child.stdout?.on("data", (chunk: Buffer) => {
        stdout += chunk.toString();
      });

      child.stderr?.on("data", (chunk: Buffer) => {
        stderr += chunk.toString();
      });

      child.on("close", (code) => {
        if (code === 0) {
          resolve({ stdout });
        } else {
          reject(new Error(`Command failed (${code}): ${stderr}`));
        }
      });

      child.on("error", reject);
    });
  };
}
