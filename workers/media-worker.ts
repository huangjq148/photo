import { loadEnv } from "@/lib/env";
import { prisma } from "@/lib/db";
import { claimPendingVideoJob } from "@/lib/media/worker/claim";
import { processVideoMedia } from "@/lib/media/worker/process-video";
import { makeRealCommandRunner } from "@/lib/media/worker/ffmpeg";

const once = process.argv.includes("--once");

async function main() {
  const env = loadEnv();
  const runner = makeRealCommandRunner();

  console.log("[media-worker] Starting...");
  console.log(`[media-worker] Poll interval: ${env.MEDIA_WORKER_POLL_INTERVAL_MS}ms`);
  console.log(`[media-worker] Concurrency: ${env.MEDIA_WORKER_CONCURRENCY}`);
  console.log(`[media-worker] Transcode preset: ${env.MEDIA_TRANSCODE_PRESET}`);
  console.log(`[media-worker] Storage root: ${env.STORAGE_ROOT}`);

  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      const job = await claimPendingVideoJob(prisma);

      if (job) {
        console.log(`[media-worker] Processing: ${job.id} (${job.original_name})`);

        try {
          await processVideoMedia(prisma, {
            storageRoot: env.STORAGE_ROOT,
            mediaId: job.id,
            run: runner,
            transcodePreset: env.MEDIA_TRANSCODE_PRESET,
          });
          console.log(`[media-worker] Completed: ${job.id}`);
        } catch (error) {
          console.error(`[media-worker] Failed: ${job.id}`, error);
        }
      }

      if (once) break;
    } catch (error) {
      console.error("[media-worker] Loop error:", error);
      if (once) break;
    }

    if (!once) {
      await new Promise((resolve) => setTimeout(resolve, env.MEDIA_WORKER_POLL_INTERVAL_MS));
    }
  }

  console.log("[media-worker] Done.");
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error("[media-worker] Fatal:", error);
  process.exit(1);
});
