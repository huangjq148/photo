/**
 * Domain error with stable code for API mapping.
 */

export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status: number,
    public readonly issues?: unknown[]
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function toErrorResponse(error: unknown) {
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
