import { readdir, stat } from "node:fs/promises";
import type { PrismaClient } from "@prisma/client";
import { getStorageLayout } from "@/lib/storage/paths";

export type StorageAuditVariant = "original" | "preview" | "thumbnail";

export type StorageAuditMissingFileIssue = {
  type: "missing_file";
  mediaId: string;
  mediaType: "image" | "video";
  variant: StorageAuditVariant;
  fileName: string;
  size: string;
  processingStatus: "pending" | "processing" | "normal" | "failed";
};

export type StorageAuditOrphanFileIssue = {
  type: "orphan_file";
  variant: StorageAuditVariant;
  fileName: string;
  size: number;
};

export type StorageAuditStorageUsedMismatchIssue = {
  type: "storage_used_mismatch";
  userId: string;
  expected: string;
  actual: string;
  delta: string;
};

export type StorageAuditStuckProcessingIssue = {
  type: "stuck_processing";
  mediaId: string;
  uploadedAt: string;
  processingStatus: "pending" | "processing";
  ageHours: number;
};

export type StorageAuditIssue =
  | StorageAuditMissingFileIssue
  | StorageAuditOrphanFileIssue
  | StorageAuditStorageUsedMismatchIssue
  | StorageAuditStuckProcessingIssue;

export type StorageAuditReport = {
  status: "healthy" | "degraded" | "unhealthy";
  checkedAt: string;
  storageRoot: string;
  counts: {
    media: number;
    users: number;
    missingFiles: number;
    orphanFiles: number;
    storageUsedMismatches: number;
    stuckProcessing: number;
  };
  issues: StorageAuditIssue[];
};

export type StorageAuditOptions = {
  prisma: PrismaClient;
  storageRoot: string;
  now?: Date;
  staleProcessingAfterHours?: number;
};

type AuditedMedia = {
  id: string;
  media_type: "image" | "video";
  storage_path: string;
  size: bigint;
  uploader_id: string;
  processing_status: "pending" | "processing" | "normal" | "failed";
  uploaded_at: Date;
};

type AuditedUser = {
  id: string;
  storage_used: bigint;
};

type ExpectedFiles = {
  original: string;
  preview: string;
  thumbnail: string;
};

async function listFiles(directory: string) {
  const entries = await readdir(directory, { withFileTypes: true }).catch(() => []);
  const files = await Promise.all(
    entries
      .filter((entry) => entry.isFile())
      .map(async (entry) => {
        const fullPath = `${directory}/${entry.name}`;
        const fileStat = await stat(fullPath);
        return {
          fileName: entry.name,
          size: fileStat.size,
        };
      })
  );

  return files;
}

function getExpectedFiles(media: Pick<AuditedMedia, "media_type" | "storage_path">): ExpectedFiles {
  if (media.media_type !== "video") {
    return {
      original: media.storage_path,
      preview: media.storage_path,
      thumbnail: media.storage_path,
    };
  }

  const extIndex = media.storage_path.lastIndexOf(".");
  const base = extIndex > 0 ? media.storage_path.slice(0, extIndex) : media.storage_path;

  return {
    original: media.storage_path,
    preview: `${base}_preview.jpg`,
    thumbnail: `${base}_thumb.jpg`,
  };
}

function hoursSince(start: Date, end: Date) {
  return (end.getTime() - start.getTime()) / (1000 * 60 * 60);
}

function toBytes(value: bigint | number) {
  return typeof value === "bigint" ? value.toString() : String(value);
}

export async function runStorageConsistencyAudit({
  prisma,
  storageRoot,
  now = new Date(),
  staleProcessingAfterHours = 6
}: StorageAuditOptions): Promise<StorageAuditReport> {
  const layout = getStorageLayout(storageRoot);

  const [medias, users, originals, previews, thumbnails] = await Promise.all([
    prisma.media.findMany({
      select: {
        id: true,
        media_type: true,
        storage_path: true,
        size: true,
        uploader_id: true,
        processing_status: true,
        uploaded_at: true,
      },
    }) as Promise<AuditedMedia[]>,
    prisma.user.findMany({
      select: {
        id: true,
        storage_used: true,
      },
    }) as Promise<AuditedUser[]>,
    listFiles(layout.originals),
    listFiles(layout.previews),
    listFiles(layout.thumbnails),
  ]);

  const issues: StorageAuditIssue[] = [];

  const originalFiles = new Map(originals.map((file) => [file.fileName, file]));
  const previewFiles = new Map(previews.map((file) => [file.fileName, file]));
  const thumbnailFiles = new Map(thumbnails.map((file) => [file.fileName, file]));

  const expectedOriginals = new Set<string>();
  const expectedPreviews = new Set<string>();
  const expectedThumbnails = new Set<string>();

  for (const media of medias) {
    const expected = getExpectedFiles(media);
    expectedOriginals.add(expected.original);
    expectedPreviews.add(expected.preview);
    expectedThumbnails.add(expected.thumbnail);

    const variants: Array<[StorageAuditVariant, Map<string, { size: number }>, string]> = [
      ["original", originalFiles, expected.original],
      ["preview", previewFiles, expected.preview],
      ["thumbnail", thumbnailFiles, expected.thumbnail],
    ];

    for (const [variant, files, fileName] of variants) {
      if (!files.has(fileName)) {
        issues.push({
          type: "missing_file",
          mediaId: media.id,
          mediaType: media.media_type,
          variant,
          fileName,
          size: toBytes(media.size),
          processingStatus: media.processing_status,
        });
      }
    }

    if (media.processing_status === "pending" || media.processing_status === "processing") {
      const ageHours = hoursSince(media.uploaded_at, now);
      if (ageHours >= staleProcessingAfterHours) {
        issues.push({
          type: "stuck_processing",
          mediaId: media.id,
          uploadedAt: media.uploaded_at.toISOString(),
          processingStatus: media.processing_status,
          ageHours: Number(ageHours.toFixed(2)),
        });
      }
    }
  }

  for (const file of originals) {
    if (!expectedOriginals.has(file.fileName)) {
      issues.push({
        type: "orphan_file",
        variant: "original",
        fileName: file.fileName,
        size: file.size,
      });
    }
  }

  for (const file of previews) {
    if (!expectedPreviews.has(file.fileName)) {
      issues.push({
        type: "orphan_file",
        variant: "preview",
        fileName: file.fileName,
        size: file.size,
      });
    }
  }

  for (const file of thumbnails) {
    if (!expectedThumbnails.has(file.fileName)) {
      issues.push({
        type: "orphan_file",
        variant: "thumbnail",
        fileName: file.fileName,
        size: file.size,
      });
    }
  }

  const expectedUsageByUser = new Map<string, bigint>();
  for (const media of medias) {
    expectedUsageByUser.set(
      media.uploader_id,
      (expectedUsageByUser.get(media.uploader_id) ?? 0n) + media.size
    );
  }

  for (const user of users) {
    const expected = expectedUsageByUser.get(user.id) ?? 0n;
    if (expected !== user.storage_used) {
      issues.push({
        type: "storage_used_mismatch",
        userId: user.id,
        expected: expected.toString(),
        actual: user.storage_used.toString(),
        delta: (user.storage_used - expected).toString(),
      });
    }
  }

  const status =
    issues.length === 0
      ? "healthy"
      : issues.some((issue) => issue.type === "missing_file" || issue.type === "storage_used_mismatch")
        ? "unhealthy"
        : "degraded";

  return {
    status,
    checkedAt: now.toISOString(),
    storageRoot,
    counts: {
      media: medias.length,
      users: users.length,
      missingFiles: issues.filter((issue) => issue.type === "missing_file").length,
      orphanFiles: issues.filter((issue) => issue.type === "orphan_file").length,
      storageUsedMismatches: issues.filter((issue) => issue.type === "storage_used_mismatch").length,
      stuckProcessing: issues.filter((issue) => issue.type === "stuck_processing").length,
    },
    issues,
  };
}

export function formatStorageConsistencyReport(report: StorageAuditReport): string[] {
  const lines = [
    `Storage audit: ${report.status}`,
    `Checked at: ${report.checkedAt}`,
    `Media records: ${report.counts.media}`,
    `Users: ${report.counts.users}`,
    `Missing files: ${report.counts.missingFiles}`,
    `Orphan files: ${report.counts.orphanFiles}`,
    `Storage mismatches: ${report.counts.storageUsedMismatches}`,
    `Stuck processing: ${report.counts.stuckProcessing}`,
  ];

  for (const issue of report.issues) {
    switch (issue.type) {
      case "missing_file":
        lines.push(
          `- missing ${issue.variant}: media=${issue.mediaId} type=${issue.mediaType} file=${issue.fileName} size=${issue.size} status=${issue.processingStatus}`
        );
        break;
      case "orphan_file":
        lines.push(`- orphan ${issue.variant}: file=${issue.fileName} size=${issue.size}`);
        break;
      case "storage_used_mismatch":
        lines.push(
          `- storage mismatch: user=${issue.userId} expected=${issue.expected} actual=${issue.actual} delta=${issue.delta}`
        );
        break;
      case "stuck_processing":
        lines.push(
          `- stuck processing: media=${issue.mediaId} status=${issue.processingStatus} ageHours=${issue.ageHours} uploadedAt=${issue.uploadedAt}`
        );
        break;
    }
  }

  return lines;
}
