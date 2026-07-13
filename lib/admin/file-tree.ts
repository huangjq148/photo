import { readdir, stat, lstat, unlink } from "node:fs/promises";
import { relative, resolve, sep, posix, basename } from "node:path";

export type AdminFileEntry = {
  relativePath: string;
  fileName: string;
  absolutePath: string;
  size: number;
  lastModifiedAt: Date;
};

function normalizeSeparators(value: string) {
  return value.split(sep).join(posix.sep);
}

export function resolveAdminDataRelativePath(dataRoot: string, candidate: string) {
  if (!candidate || candidate.trim() === "") {
    throw new Error("无效的文件路径");
  }
  if (candidate.startsWith("/") || candidate.startsWith("\\")) {
    throw new Error("无效的文件路径");
  }

  const normalizedCandidate = normalizeSeparators(candidate).replace(/^\.\/+/, "");
  const absolute = resolve(dataRoot, normalizedCandidate);
  const normalizedRoot = resolve(dataRoot);

  if (absolute !== normalizedRoot && !absolute.startsWith(`${normalizedRoot}${sep}`)) {
    throw new Error("文件路径越界");
  }

  const relativePath = relative(normalizedRoot, absolute);
  const normalizedRelative = normalizeSeparators(relativePath);

  if (!normalizedRelative || normalizedRelative.startsWith("..")) {
    throw new Error("文件路径越界");
  }

  return normalizedRelative;
}

export function resolveAdminDataFilePath(dataRoot: string, candidate: string) {
  const relativePath = resolveAdminDataRelativePath(dataRoot, candidate);
  return resolve(dataRoot, relativePath);
}

async function listDirectoryFiles(dataRoot: string, currentDir: string, output: AdminFileEntry[]) {
  const entries = await readdir(currentDir, { withFileTypes: true });

  for (const entry of entries) {
    const absolutePath = resolve(currentDir, entry.name);

    if (entry.isSymbolicLink()) {
      continue;
    }

    if (entry.isDirectory()) {
      await listDirectoryFiles(dataRoot, absolutePath, output);
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    const fileStat = await stat(absolutePath);
    const relativePath = normalizeSeparators(relative(resolve(dataRoot), absolutePath));
    if (!relativePath || relativePath.startsWith("..")) {
      continue;
    }

    output.push({
      relativePath,
      fileName: basename(absolutePath),
      absolutePath,
      size: fileStat.size,
      lastModifiedAt: fileStat.mtime,
    });
  }
}

export async function listAdminDataFiles(dataRoot: string) {
  const entries: AdminFileEntry[] = [];
  const root = resolve(dataRoot);
  await listDirectoryFiles(root, root, entries);
  entries.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
  return entries;
}

export async function deleteAdminDataFile(dataRoot: string, candidate: string) {
  const absolutePath = resolveAdminDataFilePath(dataRoot, candidate);
  const fileStat = await lstat(absolutePath);

  if (!fileStat.isFile() || fileStat.isSymbolicLink()) {
    throw new Error("只能删除普通文件");
  }

  await unlink(absolutePath);
}
