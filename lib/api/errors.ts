import { NextResponse } from "next/server";

/**
 * Domain error with stable code for API mapping.
 */

export type ApiError = {
  error: string;
  code: string;
  issues?: Array<{
    path: string;
    message: string;
  }>;
};

export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status: number,
    public readonly issues?: ApiError["issues"]
  ) {
    super(message);
    this.name = "AppError";
  }
}

function normalizeIssues(issues: unknown): ApiError["issues"] | undefined {
  if (!Array.isArray(issues)) {
    return undefined;
  }

  const normalized = issues
    .map((issue) => {
      if (typeof issue !== "object" || issue === null) {
        return null;
      }

      const path = "path" in issue ? String((issue as { path?: unknown }).path ?? "") : "";
      const message =
        "message" in issue ? String((issue as { message?: unknown }).message ?? "") : "";

      if (!path || !message) {
        return null;
      }

      return { path, message };
    })
    .filter((issue): issue is NonNullable<typeof issue> => issue !== null);

  return normalized.length > 0 ? normalized : undefined;
}

export function toErrorResponse(error: unknown): ApiError & { status: number } {
  if (error instanceof AppError) {
    return {
      error: error.message,
      code: error.code,
      ...(error.issues ? { issues: error.issues } : {}),
      status: error.status,
    };
  }

  return {
    error: error instanceof Error ? error.message : "服务器内部错误",
    code: "INTERNAL_ERROR",
    status: 500,
  };
}

export function jsonError(
  code: string,
  message: string,
  status: number,
  issues?: ApiError["issues"]
) {
  const body: ApiError = {
    error: message,
    code,
    ...(issues ? { issues: normalizeIssues(issues) ?? issues } : {}),
  };

  return NextResponse.json(body, { status });
}
