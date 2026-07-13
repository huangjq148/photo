import { mkdtempSync, mkdirSync, rmSync, writeFileSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  listAdminDataFiles,
  resolveAdminDataRelativePath,
} from "@/lib/admin/file-tree";

describe("admin file tree", () => {
  it("rejects paths outside the data root", () => {
    expect(() => resolveAdminDataRelativePath("/data/root", "../escape.txt")).toThrow();
    expect(() => resolveAdminDataRelativePath("/data/root", "/absolute.txt")).toThrow();
  });

  it("lists regular files recursively and skips symlinks", async () => {
    const root = mkdtempSync(join(tmpdir(), "admin-file-tree-"));
    try {
      mkdirSync(join(root, "storage", "originals"), { recursive: true });
      mkdirSync(join(root, "storage", "previews"), { recursive: true });
      writeFileSync(join(root, "storage", "originals", "a.txt"), "a");
      writeFileSync(join(root, "storage", "previews", "b.txt"), "b");

      const outside = mkdtempSync(join(tmpdir(), "admin-file-tree-outside-"));
      writeFileSync(join(outside, "outside.txt"), "outside");
      symlinkSync(join(outside, "outside.txt"), join(root, "storage", "previews", "link.txt"));

      const files = await listAdminDataFiles(root);

      expect(files.map((file) => file.relativePath)).toEqual([
        "storage/originals/a.txt",
        "storage/previews/b.txt",
      ]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
