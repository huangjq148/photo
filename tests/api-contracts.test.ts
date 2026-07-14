import { describe, expect, it } from "vitest";
import { AppError, jsonError } from "@/lib/api/errors";
import { buildBatchResult } from "@/lib/api/batch-result";

describe("api contracts", () => {
  it("deduplicates batch inputs and maps failures to stable codes", () => {
    const forbidden = new AppError("没有权限", "FORBIDDEN", 403);

    expect(
      buildBatchResult(["a", "a", "b", "c"], new Map([["b", forbidden]]))
    ).toEqual({
      succeededIds: ["a", "c"],
      failed: [{ id: "b", code: "FORBIDDEN", message: "没有权限" }],
    });
  });

  it("creates a stable json error response", async () => {
    const response = jsonError("FORBIDDEN", "没有权限", 403, [
      { path: "photoIds[0]", message: "无权访问" },
    ]);

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "没有权限",
      code: "FORBIDDEN",
      issues: [{ path: "photoIds[0]", message: "无权访问" }],
    });
  });
});
